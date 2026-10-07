// Browser interaction checks use a mocked API; backend behavior has separate MongoDB integration tests.
const { chromium, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const output = path.resolve("artifacts/ui");
  fs.mkdirSync(output, { recursive: true });
  const base = process.env.UI_TEST_URL || "http://localhost:8082";
  let patient = {
    id: "patient-test",
    patientId: "PT-20458",
    fullName: "Nimal Kumar",
    username: "nimalkumar",
    nic: "199012345678",
    dateOfBirth: "1990-05-10",
    gender: "Male",
    email: "nimal@example.com",
    phone: "+94771234567",
    address: "12 Main Street, Colombo",
    district: "Colombo",
  };
  const hospital = {
    _id: "hospital-test",
    name: "CarePlus Demo Hospital",
    departments: ["General Medicine"],
  };
  const doctor = {
    _id: "doctor-test",
    name: "Dr. Senaya Subhashini",
    specialty: "General Medicine",
    weekdays: [0, 1, 2, 3, 4, 5, 6],
  };
  let appointments = [];
  await page.route("**/api/patient/**", async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const body = route.request().postDataJSON();
    let result = {};
    let status = 200;
    if (url.pathname.endsWith("/auth/register")) {
      result = { patient };
      status = 201;
    } else if (url.pathname.endsWith("/auth/login"))
      result = { token: "test-token", patient };
    else if (url.pathname.endsWith("/hospitals")) result = [hospital];
    else if (url.pathname.endsWith("/doctors")) result = [doctor];
    else if (url.pathname.endsWith("/slots"))
      result = ["09:00", "09:15", "09:30", "09:45", "17:00", "17:15", "17:30", "17:45", "18:00", "18:15", "18:30", "18:45"].map(
        (time) => ({ time, available: true }),
      );
    else if (url.pathname.endsWith("/appointments") && method === "POST") {
      result = {
        ...body,
        _id: "appointment-test",
        appointmentId: "OPD-20260929001",
        doctorId: doctor,
        hospitalId: hospital,
        doctorQueueNumber: 1,
        status: "confirmed",
      };
      appointments.push(result);
      status = 201;
    } else if (url.pathname.endsWith("/queue")) {
      const appointment = appointments.find((a) => a.status === "confirmed");
      result = appointment ? { appointment, queueNumber: 1, patientsAhead: 0, nowServing: null, status: "waiting", startsAt: `${appointment.date}T${appointment.time}:00+05:30`, serverTime: new Date().toISOString(), entries: [{ queueNumber: 1, isYou: true, name: patient.fullName, selected: true, status: "waiting", time: appointment.time }] } : null;
    } else if (url.pathname.endsWith("/appointments")) result = appointments;
    else if (url.pathname.endsWith("/cancel")) {
      appointments = appointments.map((a) => ({ ...a, status: "cancelled" }));
      result = appointments[0];
    } else if (url.pathname.endsWith("/profile") && method === "PATCH") {
      patient = { ...patient, ...body };
      result = patient;
    } else if (url.pathname.endsWith("/profile") && method === "DELETE") {
      appointments = [];
      status = 204;
    } else if (url.pathname.endsWith("/profile")) result = patient;
    await route.fulfill({
      status: method === "OPTIONS" ? 204 : status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "*",
      },
      contentType: "application/json",
      body:
        status === 204 || method === "OPTIONS" ? "" : JSON.stringify(result),
    });
  });
  const shot = (name) =>
    page.screenshot({ path: path.join(output, `${name}.png`) });
  try {
    await page.goto(base, { waitUntil: "domcontentloaded", timeout: 60000 });
    await expect(page.getByText("Click to Start")).toBeVisible();
    await page.waitForTimeout(400);
    await shot("01-launch");
    await expect(page.getByText("What You Need?")).toBeVisible();
    await shot("02-options");
    await page.getByRole("button", { name: "Book a Appointment" }).click();
    await expect(page.getByText("Welcome back!")).toBeVisible();
    await shot("03-login");
    await page.getByText("Sign Up", { exact: true }).click();
    await page.getByLabel("Full Name", { exact: true }).fill(patient.fullName);
    await page
      .getByLabel("NIC / Passport No", { exact: true })
      .fill(patient.nic);
    await page.getByLabel("Date of Birth", { exact: true }).fill("1990-05-10");
    await page.getByRole("radio", { name: "Male", exact: true }).click();
    await shot("04-register-personal");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByLabel("Phone Number", { exact: true }).fill("0771234567");
    await page.getByLabel("Email Address", { exact: true }).fill(patient.email);
    await page
      .getByLabel("Home Address", { exact: true })
      .fill(patient.address);
    await page
      .getByRole("button", { name: "District / City", exact: true })
      .click();
    await page.getByRole("button", { name: "Colombo", exact: true }).click();
    await shot("05-register-contact");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByLabel("Username", { exact: true }).fill(patient.username);
    await page
      .getByLabel("Password", { exact: true })
      .filter({ visible: true })
      .fill("Password123");
    await page
      .getByLabel("Confirm Password", { exact: true })
      .fill("Password123");
    await page.getByRole("checkbox").check();
    await shot("06-register-account");
    await page.getByRole("button", { name: "Create Account" }).click();
    await expect(page.getByText("Account Created Successfully!")).toBeVisible();
    await shot("07-account-created");
    await page.getByRole("button", { name: "Go to Login" }).click();
    await page.getByLabel("Email or Phone").fill(patient.email);
    await page
      .getByLabel("Password", { exact: true })
      .filter({ visible: true })
      .fill("Password123");
    await page.getByRole("button", { name: "Login", exact: true }).click();
    await expect(page.getByText("No appointment yet")).toBeVisible();
    await shot("08-home-empty");
    await page
      .getByRole("button", { name: "Book Appointment", exact: true })
      .click();
    await expect(
      page.getByText("Select Hospital", { exact: false }).first(),
    ).toBeVisible();
    await shot("09-book");
    await page
      .getByRole("button", { name: "Hospital / Clinic", exact: true })
      .click();
    await page
      .getByRole("button", { name: hospital.name, exact: true })
      .click();
    await page
      .getByRole("button", { name: "Specialty / Department", exact: true })
      .click();
    await page
      .getByRole("button", { name: "General Medicine", exact: true })
      .click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("radio").filter({ hasText: doctor.name }).click();
    await shot("10-doctor");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    const future = new Date();
    future.setDate(future.getDate() + 2);
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Colombo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(future);
    if (!(await page.getByRole("button", { name: date, exact: true }).count()))
      await page.getByLabel("Next month", { exact: true }).click();
    await page.getByRole("button", { name: date, exact: true }).click();
    await page.getByRole("radio", { name: "9:15 AM", exact: true }).click();
    await shot("11-date-time");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Confirm Appointment" }).click();
    await expect(page.getByText("Appointment Confirmed!")).toBeVisible();
    await shot("12-confirmed");
    await page
      .getByRole("button", { name: "Back to Home", exact: true })
      .click();
    await expect(page.getByText("Next Appointment")).toBeVisible();
    await shot("13-home-booked");
    await page.getByRole("button", { name: "Profile", exact: true }).click();
    await shot("14-profile");
    await page.getByText("Edit Profile", { exact: true }).click();
    await page
      .getByLabel("Full Name", { exact: true })
      .fill("Nimal Kumar Updated");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(
      page.getByText("Your profile has been updated."),
    ).toBeVisible();
    await page.getByText("Settings", { exact: true }).click();
    await page.getByRole("button", { name: "Delete My Account" }).click();
    await page
      .getByLabel("Password", { exact: true })
      .filter({ visible: true })
      .fill("Password123");
    await page
      .getByRole("button", { name: "Permanently Delete Account" })
      .click();
    await expect(page.getByText("Welcome back!")).toBeVisible();
    await page.goto(base);
    await expect(page.getByText("Click to Start")).toBeVisible();
    await expect(page.getByText("Welcome back!")).toBeVisible();
    await page.getByRole("button", { name: "Sinhala", exact: true }).click();
    await expect(page.getByText("නැවත සාදරයෙන් පිළිගනිමු!")).toBeVisible();
    await expect(
      page.getByPlaceholder("ඊමේල් හෝ දුරකථන අංකය ඇතුළත් කරන්න"),
    ).toBeVisible();
    await shot("15-login-sinhala");
    await page.getByRole("button", { name: "Tamil", exact: true }).click();
    await expect(page.getByText("மீண்டும் வரவேற்கிறோம்!")).toBeVisible();
    await shot("16-login-tamil");
    await page.reload();
    await expect(page.getByText("மீண்டும் வரவேற்கிறோம்!")).toBeVisible();
    if (errors.length) throw new Error(errors.join("\n"));
    console.log(
      "PASS: registration, login, booking, profile edit, deletion, and launch path persistence. Screenshots: artifacts/ui",
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
