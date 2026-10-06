// Uses a stub Google SDK and intercepted API: never opens a real Google account or writes patient data.
const { chromium, expect } = require("@playwright/test");
const assert = require("node:assert/strict");
async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const base = process.env.UI_TEST_URL || "http://localhost:8083";
  const patient = {
    id: "patient-google",
    patientId: "PT-GOOGLE",
    fullName: "Google Patient",
    email: "patient@gmail.com",
    phone: "+94771234567",
    nic: "199012345678",
    dateOfBirth: "1990-05-10",
    gender: "Male",
    address: "12 Main Road",
    district: "Colombo",
    username: "googlepatient",
  };
  try {
    for (const mode of [
      "signed-in",
      "link-required",
      "registration-required",
    ]) {
      const page = await browser.newPage({
        viewport: { width: 393, height: 852 },
      });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("https://accounts.google.com/gsi/client", (route) =>
        route.fulfill({
          contentType: "application/javascript",
          body: `window.google={accounts:{id:{initialize(options){this.options=options},renderButton(element){const button=document.createElement('button');button.textContent='Continue with Google';button.onclick=()=>this.options.callback({credential:'stub-google-token'});element.appendChild(button)}}}};`,
        }),
      );
      let registered = false;
      let linked = false;
      await page.route("**/api/patient/**", async (route) => {
        const req = route.request();
        const pathname = new URL(req.url()).pathname;
        const body = req.postDataJSON();
        let result = {};
        let status = 200;
        if (req.method() === "OPTIONS") status = 204;
        else if (pathname.endsWith("/auth/google")) {
          assert.equal(body.idToken, "stub-google-token");
          result =
            mode === "signed-in"
              ? { status: mode, token: "patient-token", patient }
              : {
                  status: mode,
                  proofToken: "onboarding-proof",
                  email: patient.email,
                  name: patient.fullName,
                };
        } else if (pathname.endsWith("/google/link")) {
          assert.equal(body.proofToken, "onboarding-proof");
          if (body.password !== "Password123") {
            status = 401;
            result = { message: "Your password is incorrect." };
          } else {
            linked = true;
            result = { token: "patient-token", patient };
          }
        } else if (pathname.endsWith("/auth/register")) {
          assert.equal(body.googleRegistrationToken, "onboarding-proof");
          assert.equal(body.email, patient.email);
          assert.equal(body.acceptedTerms, true);
          registered = true;
          status = 201;
          result = { token: "patient-token", patient };
        } else if (pathname.endsWith("/appointments")) result = [];
        await route.fulfill({
          status,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "*",
          },
          contentType: "application/json",
          body: status === 204 ? "" : JSON.stringify(result),
        });
      });
      await page.goto(`${base}/login`, {
        timeout: 90000,
        waitUntil: "domcontentloaded",
      });
      await page.getByRole("button", { name: "Continue with Google" }).click();
      if (mode === "link-required") {
        await expect(page.getByText("Link your Google account")).toBeVisible();
        const password = page
          .getByLabel("Password", { exact: true })
          .filter({ visible: true })
          .last();
        await password.fill("wrong");
        await page.getByRole("button", { name: "Link and Sign In" }).click();
        await expect(
          page
            .getByText("Your password is incorrect.")
            .filter({ visible: true })
            .last(),
        ).toBeVisible();
        await password.fill("Password123");
        await page.getByRole("button", { name: "Link and Sign In" }).click();
      }
      if (mode === "registration-required") {
        await expect(page.getByLabel("Full Name")).toHaveValue(
          patient.fullName,
        );
        await page.getByLabel("NIC / Passport No").fill(patient.nic);
        await page.getByLabel("Date of Birth").fill(patient.dateOfBirth);
        await page.getByRole("radio", { name: "Male", exact: true }).click();
        await page.getByRole("button", { name: "Next", exact: true }).click();
        await expect(page.getByLabel("Email Address")).toHaveValue(
          patient.email,
        );
        await expect(page.getByLabel("Email Address")).not.toBeEditable();
        await page.getByLabel("Phone Number").fill(patient.phone);
        await page.getByLabel("Home Address").fill(patient.address);
        await page
          .getByRole("button", { name: "District / City", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Colombo", exact: true })
          .click();
        await page.getByRole("button", { name: "Next", exact: true }).click();
        await page.getByLabel("Username").fill(patient.username);
        await page
          .getByLabel("Password", { exact: true })
          .filter({ visible: true })
          .fill("Password123");
        await page
          .getByLabel("Confirm Password", { exact: true })
          .fill("Password123");
        await page
          .getByRole("checkbox", { name: "Accept terms and privacy policy" })
          .check();
        await page.getByRole("button", { name: "Create Account" }).click();
      }
      await expect(page.getByText("No appointment yet")).toBeVisible();
      assert.equal(mode === "registration-required", registered);
      assert.equal(mode === "link-required", linked);
      assert.deepEqual(errors, []);
      console.log(`PASS Google ${mode}`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
