// Browser-only localization checks. All API requests are intercepted; no accounts are created.
const { chromium, expect } = require("@playwright/test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const dictionary = {};
for (const file of [
  "patient/i18n/translations.ts",
  "nurse/translations.ts",
  "queue-notification/translations.ts",
]) {
  const compiled = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, "../src/features", file), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  const exports = {};
  new Function("exports", compiled)(exports);
  Object.assign(dictionary, ...Object.values(exports));
}
const localized = (text, lang) =>
  lang === "en" ? text : dictionary[text]?.[lang === "si" ? 0 : 1] || text;
async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const output = path.join(__dirname, "../artifacts/languages");
  fs.mkdirSync(output, { recursive: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 320, height: 852 },
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const nurse = {
      id: "nurse-test",
      nurseId: "NUR-12345",
      fullName: "Test Nurse",
      nic: "199012345678",
      dateOfBirth: "1990-01-01",
      gender: "Female",
      phone: "+94771234567",
      email: "nurse@example.com",
      address: "Test address",
      district: "Colombo",
      username: "test_nurse",
      department: "General OPD",
      ward: "General OPD",
      hospitalId: "hospital-test",
      role: "nurse",
      status: "active",
    };
    let registered;
    await page.route("https://accounts.google.com/**", (route) =>
      route.abort(),
    );
    await page.route("**/api/**", async (route) => {
      const req = route.request();
      const url = new URL(req.url()).pathname;
      let body = [];
      if (url.endsWith("/auth/login"))
        body = {
          token: "test-only-token",
          nurse,
          patient: { ...nurse, patientId: "PT-12345" },
        };
      if (url.endsWith("/auth/register")) {
        registered = req.postDataJSON();
        body = { nurse };
      }
      if (url.endsWith("/profile")) body = nurse;
      if (url.endsWith("/queue")) body = { date: "2026-10-07", entries: [] };
      await route.fulfill({
        status: req.method() === "OPTIONS" ? 204 : 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Allow-Methods": "*",
        },
        contentType: "application/json",
        body: req.method() === "OPTIONS" ? "" : JSON.stringify(body),
      });
    });
    const base = process.env.UI_TEST_URL || "http://localhost:8083";
    const button = (name) => page.getByRole("button", { name, exact: true });
    async function language(lang) {
      const name = { en: "English", si: "Sinhala", ta: "Tamil" }[lang];
      await expect(button(name)).toHaveCount(1);
      await button(name).click();
      await expect(button(name)).toHaveAttribute("aria-pressed", "true");
    }
    async function visible(text, lang) {
      await expect(
        page
          .getByText(localized(text, lang), { exact: true })
          .filter({ visible: true })
          .first(),
      ).toBeVisible();
    }
    async function contained(text, lang) {
      const element = page
        .getByText(localized(text, lang), { exact: true })
        .filter({ visible: true })
        .first();
      await element.scrollIntoViewIfNeeded();
      const box = await element.boundingBox();
      assert(
        box && box.x >= -1 && box.x + box.width <= 321,
        `${text} overflows at 320px`,
      );
    }
    await page.goto(`${base}/nurse/login`, {
      timeout: 120000,
      waitUntil: "networkidle",
    });
    await page.getByLabel("Staff ID", { exact: true }).fill("NUR-12345");
    for (const lang of ["si", "ta", "en"]) {
      await language(lang);
      await visible("Nurse Login", lang);
      await expect(
        page.getByLabel(localized("Staff ID", lang), { exact: true }),
      ).toHaveValue("NUR-12345");
      await contained("Forgot Password?", lang);
      await contained("Continue with Google", lang);
      await button(localized("Log In", lang)).click();
      await visible("Enter your Staff ID or email and password.", lang);
    }
    await language("ta");
    await page.reload();
    await expect(button("Tamil")).toHaveAttribute("aria-pressed", "true");
    await visible("Nurse Login", "ta");
    await page.goto(`${base}/nurse/register`, { waitUntil: "networkidle" });
    await visible("Create Nurse Account", "ta");
    await language("en");
    await page.getByLabel("Full Name", { exact: true }).fill("Test Nurse");
    await page
      .getByLabel("Nurse ID / NIC Number", { exact: true })
      .fill("199012345678");
    await page.getByLabel("Date of Birth", { exact: true }).fill("1990-01-01");
    await button("Department / Ward").click();
    await button("General OPD").click();
    for (let step = 1; step <= 3; step++) {
      for (const lang of ["si", "ta", "en"]) {
        await language(lang);
        await contained("Create Nurse Account", lang);
        await visible(
          `Step ${step} of 3 - ${["Personal Details", "Contact Details", "Account Setup"][step - 1]}`,
          lang,
        );
      }
      if (step === 1) await button("Next").click();
      if (step === 2) {
        await page
          .getByLabel("Phone Number", { exact: true })
          .fill("0771234567");
        await page
          .getByLabel("Email Address", { exact: true })
          .fill("nurse@example.com");
        await page
          .getByLabel("Home Address", { exact: true })
          .fill("Test address");
        await button("District / City").click();
        await button("Colombo").click();
        await button("Next").click();
      }
    }
    await page.getByLabel("Username", { exact: true }).fill("test_nurse");
    await page.getByLabel("Password", { exact: true }).fill("SampleOnly123");
    await page
      .getByLabel("Confirm Password", { exact: true })
      .fill("SampleOnly123");
    await page.getByRole("checkbox").click();
    await language("ta");
    await button(localized("Create Account", "ta")).click();
    await visible("Nurse Account Created Successfully!", "ta");
    assert.equal(registered.fullName, "Test Nurse");
    assert.equal(registered.department, "General OPD");
    assert.equal(registered.gender, "Female");
    await page.screenshot({
      path: path.join(output, "nurse-success-tamil.png"),
    });
    await button(localized("Go to Login", "ta")).click();
    await language("en");
    await page.getByLabel("Staff ID", { exact: true }).fill("NUR-12345");
    await page.getByLabel("Password", { exact: true }).fill("SampleOnly123");
    await button("Log In").click();
    await visible("Recent Activity", "en");
    await language("ta");
    await visible("Patient Search", "ta");
    await page
      .getByText(localized("Patient Search", "ta"), { exact: true })
      .click();
    await visible("No patients found", "ta");
    await expect(
      page.getByPlaceholder(localized("Search by name, ID or phone...", "ta")),
    ).toBeVisible();
    await button(localized("Profile", "ta")).click();
    await visible("Account Information", "ta");
    await visible("Deactivate Account", "ta");
    await button(localized("Home", "ta")).click();
    await page
      .getByText(localized("Queue Mgmt", "ta"), { exact: true })
      .filter({ visible: true })
      .first()
      .click();
    await visible("Queue Management", "ta");
    await contained("Call Next Patient", "ta");
    await button(localized("Home", "ta")).click();
    await page
      .getByText(localized("Digital Queue", "ta"), { exact: true })
      .filter({ visible: true })
      .first()
      .click();
    await visible("Digital Queue Display", "ta");
    await contained("Display Controls", "ta");
    for (const route of [
      "/login",
      "/register",
      "/forgot-password",
      "/what-you-need",
      "/who-you-are",
    ]) {
      await page.goto(base + route, { waitUntil: "networkidle" });
      for (const lang of ["en", "si", "ta"]) await language(lang);
      await page.screenshot({
        path: path.join(output, route.slice(1) + "-tamil.png"),
      });
    }
    await page.goto(`${base}/login`, { waitUntil: "networkidle" });
    await language("en");
    await page
      .getByLabel("Email or Phone", { exact: true })
      .fill("patient@example.com");
    await page.getByLabel("Password", { exact: true }).fill("SampleOnly123");
    await button("Login").click();
    await visible("No appointment yet", "en");
    await language("ta");
    await button("Notifications").click();
    for (let i = 0; i < 7; i++) {
      for (const lang of ["si", "ta", "en"]) await language(lang);
      await language("ta");
      await expect(page.getByText("‹ பின்செல்", { exact: true })).toBeVisible();
      await page.screenshot({
        path: path.join(output, `queue-${i}-tamil.png`),
      });
      await page.getByLabel("Next screen", { exact: true }).click();
    }
    assert.deepEqual(errors, []);
    console.log(
      "Language checks passed: EN/SI/TA, nurse registration steps, form preservation, canonical submitted values, persisted selection, nurse login/dashboard/search/profile/queues, patient auth and all seven notification/queue pages at 320px.",
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
