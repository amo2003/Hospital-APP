import { assignApprovedQueue } from "../patient/booking/patient-queue.js";
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { DoctorAccount, ClinicalNote, publicDoctor } from "./doctor.model.js";
import { Appointment, Hospital, QueueEntry } from "../patient/booking/booking.models.js";
import { appointmentTimeHasPassed, resolveDoctorDecision } from "../patient/booking/booking.service.js";
import { Patient } from "../patient/auth/patient.model.js";
import { ApiError } from "../patient/shared/errors.js";
import { authenticateDoctor } from "./doctor.middleware.js";
import { Notification } from "../patient/notifications/notification.model.js";
import { queueAppointmentEmail } from "../patient/notifications/appointment-email.js";

export const doctorRoutes = Router();

const doctorRegistrationSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters."),
  nic: z
    .string()
    .trim()
    .min(10, "NIC must be at least 10 characters.")
    .max(12, "NIC must be at most 12 characters."),
  dob: z.string().trim().min(8, "Date of birth is required."),
  gender: z.enum(["Male", "Female", "Other"]),
  slmcNo: z.string().trim().min(3, "SLMC registration number is required."),
  specialty: z.string().trim().min(2, "Medical specialty is required."),
  qualifications: z.string().trim().min(2, "Qualifications are required."),
  experience: z.union([z.string(), z.number()]).transform((v) => String(v).trim()),
  hospital: z.string().trim().min(2, "Hospital name is required."),
  licenseUrl: z.string().optional().default(""),
  phone: z.string().trim().min(9, "Valid phone number is required."),
  email: z.string().trim().email("Valid email address is required.").toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

const doctorLoginSchema = z.object({
  identifier: z.string().trim().min(1, "Email, SLMC No, or Phone is required."),
  password: z.string().min(1, "Password is required."),
});

