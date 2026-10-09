// UI checks use an intercepted API; privacy/number allocation are tested against MongoDB.
const { chromium, expect } = require("@playwright/test");
async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 360, height: 800 } });
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const date = (offset) => {
      const d = new Date(); d.setDate(d.getDate() + offset);
      return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
    };
    const patient = { id: "patient", fullName: "Queue Owner" };
    const first = { _id: "today", appointmentId: "OPD-TODAY", date: date(0), time: "09:00", status: "confirmed", department: "General Medicine", doctorId: { _id: "a", name: "Dr. One" }, hospitalId: { _id: "h", name: "Test Hospital" }, doctorQueueNumber: 2 };
    const items = [first, { ...first, _id: "future", appointmentId: "OPD-FUTURE", date: date(1), doctorId: { _id: "b", name: "Dr. Two" } }, { ...first, _id: "past", appointmentId: "OPD-PAST", date: date(-1), status: "completed" }];
    let startsAt, hasQueue = true, failQueue = false, ahead = 1;
    await page.route("https://accounts.google.com/**", (r) => r.abort());
    await page.route("**/api/patient/**", async (r) => {
      const url = new URL(r.request().url());
      let body = [], status = r.request().method() === "OPTIONS" ? 204 : 200;
      if (url.pathname.endsWith("/auth/login")) body = { token: "test-token", patient };
      if (url.pathname.endsWith("/appointments")) body = url.searchParams.get("scope") === "today" ? [first] : items;
      if (url.pathname.endsWith("/queue")) {
        startsAt ||= new Date(Date.now() + 6000).toISOString();
        body = hasQueue ? { appointment: first, queueNumber: 2, status: "waiting", startsAt, serverTime: new Date().toISOString(), patientsAhead: ahead, nowServing: ahead ? 1 : null,
          entries: [ { queueNumber: 1, time: "18:00", status: ahead ? "serving" : "completed", isYou: false, selected: false }, { queueNumber: 2, time: "09:00", status: "waiting", isYou: true, selected: true, name: patient.fullName } ] } : null;
        if (failQueue) { status = 500; body = { message: "Test queue unavailable" }; }
      }
      await r.fulfill({ status, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*" }, contentType: "application/json", body: status === 204 ? "" : JSON.stringify(body) });
    });
    const button = (name) => page.getByRole("button", { name, exact: true });
    await page.goto((process.env.UI_TEST_URL || "http://localhost:8084") + "/login", { waitUntil: "networkidle" });
    await page.getByLabel("Email or Phone", { exact: true }).fill("patient@example.com");
    await page.getByLabel("Password", { exact: true }).fill("Password123!");
    await button("Login").click();
    await expect(page.getByText("#2", { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByText("1 patients ahead", { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByText("00:00:00", { exact: true }).filter({ visible: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Appointment time reached", { exact: true }).filter({ visible: true })).toBeVisible();
    await page.getByText("View Queue", { exact: true }).filter({ visible: true }).click();
    await expect(page.getByText("Doctor's Queue", { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByText("Q-001", { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByText("Queue Owner", { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByText("You", { exact: true }).filter({ visible: true })).toBeVisible();
    ahead = 0;
    await expect(page.getByText("0 patients ahead", { exact: true }).filter({ visible: true })).toBeVisible({ timeout: 20000 });
    await button("Appointment History").click();
    for (const id of ["OPD-TODAY", "OPD-FUTURE", "OPD-PAST"]) await expect(page.getByText(id, { exact: true }).filter({ visible: true })).toHaveCount(1);
    await button("Doctor").click(); await button("Dr. Two").click();
    await expect(page.getByText("OPD-FUTURE", { exact: true }).filter({ visible: true })).toHaveCount(1);
    await expect(page.getByText("OPD-TODAY", { exact: true }).filter({ visible: true })).toHaveCount(0);
    await button("Date").click(); await button(date(-1)).click();
    await expect(page.getByText("No appointments match these filters.", { exact: true }).filter({ visible: true })).toBeVisible();
    await button("Doctor").click(); await button("All doctors").click();
    await expect(page.getByText("OPD-PAST", { exact: true }).filter({ visible: true })).toHaveCount(1);
    await button("Appointments").click();
    await expect(page.getByText("Today's Appointments", { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByText("OPD-TODAY", { exact: true }).filter({ visible: true })).toHaveCount(1);
    await expect(page.getByText("OPD-FUTURE", { exact: true }).filter({ visible: true })).toHaveCount(0);
    await expect(page.getByText("OPD-PAST", { exact: true }).filter({ visible: true })).toHaveCount(0);
    hasQueue = false;
    await button("Home").click();
    await expect(page.getByText("No appointment yet", { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByText("#2", { exact: true }).filter({ visible: true })).toHaveCount(0);
    failQueue = true;
    await page.getByText("View Queue", { exact: true }).filter({ visible: true }).click();
    await expect(page.getByText("Test queue unavailable", { exact: true }).filter({ visible: true })).toBeVisible();
    failQueue = false;
    await button("Retry").click();
    await expect(page.getByText("You have no active appointments in a queue.", { exact: true }).filter({ visible: true })).toBeVisible();
    if (errors.length) throw Error(errors.join("\n"));
    console.log("PASS: queue cards, countdown to zero, own-name list, polling, doctor/date filters, today-only appointments, empty/error recovery.");
  } finally { await browser.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
