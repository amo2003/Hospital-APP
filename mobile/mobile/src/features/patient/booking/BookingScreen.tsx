import { Text } from "../i18n/LanguageProvider";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { router } from "expo-router";
import { api, messageOf } from "../shared/api";
import type { Appointment, Doctor, Hospital, Slot } from "../shared/types";
import {
  BottomTabs,
  Button,
  C,
  CheckHero,
  ErrorMessage,
  Field,
  Header,
  Leaves,
  Notice,
  Row,
  Screen,
  Select,
  Steps,
  s,
} from "../shared/ui";
import { Icon } from "../shared/icons";
import PaymentStep, { paymentLabel, type UploadedSlip } from "../payments/PaymentStep";
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const timeLabel = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};
export const dateLabel = (date: string) =>
  new Date(`${date}T12:00:00+05:30`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
export const isUpcoming = (appointment: Appointment) =>
  appointment.status === "confirmed" &&
  appointment.doctorDecision !== "rejected" &&
  new Date(`${appointment.date}T${appointment.time}:00+05:30`).getTime() >
    Date.now();
export default function BookingScreen() {
  const [step, setStep] = useState(0);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [hospitalId, setHospital] = useState("");
  const [department, setDepartment] = useState("");
  const [doctorId, setDoctor] = useState("");
  const [date, setDate] = useState(today());
  const [time, setTime] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [confirmed, setConfirmed] = useState<Appointment | null>(null);
  const [retry, setRetry] = useState(0);
  const [slip, setSlip] = useState<UploadedSlip | null>(null);
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    if (step !== 0) return;
    let active = true;
    api
      .hospitals()
      .then((data) => {
        if (active) setHospitals(data);
      })
      .catch((e) => {
        if (active) setError(messageOf(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retry, step]);
  useEffect(() => {
    if (step !== 1 || !hospitalId || !department) return;
    let active = true;
    api
      .doctors(hospitalId, department)
      .then((data) => {
        if (active) setDoctors(data);
      })
      .catch((e) => {
        if (active) setError(messageOf(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [step, hospitalId, department, retry]);
  useEffect(() => {
    if (step !== 2 || !doctorId) return;
    let active = true;
    api
      .slots(doctorId, date)
      .then((data) => {
        if (active) setSlots(data);
      })
      .catch((e) => {
        if (active) setError(messageOf(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [step, doctorId, date, retry]);
  const hospital = hospitals.find((h) => h._id === hospitalId);
  const doctor = doctors.find((d) => d._id === doctorId);
  function changeStep(value: number) {
    if (booking || uploading) return;
    setError("");
    setLoading(value < 3);
    if (value === 2) {
      setTime("");
      setSlots([]);
    }
    setStep(value);
  }
  async function next() {
    setError("");
    if (step === 0 && (!hospitalId || !department)) {
      setError("Choose a hospital and specialty.");
      return;
    }
    if (step === 1 && !doctorId) {
      setError("Select a doctor to continue.");
      return;
    }
    if (step === 2 && !time) {
      setError("Select an available time slot.");
      return;
    }
    if (step === 3 && (doctor?.feeLkr || 0) > 0 && (!slip || slip.doctorId !== doctorId)) {
      setError("Upload your payment slip before confirming the appointment.");
      return;
    }
    if (step < 4) {
      changeStep(step + 1);
      return;
    }
    setBooking(true);
    try {
      setConfirmed(
        await api.book({ hospitalId, department, doctorId, date, time, expectedFeeLkr: doctor?.feeLkr || 0,
          ...((doctor?.feeLkr || 0) > 0 && slip?.doctorId === doctorId ? { slipId: slip.id } : {}) }),
      );
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBooking(false);
    }
  }
  if (confirmed)
    return (
      <Screen footer={<BottomTabs active="appointments" />}>
        <Leaves small />
        <CheckHero
          title="Appointment booked"
          subtitle="Your appointment has been successfully booked"
        />
        <AppointmentCard appointment={confirmed} />
        <View style={{ marginTop: 12 }}>
          <Notice>Appointment details will be emailed to you. Paid bookings receive another email after payment approval.</Notice>
          <Notice>You can cancel within 30 minutes of booking, before your appointment starts.</Notice>
          <Notice>
            Please arrive at least 15 minutes early and bring a valid ID and
            your medical records if available.
          </Notice>
        </View>
        <View style={{ gap: 10, marginTop: 28 }}>
          <Button
            title="View Appointment"
            arrow
            onPress={() =>
              router.replace(
                confirmed.date === today()
                  ? "/patient/appointments"
                  : "/patient/appointment-history",
              )
            }
          />
          <Button
            title="Back to Home"
            outline
            onPress={() => router.replace("/patient/home")}
          />
        </View>
      </Screen>
    );
  return (
    <Screen
      decoration={step === 0}
      footer={
        <>
          {step >= 2 && (
            <View
              style={[
                s.row,
                {
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  backgroundColor: C.bg,
                  borderTopWidth: 1,
                  borderColor: C.line,
                },
              ]}
            >
              <Button
                title="Back"
                outline
                disabled={booking || uploading}
                onPress={() => changeStep(step - 1)}
                style={{ flex: 1 }}
              />
              <Button
                title={step === 4 ? "Confirm Appointment" : "Next"}
                arrow
                loading={booking}
                disabled={
                  loading || uploading ||
                  (step === 2 && (!time || !slots.some((slot) => slot.time === time && slot.available))) ||
                  (step === 3 && (doctor?.feeLkr || 0) > 0 && (!slip || slip.doctorId !== doctorId))
                }
                onPress={next}
                style={{ flex: 1.5 }}
              />
            </View>
          )}
          <BottomTabs active="appointments" />
        </>
      }
    >
      <Header
        title={
          [
            "Book Appointment",
            "Select Doctor",
            "Select Date & Time",
            "Payment",
            "Review Appointment",
          ][step]
        }
        back={() => {
          if (step) {
            changeStep(step - 1);
          } else router.replace("/patient/home");
        }}
      />
      <Steps
        current={step}
        labels={["Hospital", "Doctor", "Date & Time", "Payment", "Confirm"]}
      />
      {step === 0 ? (
        <>
          <Select
            label="Hospital / Clinic"
            icon="home"
            placeholder="Select hospital or clinic"
            value={hospitalId}
            options={hospitals.map((h) => ({ value: h._id, label: h.name }))}
            onChange={(v) => {
              setHospital(v);
              setDepartment("");
              setDoctor("");
            }}
          />
          <Select
            label="Specialty / Department"
            placeholder="Select specialty or department"
            value={department}
            options={(hospital?.departments || []).map((d) => ({
              value: d,
              label: d,
            }))}
            onChange={(v) => {
              setDepartment(v);
              setDoctor("");
            }}
          />
          <Notice>
            Choose a hospital and specialty to see available doctors and time
            slots.
          </Notice>
          {!loading && !error && !hospitals.length && (
            <Text style={[s.body, { marginTop: 15 }]}>
              No hospitals are accepting bookings yet.
            </Text>
          )}
        </>
      ) : step === 1 ? (
        <>
          <Field
            label="Search doctors"
            icon="search"
            placeholder="Search doctor by name or specialty"
            value={search}
            onChangeText={setSearch}
          />
          {doctors
            .filter((d) =>
              `${d.name} ${d.specialty}`
                .toLowerCase()
                .includes(search.toLowerCase()),
            )
            .map((d) => (
              <Pressable
                key={d._id}
                accessibilityRole="radio"
                accessibilityState={{ checked: doctorId === d._id }}
                onPress={() => { if (doctorId !== d._id) setSlip(null); setDoctor(d._id); }}
                style={[
                  s.card,
                  s.row,
                  {
                    padding: 13,
                    marginBottom: 10,
                    borderColor: doctorId === d._id ? C.sky : C.line,
                    backgroundColor: doctorId === d._id ? "#f5fbff" : "#fff",
                  },
                ]}
              >
                <View style={[s.iconTile, { borderRadius: 25 }]}>
                  <Icon name="user" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ color: C.navy, fontWeight: "700", fontSize: 14 }}
                  >
                    {d.name}
                  </Text>
                  <Text style={[s.body, { fontSize: 11 }]}>{d.specialty}</Text>
                  <Text style={{ color: C.navy, fontSize: 11, fontWeight: "500", marginTop: 1 }}>
                    {typeof d.hospitalId === "object" && d.hospitalId?.name
                      ? d.hospitalId.name
                      : d.hospitalName || hospital?.name || "Hospital not available"}
                  </Text>
                  <Text style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>
                    {d.weekdays
                      .map(
                        (day) =>
                          ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
                            day
                          ],
                      )
                      .join(", ")}
                  </Text>
                </View>
                <View
                  style={{
                    width: 21,
                    height: 21,
                    borderRadius: 11,
                    borderWidth: 1,
                    borderColor: C.line,
                    backgroundColor: doctorId === d._id ? C.sky : "#fff",
                  }}
                >
                  {doctorId === d._id && (
                    <Icon name="check" size={18} color="#fff" />
                  )}
                </View>
              </Pressable>
            ))}
          {!loading &&
            !error &&
            !doctors.filter((d) =>
              `${d.name} ${d.specialty}`
                .toLowerCase()
                .includes(search.toLowerCase()),
            ).length && (
              <Notice>
                No matching doctors. Try another specialty or search.
              </Notice>
            )}
        </>
      ) : step === 2 ? (
        <>
          <Calendar
            value={date}
            onChange={(value) => {
              if (value === date) return;
              setLoading(true);
              setTime("");
              setSlots([]);
              setError("");
              setDate(value);
            }}
            weekdays={doctor?.weekdays || []}
          />
          <Text style={[s.label, { marginTop: 20, marginBottom: 4 }]}>
            Available Time Slots
          </Text>
          <Text style={[s.body, { fontSize: 12, marginBottom: 16 }]}>
            15-minute appointments
          </Text>
          {[
            { title: "Morning (9–10 AM)", start: "09:00", end: "10:00" },
            { title: "Evening (5–7 PM)", start: "17:00", end: "19:00" },
          ].map((period) => {
            const periodSlots = slots.filter(
              (slot) => slot.time >= period.start && slot.time < period.end,
            );
            if (!periodSlots.length) return null;
            return (
              <View key={period.title} style={{ marginBottom: 16 }}>
                <Text style={[s.label, { marginBottom: 10 }]}>
                  {period.title}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    rowGap: 8,
                    marginHorizontal: -4,
                  }}
                >
                  {periodSlots.map((slot) => (
                    <View
                      key={slot.time}
                      style={{ width: "33.333333%", paddingHorizontal: 4 }}
                    >
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityLabel={timeLabel(slot.time)}
                        accessibilityState={{
                          checked: time === slot.time,
                          disabled: !slot.available,
                        }}
                        disabled={!slot.available || loading}
                        onPress={() => setTime(slot.time)}
                        style={{
                          minHeight: 44,
                          paddingVertical: 10,
                          paddingHorizontal: 4,
                          justifyContent: "center",
                          alignItems: "center",
                          borderWidth: 1,
                          borderColor: C.line,
                          borderRadius: 11,
                          backgroundColor: time === slot.time ? C.navy : "#fff",
                          opacity: slot.available ? 1 : 0.35,
                        }}
                      >
                        <Text
                          style={{
                            color: time === slot.time ? "#fff" : C.navy,
                            fontSize: 12,
                            fontWeight: "600",
                            textAlign: "center",
                          }}
                        >
                          {timeLabel(slot.time)}
                        </Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
          {!loading && !error && !slots.some((slot) => slot.available) && (
            <View style={{ marginTop: 4 }}>
              <Notice>
                No available times on this date. Please choose another day.
              </Notice>
            </View>
          )}
        </>
      ) : step === 3 ? (
        doctor ? <PaymentStep doctor={doctor} slip={slip?.doctorId === doctorId ? slip : null} onChange={setSlip} onBusy={setUploading} /> : null
      ) : (
        <>
          <View style={s.card}>
            <Text style={[s.title, { fontSize: 18, marginBottom: 12 }]}>
              Your OPD appointment
            </Text>
            <Row label="Hospital" value={hospital?.name || ""} />
            <Row label="Clinic" value={department} />
            <Row label="Doctor" value={doctor?.name || ""} />
            <Row label="Date" value={dateLabel(date)} />
            <Row label="Time" value={timeLabel(time)} />
            <Row label="Appointment fee" value={`LKR ${(doctor?.feeLkr || 0).toFixed(2)}`} />
            <Row label="Payment" value={(doctor?.feeLkr || 0) > 0 ? "Slip ready for admin review" : "No payment required"} />
          </View>
          <View style={{ marginTop: 16 }}>
            <Notice>Check your details, then confirm your appointment.</Notice>
          </View>
        </>
      )}
      {loading && (
        <ActivityIndicator style={{ marginTop: 18 }} color={C.blue} />
      )}
      <ErrorMessage message={error} />
      {!!error && step < 3 && (
        <Pressable
          style={s.centerLink}
          onPress={() => {
            setLoading(true);
            setError("");
            setRetry((v) => v + 1);
          }}
        >
          <Text style={s.link}>Retry loading</Text>
        </Pressable>
      )}
      {step < 2 && (
        <View
          style={[
            s.row,
            { marginTop: 32, marginBottom: step === 0 ? 155 : 20 },
          ]}
        >
          {step >= 2 && (
            <Button
              title="Back"
              outline
              disabled={booking || uploading}
              onPress={() => {
                changeStep(step - 1);
              }}
              style={{ flex: 1 }}
            />
          )}
          <Button
            title={step === 4 ? "Confirm Appointment" : "Next"}
            arrow
            loading={booking}
            disabled={loading || uploading || (step === 3 && (doctor?.feeLkr || 0) > 0 && (!slip || slip.doctorId !== doctorId))}
            onPress={next}
            style={{ flex: step >= 2 ? 1.5 : 1 }}
          />
        </View>
      )}
    </Screen>
  );
}
export function AppointmentCard({ appointment }: { appointment: Appointment }) {
  return (
    <View style={s.card}>
      <View
        style={[
          s.row,
          {
            marginBottom: 10,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderColor: C.line,
          },
        ]}
      >
        <View style={s.iconTile}>
          <Icon name="cross" />
        </View>
        <View>
          <Text style={{ color: C.navy, fontWeight: "700" }}>OPD</Text>
          <Text style={[s.body, { fontSize: 11 }]}>Outpatient Department</Text>
        </View>
      </View>
      <Row label="Appointment ID" value={appointment.appointmentId} />
      {!!appointment.doctorQueueNumber && (
        <Row label="Your Queue" value={`#${appointment.doctorQueueNumber}`} />
      )}
      <Row
        label="Hospital"
        value={appointment.hospitalId?.name || "Hospital unavailable"}
      />
      <Row label="Clinic" value={appointment.department} />
      <Row
        label="Doctor"
        value={appointment.doctorId?.name || "Doctor unavailable"}
      />
      <Row label="Date" value={dateLabel(appointment.date)} />
      <Row label="Time" value={timeLabel(appointment.time)} />
      <Row label="Appointment fee" value={`LKR ${(appointment.payment?.amountLkr || 0).toFixed(2)}`} />
      <Row label="Payment" value={paymentLabel(appointment.payment?.status)} />
      {appointment.payment?.status === "rejected" && (
        <View style={{ marginVertical: 8 }}>
          <Text style={s.label}>Payment rejection reason</Text>
          <Text translate={false} style={s.body}>{appointment.payment.rejectionReason}</Text>
          <Text style={s.body}>Please contact the hospital about your payment.</Text>
        </View>
      )}
      <Row
        label="Status"
        value={
          appointment.status === "cancelled"
            ? "Cancelled"
            : appointment.status === "completed"
              ? "Completed"
              : appointment.doctorDecision === "rejected"
                ? "Rejected"
                : appointment.doctorDecision === "pending"
                  ? "Pending Doctor Approval"
                  : "Confirmed"
        }
      />
    </View>
  );
}
function Calendar({
  value,
  onChange,
  weekdays,
}: {
  value: string;
  onChange: (value: string) => void;
  weekdays: number[];
}) {
  const [month, setMonth] = useState(
    () => new Date(`${value.slice(0, 7)}-01T12:00:00`),
  );
  const year = month.getFullYear();
  const m = month.getMonth();
  const count = new Date(year, m + 1, 0).getDate();
  const first = new Date(year, m, 1).getDay();
  const minimum = today();
  const maxDate = new Date(`${minimum}T12:00:00`);
  maxDate.setDate(maxDate.getDate() + 90);
  const maximum = `${maxDate.getFullYear()}-${String(maxDate.getMonth() + 1).padStart(2, "0")}-${String(maxDate.getDate()).padStart(2, "0")}`;
  return (
    <View
      style={[
        s.card,
        {
          padding: 13,
          borderRadius: 12,
          boxShadow: "0px 8px 20px rgba(12, 42, 65, 0.16)",
        },
      ]}
    >
      <View
        style={[s.row, { justifyContent: "space-between", marginBottom: 12 }]}
      >
        <Text style={{ color: "#20262c", fontWeight: "600" }}>
          {month.toLocaleDateString("en-GB", {
            month: "long",
            year: "numeric",
          })}
        </Text>
        <View style={s.row}>
          <Pressable
            accessibilityLabel="Previous month"
            disabled={valueMonth(minimum) >= year * 12 + m}
            onPress={() => setMonth(new Date(year, m - 1, 1, 12))}
            style={{ padding: 5 }}
          >
            <Icon name="back" color="#222" size={18} />
          </Pressable>
          <Pressable
            accessibilityLabel="Next month"
            disabled={valueMonth(maximum) <= year * 12 + m}
            onPress={() => setMonth(new Date(year, m + 1, 1, 12))}
            style={{ padding: 5, transform: [{ rotate: "180deg" }] }}
          >
            <Icon name="back" color="#222" size={18} />
          </Pressable>
        </View>
      </View>
      <View style={{ flexDirection: "row" }}>
        {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
          <Text
            key={d}
            style={{
              width: "14.2857%",
              textAlign: "center",
              fontSize: 9,
              color: "#9da4ad",
              paddingBottom: 8,
            }}
          >
            {d}
          </Text>
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {Array.from({ length: first + count }, (_, index) => {
          const day = index - first + 1;
          const key = `${year}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const disabled =
            key < minimum || key > maximum || !weekdays.includes(index % 7);
          return (
            <View
              key={index}
              style={{
                width: "14.2857%",
                alignItems: "center",
                paddingVertical: 5,
              }}
            >
              {day > 0 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={key}
                  accessibilityState={{ selected: value === key, disabled }}
                  disabled={disabled}
                  onPress={() => onChange(key)}
                  style={{
                    width: 31,
                    height: 31,
                    borderRadius: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor:
                      value === key
                        ? C.blue
                        : key === minimum
                          ? "#dbecff"
                          : "transparent",
                    opacity: disabled ? 0.3 : 1,
                  }}
                >
                  <Text
                    style={{
                      color: value === key ? "#fff" : "#20262c",
                      fontSize: 15,
                    }}
                  >
                    {day}
                  </Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
function valueMonth(value: string) {
  return Number(value.slice(0, 4)) * 12 + Number(value.slice(5, 7)) - 1;
}