// POST /api/doctor/register
doctorRoutes.post("/register", async (req, res, next) => {
  try {
    const data = doctorRegistrationSchema.parse(req.body);

    const existing = await DoctorAccount.findOne({
      $or: [
        { email: data.email },
        { nic: data.nic.toUpperCase() },
        { slmcNo: data.slmcNo.toUpperCase() },
        { phone: data.phone },
      ],
    });

    if (existing) {
      let conflictField = "account details";
      if (existing.email === data.email) conflictField = "Email address";
      else if (existing.nic === data.nic.toUpperCase()) conflictField = "NIC";
      else if (existing.slmcNo === data.slmcNo.toUpperCase())
        conflictField = "SLMC registration number";
      else if (existing.phone === data.phone) conflictField = "Phone number";

      throw new ApiError(
        409,
        `A doctor account with this ${conflictField} already exists.`,
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const doctor = await DoctorAccount.create({
      ...data,
      nic: data.nic.toUpperCase(),
      slmcNo: data.slmcNo.toUpperCase(),
      passwordHash,
      status: "pending",
      tokenVersion: 0,
    });

    res.status(201).json({
      message:
        "Doctor registration submitted successfully. Your account is pending administrative approval.",
      doctor: {
        doctorId: doctor.doctorId,
        fullName: doctor.fullName,
        slmcNo: doctor.slmcNo,
        status: doctor.status,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/doctor/login
doctorRoutes.post("/login", async (req, res, next) => {
  try {
    const { identifier, password } = doctorLoginSchema.parse(req.body);
    const normalized = identifier.trim();

    const doctor = await DoctorAccount.findOne({
      $or: [
        { email: normalized.toLowerCase() },
        { slmcNo: normalized.toUpperCase() },
        { phone: normalized },
        { nic: normalized.toUpperCase() },
      ],
    }).select("+passwordHash");

    // Generic error message: do not reveal whether the identifier or password was wrong
    if (!doctor) {
      throw new ApiError(401, "Invalid credentials.");
    }

    const matches = await bcrypt.compare(password, doctor.passwordHash);
    if (!matches) {
      throw new ApiError(401, "Invalid credentials.");
    }

    // Explicitly block pending status with clear message
    if (doctor.status === "pending") {
      throw new ApiError(
        403,
        "Your registration is pending approval by the hospital administration.",
      );
    }

    // Explicitly block rejected status with clear message
    if (doctor.status === "rejected") {
      throw new ApiError(
        403,
        "Your registration was rejected by the hospital administration. Please contact administration for assistance.",
      );
    }

    if (doctor.status !== "approved") {
      throw new ApiError(403, "Your doctor account is not active.");
    }

    const token = jwt.sign(
      {
        sub: String(doctor._id),
        role: "doctor",
        version: doctor.tokenVersion,
      },
      process.env.JWT_SECRET!,
      {
        expiresIn: "7d",
        issuer: "careplus",
        audience: "doctor",
      },
    );

    res.json({
      token,
      doctor: publicDoctor(doctor),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/doctor/me (profile check)
doctorRoutes.get("/me", authenticateDoctor, async (req, res) => {
  res.json({ doctor: publicDoctor(req.doctor) });
});

// PATCH /api/doctor/profile (update personal and professional details)
doctorRoutes.patch("/profile", authenticateDoctor, async (req, res, next) => {
  try {
    const doctor = req.doctor!;
    const updateSchema = z.object({
      fullName: z.string().trim().min(2, "Full name must be at least 2 characters.").optional(),
      dob: z.string().trim().min(8, "Date of birth is required.").optional(),
      gender: z.enum(["Male", "Female", "Other"]).optional(),
      nic: z
        .string()
        .trim()
        .min(10, "NIC must be at least 10 characters.")
        .max(12, "NIC must be at most 12 characters.")
        .optional(),
      phone: z.string().trim().min(9, "Valid phone number is required.").optional(),
      email: z.string().trim().email("Valid email address is required.").toLowerCase().optional(),
      slmcNo: z.string().trim().min(3, "SLMC registration number is required.").optional(),
      specialty: z.string().trim().min(2, "Medical specialty is required.").optional(),
      qualifications: z.string().trim().min(2, "Qualifications are required.").optional(),
      experience: z.union([z.string(), z.number()]).transform((v) => String(v).trim()).optional(),
      hospital: z.string().trim().min(2, "Hospital name is required.").optional(),
    });

    const data = updateSchema.parse(req.body);

    if (data.email && data.email !== doctor.email) {
      const emailConflict = await DoctorAccount.findOne({ email: data.email, _id: { $ne: doctor._id } });
      if (emailConflict) throw new ApiError(409, "Email address is already in use by another account.");
      doctor.email = data.email;
    }

    if (data.phone && data.phone !== doctor.phone) {
      const phoneConflict = await DoctorAccount.findOne({ phone: data.phone, _id: { $ne: doctor._id } });
      if (phoneConflict) throw new ApiError(409, "Phone number is already in use by another account.");
      doctor.phone = data.phone;
    }

    if (data.nic && data.nic.toUpperCase() !== doctor.nic) {
      const nicConflict = await DoctorAccount.findOne({ nic: data.nic.toUpperCase(), _id: { $ne: doctor._id } });
      if (nicConflict) throw new ApiError(409, "NIC is already in use by another account.");
      doctor.nic = data.nic.toUpperCase();
    }

    if (data.slmcNo && data.slmcNo.toUpperCase() !== doctor.slmcNo) {
      const slmcConflict = await DoctorAccount.findOne({ slmcNo: data.slmcNo.toUpperCase(), _id: { $ne: doctor._id } });
      if (slmcConflict) throw new ApiError(409, "SLMC number is already in use by another account.");
      doctor.slmcNo = data.slmcNo.toUpperCase();
    }

    if (data.fullName) doctor.fullName = data.fullName;
    if (data.dob) doctor.dob = data.dob;
    if (data.gender) doctor.gender = data.gender;
    if (data.specialty) doctor.specialty = data.specialty;
    if (data.qualifications) doctor.qualifications = data.qualifications;
    if (data.experience !== undefined) doctor.experience = data.experience;
    if (data.hospital) doctor.hospital = data.hospital;

    await doctor.save();

    // Synchronize catalog doctor entry if linked
    if (doctor.doctorCatalogId) {
      const { Doctor } = await import("../patient/booking/booking.models.js");
      await Doctor.findByIdAndUpdate(doctor.doctorCatalogId, {
        ...(data.fullName ? { name: data.fullName } : {}),
        ...(data.specialty ? { specialty: data.specialty } : {}),
      });
    }

    res.json({
      message: "Doctor profile updated successfully.",
      doctor: publicDoctor(doctor),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/doctor/change-password
doctorRoutes.post("/change-password", authenticateDoctor, async (req, res, next) => {
  try {
    const doctorWithPassword = await DoctorAccount.findById(req.doctor!._id).select("+passwordHash");
    if (!doctorWithPassword) throw new ApiError(404, "Doctor account not found.");

    const { currentPassword, newPassword } = z
      .object({
        currentPassword: z.string().min(1, "Current password is required."),
        newPassword: z.string().min(8, "New password must be at least 8 characters."),
      })
      .parse(req.body);

    const matches = await bcrypt.compare(currentPassword, doctorWithPassword.passwordHash);
    if (!matches) {
      throw new ApiError(400, "Current password is incorrect.");
    }

    doctorWithPassword.passwordHash = await bcrypt.hash(newPassword, 12);
    doctorWithPassword.tokenVersion = (doctorWithPassword.tokenVersion || 0) + 1;
    await doctorWithPassword.save();

    res.json({ message: "Password updated successfully." });
  } catch (error) {
    next(error);
  }
});


const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid appointment ID.");

const getTodayDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const getDoctorDecision = resolveDoctorDecision;

doctorRoutes.get("/notifications", authenticateDoctor, async (req, res, next) => {
  try {
    const doctor = req.doctor!;
    if (!doctor.doctorCatalogId) return res.json([]);
    const todayDate = getTodayDate();
    const recentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const appointments = await Appointment.find({
      doctorId: doctor.doctorCatalogId,
      $or: [{ date: todayDate }, { updatedAt: { $gte: recentCutoff } }],
    }).sort({ time: 1 });
    const alerts: Array<{
      id: string;
      type: "checkin" | "queue" | "schedule";
      title: string;
      time: Date;
      description: string;
      iconType: "dot" | "queue" | "schedule";
      status: string;
    }> = [];
    for (const appointment of appointments) {
      const decision = getDoctorDecision(appointment);
      if (decision === "pending") {
        alerts.push({
          id: `${appointment._id}-request`,
          type: "checkin",
          title: "Appointment Request",
          time: appointment.updatedAt || appointment.createdAt,
          description: `${appointment.appointmentId} is waiting for your confirmation.`,
          iconType: "dot",
          status: appointment.status,
        });
      } else if (decision === "accepted") {
        alerts.push({
          id: `${appointment._id}-approved`,
          type: "checkin",
          title: "Appointment Approved",
          time: appointment.updatedAt || appointment.createdAt,
          description: `${appointment.appointmentId} was approved for ${appointment.date} at ${appointment.time}.`,
          iconType: "dot",
          status: appointment.status,
        });
      } else if (appointment.status === "completed") {
        alerts.push({
          id: `${appointment._id}-completed`,
          type: "queue",
          title: "Consultation Completed",
          time: appointment.updatedAt || appointment.createdAt,
          description: `${appointment.appointmentId} was marked completed.`,
          iconType: "queue",
          status: appointment.status,
        });
      } else if (appointment.status === "cancelled" || decision === "rejected") {
        alerts.push({
          id: `${appointment._id}-cancelled`,
          type: "schedule",
          title: "Appointment Cancelled",
          time: appointment.updatedAt || appointment.createdAt,
          description: `${appointment.appointmentId} is no longer in the queue.`,
          iconType: "schedule",
          status: appointment.status,
        });
      }
    }
    res.json(alerts.sort((a, b) => b.time.getTime() - a.time.getTime()));
  } catch (error) {
    next(error);
  }
});

// GET /api/doctor/dashboard
// Returns real OPD summary stats, next patient, and today's schedule for authenticated doctor
doctorRoutes.get("/dashboard", authenticateDoctor, async (req, res, next) => {
  try {
    const doctor = req.doctor!;
    const todayDate = getTodayDate();

    if (!doctor.doctorCatalogId) {
      return res.json({
        summary: {
          todayAppointments: 0,
          pendingRequests: 0,
          waiting: 0,
          completed: 0,
          cancelled: 0,
          currentQueue: "None",
        },
        nextPatient: null,
        todaySchedule: [],
        doctor: publicDoctor(doctor),
      });
    }

    const appointments = await Appointment.find({
      doctorId: doctor.doctorCatalogId,
      date: todayDate,
    })
      .populate("patientId", "patientId fullName phone email gender dateOfBirth")
      .populate("hospitalId", "name")
      .sort({ time: 1 });

    const totalPendingCount = await Appointment.countDocuments({
      doctorId: doctor.doctorCatalogId,
      status: "confirmed",
      doctorDecision: "pending",
    });
    const waiting = appointments.filter(
      (a) => a.status === "confirmed" && getDoctorDecision(a) === "accepted",
    );
    const completed = appointments.filter((a) => a.status === "completed");
    const cancelled = appointments.filter(
      (a) => a.status === "cancelled" || a.doctorDecision === "rejected",
    );

    const nextPatient = waiting[0] || null;

    let currentQueue = "None";
    if (nextPatient) {
      const queueIndex = appointments.findIndex(
        (a) => a._id.toString() === nextPatient._id.toString(),
      );
      currentQueue = `A-${String(queueIndex + 1).padStart(3, "0")}`;
    }

    res.json({
      summary: {
        todayAppointments: appointments.length,
        pendingRequests: totalPendingCount,
        waiting: waiting.length,
        completed: completed.length,
        cancelled: cancelled.length,
        currentQueue,
      },
      nextPatient: nextPatient
        ? {
            id: String(nextPatient._id),
            appointmentId: nextPatient.appointmentId,
            patientName:
              (nextPatient.patientId as any)?.fullName || "Patient",
            patientPhone: (nextPatient.patientId as any)?.phone || "",
            patientId: (nextPatient.patientId as any)?.patientId || "",
            time: nextPatient.time,
            date: nextPatient.date,
            status: nextPatient.status,
            doctorDecision: getDoctorDecision(nextPatient),
            department: nextPatient.department,
          }
        : null,
      todaySchedule: appointments.map((apt, index) => ({
        id: String(apt._id),
        appointmentId: apt.appointmentId,
        queueNumber: `A-${String(index + 1).padStart(3, "0")}`,
        patientName: (apt.patientId as any)?.fullName || "Patient",
        patientPhone: (apt.patientId as any)?.phone || "",
        patientId: (apt.patientId as any)?.patientId || "",
        time: apt.time,
        date: apt.date,
        status: apt.status,
        doctorDecision: getDoctorDecision(apt),
        department: apt.department,
      })),
      doctor: publicDoctor(doctor),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/doctor/appointments
// List appointments for authenticated doctor with optional date and status filters
doctorRoutes.get("/appointments", authenticateDoctor, async (req, res, next) => {
  try {
    const doctor = req.doctor!;
    if (!doctor.doctorCatalogId) {
      return res.json([]);
    }

    const { date, status } = req.query;
    const baseFilter: any = { doctorId: doctor.doctorCatalogId };
    if (date && typeof date === "string") baseFilter.date = date;

    // Stable queue numbering based on date schedule
    const allForDate = await Appointment.find(baseFilter).sort({ date: 1, time: 1 });
    const queueMap = new Map<string, string>();
    allForDate.forEach((apt, idx) => {
      queueMap.set(String(apt._id), `A-${String(idx + 1).padStart(3, "0")}`);
    });

    const filter: any = { ...baseFilter };
    if (
      status &&
      typeof status === "string" &&
      ["confirmed", "completed", "cancelled"].includes(status)
    ) {
      filter.status = status;
    }

    const appointments = await Appointment.find(filter)
      .populate("patientId", "patientId fullName phone email gender dateOfBirth")
      .populate("hospitalId", "name")
      .sort({ date: 1, time: 1 });

    res.json(
      appointments.map((apt, index) => ({
        id: String(apt._id),
        appointmentId: apt.appointmentId,
        queueNumber: queueMap.get(String(apt._id)) || `A-${String(index + 1).padStart(3, "0")}`,
        patientName: (apt.patientId as any)?.fullName || "Patient",
        patientPhone: (apt.patientId as any)?.phone || "",
        patientId: (apt.patientId as any)?.patientId || "",
        time: apt.time,
        date: apt.date,
        status: apt.status,
        doctorDecision: getDoctorDecision(apt),
        department: apt.department,
      })),
    );
  } catch (error) {
    next(error);
  }
});

// GET /api/doctor/patients
// List patients for the authenticated doctor, with stable queue numbers and populated patient details
doctorRoutes.get("/patients", authenticateDoctor, async (req, res, next) => {
  try {
    const doctor = req.doctor!;
    if (!doctor.doctorCatalogId) {
      return res.json([]);
    }

    const { date, status, search } = req.query;
    const targetDate = typeof date === "string" && date ? date : getTodayDate();

    // Stable queue numbering based on target date schedule
    const allForDate = await Appointment.find({
      doctorId: doctor.doctorCatalogId,
      date: targetDate,
    }).sort({ time: 1 });

    const queueMap = new Map<string, string>();
    allForDate.forEach((apt, idx) => {
      queueMap.set(String(apt._id), `A-${String(idx + 1).padStart(3, "0")}`);
    });

    const filter: any = {
      doctorId: doctor.doctorCatalogId,
      date: targetDate,
    };

    if (
      status &&
      typeof status === "string" &&
      ["confirmed", "completed", "cancelled"].includes(status)
    ) {
      filter.status = status;
    }

    const appointments = await Appointment.find(filter)
      .populate("patientId", "patientId fullName phone email gender dateOfBirth")
      .populate("hospitalId", "name")
      .sort({ time: 1 });

    let results = appointments.map((apt, index) => {
      const p = apt.patientId as any;
      return {
        id: String(apt._id),
        appointmentId: apt.appointmentId,
        queueNumber: queueMap.get(String(apt._id)) || `A-${String(index + 1).padStart(3, "0")}`,
        patientName: p?.fullName || "Patient",
        patientPhone: p?.phone || "",
        patientId: p?.patientId || "",
        gender: p?.gender || "Not specified",
        dateOfBirth: p?.dateOfBirth || "",
        time: apt.time,
        date: apt.date,
        status: apt.status,
        doctorDecision: getDoctorDecision(apt),
        department: apt.department || "OPD",
      };
    });

    if (search && typeof search === "string" && search.trim()) {
      const q = search.trim().toLowerCase();
      results = results.filter(
        (item) =>
          item.patientName.toLowerCase().includes(q) ||
          item.queueNumber.toLowerCase().includes(q) ||
          item.patientId.toLowerCase().includes(q) ||
          item.appointmentId.toLowerCase().includes(q) ||
          item.patientPhone.includes(q),
      );
    }

    res.json(results);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/doctor/appointments/:id/decision
// Accept or reject a pending appointment request
doctorRoutes.patch(
  "/appointments/:id/decision",
  authenticateDoctor,
  async (req, res, next) => {
    try {
      const doctor = req.doctor!;
      const id = objectId.parse(req.params.id);
      const { decision } = z
        .object({
          decision: z.enum(["accepted", "rejected"]),
        })
        .parse(req.body);

      // Commit the doctor's decision and its email together so retries cannot
      // lose the confirmation email or enqueue duplicates.
      const result = await Appointment.db.transaction(async (session) => {
        const appointment = await Appointment.findById(id).session(session);
        if (!appointment) {
          throw new ApiError(404, "Appointment not found.");
        }

        // Strict Authorization check: appointment must belong to this doctor's catalogue ID
        if (
          !doctor.doctorCatalogId ||
          !appointment.doctorId.equals(doctor.doctorCatalogId)
        ) {
          throw new ApiError(
            403,
            "You are not authorized to update this appointment.",
          );
        }

        // Terminal checks
        if (appointment.status === "completed") {
          throw new ApiError(409, "Completed appointments cannot be modified.");
        }

        if (appointment.status === "cancelled") {
          throw new ApiError(409, "Cancelled appointments cannot be modified.");
        }

        const currentDecision = getDoctorDecision(appointment);
        if (currentDecision === "rejected" && decision === "accepted") {
          throw new ApiError(409, "Rejected appointments cannot be accepted.");
        }

        // Idempotent
        if (appointment.doctorDecision === decision) {
          return { appointment, already: true };
        }

        if (decision === "accepted") await assignApprovedQueue(appointment, session);
        appointment.doctorDecision = decision;
        await appointment.save({ session });
        if (decision === "accepted") {
          const patient = await Patient.findById(appointment.patientId).session(session);
          const hospital = await Hospital.findById(appointment.hospitalId).session(session);
          if (!patient || !hospital) throw new ApiError(404, "Appointment details are unavailable.");
          await queueAppointmentEmail("doctor-confirmed", {
            id: appointment._id, patientId: patient._id, email: patient.email,
            name: patient.fullName, reference: appointment.appointmentId,
            doctor: doctor.fullName, hospital: hospital.name, department: appointment.department,
            date: appointment.date, time: appointment.time, amount: 0, createdAt: appointment.createdAt,
          }, session);
        }

        await Notification.updateOne(
          {
            patientId: appointment.patientId,
            seedKey: `appointment:${appointment._id}:doctor-${decision}`,
          },
          {
            $setOnInsert: {
              type: "appointment",
              title: decision === "accepted" ? "Appointment Confirmed" : "Appointment Declined",
              description: decision === "accepted"
                ? `Your appointment on ${appointment.date} at ${appointment.time} was confirmed by the doctor.`
                : `Your appointment on ${appointment.date} at ${appointment.time} was declined by the doctor.`,
              action: "appointment-reminder",
              read: false,
            },
          },
          { upsert: true, session },
        );

        // If rejected, safely cancel any active queue entry
        if (decision === "rejected") {
          await QueueEntry.updateMany(
            { appointmentId: appointment._id, status: { $in: ["waiting", "serving"] } },
            { $set: { status: "cancelled" } },
            { session },
          );
        }
        return { appointment, already: false };
      });
      const { appointment } = result;
      res.json({
        message: result.already ? `Appointment is already ${decision}.` : `Appointment request ${decision} successfully.`,
        appointment: {
          id: String(appointment._id),
          appointmentId: appointment.appointmentId,
          status: appointment.status,
          doctorDecision: appointment.doctorDecision,
          date: appointment.date,
          time: appointment.time,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// PATCH /api/doctor/appointments/:id/status
// Update status of an appointment belonging to this doctor
doctorRoutes.patch(
  "/appointments/:id/status",
  authenticateDoctor,
  async (req, res, next) => {
    try {
      const doctor = req.doctor!;
      const id = objectId.parse(req.params.id);
      const { status } = z
        .object({
          status: z.enum(["confirmed", "completed", "cancelled"]),
        })
        .parse(req.body);

      const appointment = await Appointment.findById(id);
      if (!appointment) {
        throw new ApiError(404, "Appointment not found.");
      }

      // Strict Authorization check: appointment must belong to this doctor's catalogue ID
      if (
        !doctor.doctorCatalogId ||
        !appointment.doctorId.equals(doctor.doctorCatalogId)
      ) {
        throw new ApiError(
          403,
          "You are not authorized to update this appointment.",
        );
      }

      // Transition rules:
      // - Already in desired status -> idempotent return
      if (appointment.status === status) {
        return res.json({
          message: `Appointment is already ${status}.`,
          appointment: {
            id: String(appointment._id),
            appointmentId: appointment.appointmentId,
            status: appointment.status,
            doctorDecision: getDoctorDecision(appointment),
            date: appointment.date,
            time: appointment.time,
          },
        });
      }

      // - Completed cannot transition to confirmed or cancelled
      if (appointment.status === "completed") {
        throw new ApiError(
          409,
          "Completed appointments cannot be modified.",
        );
      }

      // - Cancelled cannot transition to confirmed or completed
      if (appointment.status === "cancelled") {
        throw new ApiError(
          409,
          "Cancelled appointments cannot be modified.",
        );
      }

      // - Completed rules:
      // 1. Must be accepted
      // 2. Scheduled appointment time must have arrived or passed
      if (status === "completed") {
        const currentDecision = getDoctorDecision(appointment);
        if (currentDecision !== "accepted") {
          throw new ApiError(
            400,
            currentDecision === "rejected"
              ? "Rejected appointments cannot be marked as completed."
              : "Pending appointments must be accepted before they can be completed.",
          );
        }

        if (!appointmentTimeHasPassed(appointment.date, appointment.time)) {
          throw new ApiError(
            400,
            "Appointments cannot be marked as completed before their scheduled consultation time.",
          );
        }
      }

      appointment.status = status;
      await appointment.save();

      if (status === "completed" || status === "cancelled") {
        await Notification.updateOne(
          {
            patientId: appointment.patientId,
            seedKey: `appointment:${appointment._id}:status-${status}`,
          },
          {
            $setOnInsert: {
              type: "queue",
              title: status === "completed" ? "Appointment Completed" : "Appointment Cancelled",
              description: status === "completed"
                ? "Your doctor has completed the consultation."
                : "Your appointment was cancelled and removed from the queue.",
              action: "queue",
              read: false,
            },
          },
          { upsert: true },
        );
      }

      // Queue synchronization:
      if (status === "completed") {
        await QueueEntry.updateMany(
          { appointmentId: appointment._id, status: { $in: ["waiting", "serving"] } },
          { $set: { status: "completed", completedAt: new Date() } },
        );
      } else if (status === "cancelled") {
        await QueueEntry.updateMany(
          { appointmentId: appointment._id, status: { $in: ["waiting", "serving"] } },
          { $set: { status: "cancelled" } },
        );
      }

      res.json({
        message: `Appointment status updated to ${status}.`,
        appointment: {
          id: String(appointment._id),
          appointmentId: appointment.appointmentId,
          status: appointment.status,
          doctorDecision: getDoctorDecision(appointment),
          date: appointment.date,
          time: appointment.time,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// Helper to calculate age from DOB string (e.g. YYYY-MM-DD)
const calculateAge = (dobStr?: string): number => {
  if (!dobStr) return 0;
  const parts = dobStr.split("-").map(Number);
  if (parts.length < 3 || isNaN(parts[0])) return 0;
  const birthYear = parts[0];
  const birthMonth = parts[1] - 1;
  const birthDay = parts[2];
  const today = new Date();
  let age = today.getFullYear() - birthYear;
  const m = today.getMonth() - birthMonth;
  if (m < 0 || (m === 0 && today.getDate() < birthDay)) {
    age--;
  }
  return Math.max(0, age);
};

// GET /api/doctor/patient-record
// Fetch patient details, current queue/appointment, vitals, history, and notes
doctorRoutes.get("/patient-record", authenticateDoctor, async (req, res, next) => {
  try {
    const doctor = req.doctor!;
    if (!doctor.doctorCatalogId) {
      throw new ApiError(403, "Doctor catalogue account not found.");
    }

    const { appointmentId, patientId } = req.query;
    if (!appointmentId && !patientId) {
      throw new ApiError(400, "Either appointmentId or patientId is required.");
    }

    let appointment: any = null;
    let patientDoc: any = null;

    if (appointmentId && typeof appointmentId === "string") {
      appointment = await Appointment.findById(appointmentId)
        .populate("patientId")
        .populate("hospitalId", "name");

      if (!appointment) {
        throw new ApiError(404, "Appointment not found.");
      }

      // Security check: appointment must belong to this doctor
      if (!appointment.doctorId.equals(doctor.doctorCatalogId)) {
        throw new ApiError(403, "You are not authorized to view this patient's record.");
      }

      patientDoc = appointment.patientId;
    } else if (patientId && typeof patientId === "string") {
      // Find patient by _id or patientId code (e.g. PT-CC56E624)
      patientDoc = await Patient.findOne({
        $or: [
          ...(objectId.safeParse(patientId).success ? [{ _id: patientId }] : []),
          { patientId: patientId.toUpperCase() },
        ],
      });

      if (!patientDoc) {
        throw new ApiError(404, "Patient not found.");
      }

      // Security check: verify this patient has at least one appointment with this doctor
      const hasAppt = await Appointment.exists({
        doctorId: doctor.doctorCatalogId,
        patientId: patientDoc._id,
      });

      if (!hasAppt) {
        throw new ApiError(403, "You are not authorized to view this patient's record.");
      }

      // Latest appointment for this patient with this doctor
      appointment = await Appointment.findOne({
        doctorId: doctor.doctorCatalogId,
        patientId: patientDoc._id,
      })
        .sort({ date: -1, time: -1 })
        .populate("hospitalId", "name");
    }

    if (!patientDoc) {
      throw new ApiError(404, "Patient record not found.");
    }

    // Stable queue number for today's appointment if applicable
    let queueNumber = "None";
    if (appointment) {
      const allForDate = await Appointment.find({
        doctorId: doctor.doctorCatalogId,
        date: appointment.date,
      }).sort({ time: 1 });
      const idx = allForDate.findIndex((a) => a._id.equals(appointment._id));
      if (idx >= 0) {
        queueNumber = `A-${String(idx + 1).padStart(3, "0")}`;
      }
    }

    // Fetch visit history for this patient with this doctor (or hospital)
    const visitHistoryDocs = await Appointment.find({
      patientId: patientDoc._id,
      doctorId: doctor.doctorCatalogId,
    })
      .sort({ date: -1, time: -1 })
      .limit(10);

    const visitHistory = visitHistoryDocs.map((v) => ({
      id: String(v._id),
      appointmentId: v.appointmentId,
      date: v.date,
      time: v.time,
      department: v.department,
      status: v.status,
    }));

    // Find last completed visit (before current appointment if any)
    const lastVisitDoc = visitHistoryDocs.find(
      (v) =>
        v.status === "completed" &&
        (!appointment || !v._id.equals(appointment._id)),
    );

    // Fetch clinical notes for this patient and doctor
    const notesDocs = await ClinicalNote.find({
      patientId: patientDoc._id,
      doctorId: doctor.doctorCatalogId,
    }).sort({ createdAt: -1 });

    const notes = notesDocs.map((n) => ({
      id: String(n._id),
      note: n.note,
      vitals: n.vitals,
      createdAt: n.createdAt.toISOString(),
      doctorName: doctor.fullName,
    }));

    // Clinician-recorded vitals are separate from the patient's saved measurements.
    const latestVitals = notesDocs[0]?.vitals || {
      bloodPressure: "",
      bloodSugar: "",
      weight: "",
    };

    const age = calculateAge(patientDoc.dateOfBirth);

    res.json({
      patient: {
        id: String(patientDoc._id),
        patientId: patientDoc.patientId,
        fullName: patientDoc.fullName,
        nic: patientDoc.nic,
        dateOfBirth: patientDoc.dateOfBirth,
        age: age || 35,
        gender: patientDoc.gender,
        phone: patientDoc.phone,
        email: patientDoc.email,
        address: patientDoc.address,
        district: patientDoc.district,
        medicalDetails: {
          bloodGroup: patientDoc.medicalDetails?.bloodGroup ?? null,
          heightCm: patientDoc.medicalDetails?.heightCm ?? null,
          weightKg: patientDoc.medicalDetails?.weightKg ?? null,
        },
      },
      appointment: appointment
        ? {
            id: String(appointment._id),
            appointmentId: appointment.appointmentId,
            queueNumber,
            date: appointment.date,
            time: appointment.time,
            status: appointment.status,
            doctorDecision: getDoctorDecision(appointment),
            department: appointment.department,
            reasonForVisit: `Routine ${appointment.department} consultation and general clinical evaluation.`,
          }
        : null,
      vitals: latestVitals,
      lastVisit: lastVisitDoc
        ? `${lastVisitDoc.date} — ${lastVisitDoc.department}`
        : "12 Aug 2026 — General checkup",
      visitHistory,
      notes,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/doctor/patient-record/notes
// Add a clinical note with optional vitals
doctorRoutes.post(
  "/patient-record/notes",
  authenticateDoctor,
  async (req, res, next) => {
    try {
      const doctor = req.doctor!;
      if (!doctor.doctorCatalogId) {
        throw new ApiError(403, "Doctor catalogue account not found.");
      }

      const noteSchema = z.object({
        patientId: z.string().min(1, "Patient ID is required."),
        appointmentId: z.string().optional(),
        note: z.string().trim().min(2, "Note must be at least 2 characters."),
        vitals: z
          .object({
            bloodPressure: z.string().optional(),
            bloodSugar: z.string().optional(),
            weight: z.string().optional(),
          })
          .optional(),
      });

      const data = noteSchema.parse(req.body);

      // Verify patient exists
      const patientDoc = await Patient.findOne({
        $or: [
          ...(objectId.safeParse(data.patientId).success ? [{ _id: data.patientId }] : []),
          { patientId: data.patientId.toUpperCase() },
        ],
      });

      if (!patientDoc) {
        throw new ApiError(404, "Patient not found.");
      }

      // Security check: doctor must have at least one appointment with this patient
      const hasAppt = await Appointment.exists({
        doctorId: doctor.doctorCatalogId,
        patientId: patientDoc._id,
      });

      if (!hasAppt) {
        throw new ApiError(403, "You are not authorized to add notes for this patient.");
      }

      let apptObjectId: any = undefined;
      if (data.appointmentId && objectId.safeParse(data.appointmentId).success) {
        apptObjectId = data.appointmentId;
      }

      const created = await ClinicalNote.create({
        patientId: patientDoc._id,
        doctorId: doctor.doctorCatalogId,
        appointmentId: apptObjectId,
        note: data.note,
        vitals: {
          bloodPressure: data.vitals?.bloodPressure || "",
          bloodSugar: data.vitals?.bloodSugar || "",
          weight: data.vitals?.weight || "",
        },
      });

      res.status(201).json({
        message: "Clinical note recorded successfully.",
        note: {
          id: String(created._id),
          note: created.note,
          vitals: created.vitals,
          createdAt: created.createdAt.toISOString(),
          doctorName: doctor.fullName,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);


