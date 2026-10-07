// Runs against a separate Expo server; all API traffic is intercepted, never stored.
const { chromium, expect } = require("@playwright/test");
const assert = require("node:assert/strict");
async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 393, height: 852 },
    });
    const requests = [];
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.route("https://accounts.google.com/**", (route) =>
      route.abort(),
    );
    await page.route("**/api/patient/**", async (route) => {
      if (route.request().method() !== "OPTIONS")
        requests.push(new URL(route.request().url()).pathname);
      await route.fulfill({
        status: route.request().method() === "OPTIONS" ? 204 : 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Allow-Methods": "*",
        },
        contentType: "application/json",
        body:
          route.request().method() === "OPTIONS"
            ? ""
            : JSON.stringify({ message: "Test request received." }),
      });
    });
    const base = process.env.UI_TEST_URL || "http://localhost:8083";
    const alert = (text) => page.getByRole("alert").filter({ hasText: text });
    const button = (name) => page.getByRole("button", { name, exact: true });
    await page.goto(`${base}/login`, { timeout: 90000 });
    await button("Login").click();
    await expect(alert("Enter your password.")).toBeVisible();
    await expect(
      alert("Enter a valid email address phone number."),
    ).toBeVisible();
    await page.getByLabel("Email or Phone").fill("invalid@email");
    await page.getByLabel("Password", { exact: true }).fill("old");
    await expect(
      alert("Enter a valid email address, such as name@example.com."),
    ).toBeVisible();
    await button("Sinhala").click();
    await expect(alert("වලංගු විද්‍යුත් තැපැල්")).toBeVisible();
    await button("Tamil").click();
    await expect(alert("செல்லுபடியான மின்னஞ்சல்")).toBeVisible();
    await button("English").click();
    assert.equal(requests.length, 0);
    await page.getByLabel("Email or Phone").fill("patient@example.com");
    await button("Login").click();
    await expect(alert("Test request received.")).toBeVisible();
    assert.deepEqual(requests, ["/api/patient/auth/login"]);
    requests.length = 0;

    await page.goto(`${base}/register`);
    await button("Next").click();
    await expect(alert("Enter a name of")).toBeVisible();
    await expect(alert("Select your gender.")).toBeVisible();
    await expect(alert("Choose a valid birth date")).toBeVisible();
    await page.getByLabel("Full Name").fill("Nimal123 Perera@");
    await expect(page.getByLabel("Full Name")).toHaveValue("Nimal Perera");
    await page.getByLabel("NIC / Passport No").fill("901234567xv");
    await expect(page.getByLabel("NIC / Passport No")).toHaveValue(
      "901234567V",
    );
    await page.getByLabel("NIC / Passport No").fill("199812345678");
    await page.getByLabel("Date of Birth").fill("1998-05-10");
    await page.getByRole("radio", { name: "Male", exact: true }).click();
    await button("Next").click();
    await page.getByLabel("Phone Number").fill("0112345678");
    await page.getByLabel("Email Address").fill("name..name@example.com");
    await button("Next").click();
    await expect(alert("Enter a valid mobile number")).toBeVisible();
    await expect(alert("Enter a valid email address")).toBeVisible();
    await expect(alert("Select your district.")).toBeVisible();
    await page.getByLabel("Phone Number").fill("+94 (77) 123-4567");
    await page.getByLabel("Email Address").fill("patient@example.com");
    await page.getByLabel("Home Address").fill("12 Main Street");
    await button("District / City").click();
    await button("Colombo").click();
    await button("Next").click();
    await button("Create Account").click();
    await expect(alert("Use 3–30 letters")).toBeVisible();
    await expect(alert("Use at least 8 characters")).toBeVisible();
    await expect(alert("Confirm your password.")).toBeVisible();
    await page.getByLabel("Username").fill("nimal_patient");
    await page.getByLabel("Password", { exact: true }).fill("Password123!");
    await page
      .getByLabel("Confirm Password", { exact: true })
      .fill("different");
    await expect(alert("Passwords do not match.")).toBeVisible();
    await page
      .getByLabel("Confirm Password", { exact: true })
      .fill("Password123!");
    await page
      .getByRole("checkbox", { name: "Accept terms and privacy policy" })
      .check();
    assert.equal(requests.length, 0);
    await button("Create Account").click();
    await expect(alert("Test request received.")).toBeVisible();
    assert.deepEqual(requests, ["/api/patient/auth/register"]);
    requests.length = 0;

    await page.goto(`${base}/forgot-password`);
    await page.getByLabel("Email Address").fill("invalid@email");
    await button("Send Reset Code").click();
    await expect(alert("Enter a valid email address")).toBeVisible();
    assert.equal(requests.length, 0);
    assert.deepEqual(pageErrors, []);
    console.log(
      "PASS login, registration steps, translated field errors, reset email, and invalid-request blocking",
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
