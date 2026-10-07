// Uses local static files and mocked APIs only. Run after the web export in docs/APPOINTMENT_PAYMENTS.md.
const { chromium, expect } = require("@playwright/test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

async function main() {
  const webRoot = path.resolve(".expo/web-payment-check");
  const adminRoot = path.resolve("../../admin");
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    const admin = url.pathname.startsWith("/admin/");
    const root = admin ? adminRoot : webRoot;
    let file = path.resolve(root, "." + decodeURIComponent(admin ? url.pathname.slice(6) : url.pathname));
    if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!fs.existsSync(file) && fs.existsSync(file + ".html")) file += ".html";
    if (!fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    res.setHeader("Content-Type", { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml" }[path.extname(file)] || "application/octet-stream");
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({ viewport: { width: 393, height: 852 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const out = path.resolve("artifacts/payments"); fs.mkdirSync(out, { recursive: true });
  const patient = { id: "patient-test", patientId: "PT-TEST", fullName: "Test Patient", email: "patient@example.com" };
  const hospital = { _id: "hospital-test", name: "Test Hospital", departments: ["General Medicine"] };
  const doctor = { _id: "doctor-test", name: "Dr Test", specialty: "General Medicine", hospitalId: hospital, weekdays: [0,1,2,3,4,5,6], feeLkr: 1500, paymentInstructions: "Test Bank - sample account 1234" };
  let appointment;
  let uploaded = false;
  const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*" };
  await page.route("**/api/patient/**", async (route) => {
    const req = route.request(); const url = new URL(req.url());
    let data = {}; let status = 200;
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    if (url.pathname.endsWith("/auth/login")) data = { token: "test-token", patient };
    else if (url.pathname.endsWith("/profile")) data = patient;
    else if (url.pathname.endsWith("/hospitals")) data = [hospital];
    else if (url.pathname.endsWith("/doctors")) data = [doctor];
    else if (url.pathname.endsWith("/slots")) data = [{ time: "09:15", available: true }];
    else if (url.pathname.includes("/payments/slips/")) {
      assert.match(req.headers()["content-type"], /multipart\/form-data; boundary=/);
      uploaded = true; data = { id: "slip-test", filename: "payment-slip.jpg", uploadedAt: new Date().toISOString() }; status = 201;
    } else if (url.pathname.endsWith("/appointments") && req.method() === "POST") {
      const body = req.postDataJSON();
      assert.equal(body.expectedFeeLkr, 1500); assert.equal(body.slipId, "slip-test"); assert.ok(uploaded);
      appointment = { ...body, _id: "appointment-test", appointmentId: "OPD-TEST", doctorId: doctor, hospitalId: hospital, patientId: patient,
        status: "confirmed", createdAt: new Date().toISOString(), payment: { amountLkr: 1500, status: "pending", slipId: { _id: "slip-test", uploadedAt: new Date().toISOString() } } };
      data = appointment; status = 201;
    } else if (url.pathname.endsWith("/appointments")) data = appointment ? [appointment] : [];
    else if (url.pathname.endsWith("/queue")) data = null;
    await route.fulfill({ status, headers, contentType: "application/json", body: JSON.stringify(data) });
  });
  try {
    await page.goto(base);
    await page.getByRole("button", { name: "Book a Appointment", exact: true }).click();
    await page.getByLabel("Email or Phone").fill(patient.email);
    await page.getByLabel("Password", { exact: true }).filter({ visible: true }).fill("Password123");
    await page.getByRole("button", { name: "Login", exact: true }).click();
    await page.getByRole("button", { name: "Book Appointment", exact: true }).click();
    await page.getByRole("button", { name: "Hospital / Clinic", exact: true }).click();
    await page.getByRole("button", { name: hospital.name, exact: true }).click();
    await page.getByRole("button", { name: "Specialty / Department", exact: true }).click();
    await page.getByRole("button", { name: "General Medicine", exact: true }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("radio").filter({ hasText: doctor.name }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(Date.now() + 2 * 86400000));
    if (!(await page.getByRole("button", { name: date, exact: true }).count())) await page.getByLabel("Next month").click();
    await page.getByRole("button", { name: date, exact: true }).click();
    await page.getByRole("radio", { name: "9:15 AM", exact: true }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByText("Payment instructions", { exact: true })).toBeVisible();
    await expect(page.getByText("LKR 1500.00", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Upload payment slip", exact: true }).click();
    await (await chooser).setFiles({ name: "receipt.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJ1sAAAAASUVORK5CYII=", "base64") });
    await expect(page.getByText("Payment slip uploaded")).toBeVisible();
    await page.screenshot({ path: path.join(out, "patient-payment.png"), fullPage: true });
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Confirm Appointment", exact: true }).click();
    await expect(page.getByText("Appointment booked", { exact: true })).toBeVisible();
    await expect(page.getByText("Awaiting payment approval", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "View Appointment", exact: true }).click();
    await expect(page.getByRole("button", { name: "Cancel Appointment", exact: true })).toBeVisible();

    const admin = await browser.newPage({ viewport: { width: 393, height: 852 } });
    admin.on("pageerror", (error) => errors.push(error.message));
    await admin.addInitScript(() => { localStorage.setItem("careplus_admin_token", "test-admin"); localStorage.setItem("careplus_admin_user", JSON.stringify({ adminId: "test-admin" })); });
    let approved = false;
    await admin.route("**/api/admin/**", async (route) => {
      const req = route.request(); const url = new URL(req.url()); let data = {};
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
      if (url.pathname.endsWith("/doctor-fees")) data = [doctor];
      else if (url.pathname.includes("/doctor-fees/")) { Object.assign(doctor, req.postDataJSON()); data = doctor; }
      else if (url.pathname.endsWith("/payments")) data = { items: approved && url.searchParams.get("status") === "pending" ? [] : [appointment], total: approved ? 0 : 1, page: 1 };
      else if (url.pathname.endsWith("/approve")) { approved = true; data = appointment; }
      else if (url.pathname.endsWith("/slip")) return route.fulfill({ headers, contentType: "image/jpeg", body: Buffer.from("test image") });
      else if (url.pathname.endsWith("/dashboard")) data = { totalDoctors: 1, totalNurses: 0, totalPatients: 1, pendingApprovals: 0, recentActivity: [] };
      await route.fulfill({ headers, contentType: "application/json", body: JSON.stringify(data) });
    });
    await admin.goto(`${base}/admin/`);
    await admin.getByRole("button", { name: "Doctor fees & payment slips" }).click();
    await expect(admin.getByText("Slip uploaded:", { exact: false })).toBeVisible();
    await admin.getByLabel("Doctor", { exact: true }).first().selectOption(doctor._id);
    await admin.getByLabel("Amount (LKR)").fill("1750");
    await admin.getByRole("button", { name: "Save fee", exact: true }).click();
    await expect(admin.getByText("Doctor fee saved.", { exact: false })).toBeVisible();
    assert.equal(doctor.feeLkr, 1750);
    await admin.screenshot({ path: path.join(out, "admin-payments.png"), fullPage: true });
    const download = admin.waitForEvent("download");
    await admin.getByRole("button", { name: "Download slip", exact: true }).click();
    await download;
    admin.once("dialog", (dialog) => dialog.accept());
    await admin.getByRole("button", { name: "Approve payment", exact: true }).click();
    await expect(admin.getByText("Payment approved. The patient notification email is queued for delivery.")).toBeVisible();
    assert.ok(approved);
    assert.deepEqual(errors, []);
    console.log("PASS: patient slip upload, five-step booking, payment status, cancellation option, admin fees, private receipt download and approval.");
  } finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
