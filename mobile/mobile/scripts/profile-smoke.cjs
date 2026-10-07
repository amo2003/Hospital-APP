// Profile UI interactions use an intercepted API; no real patient data is modified.
const { chromium, expect } = require("@playwright/test");
const assert = require("node:assert/strict");
const sharp = require("../../../Backend/node_modules/sharp");

async function main() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 393, height: 852 },
    });
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    let patient = {
      id: "profile-test",
      patientId: "PT-TEST",
      fullName: "Test Patient",
      nic: "199012345678",
      dateOfBirth: "1990-05-10",
      gender: "Male",
      phone: "+94771234567",
      email: "patient@example.com",
      address: "12 Test Road",
      district: "Colombo",
      username: "test_patient",
      profileImage: null,
    };
    let saves = 0;
    let failSave = false;
    await page.route("https://accounts.google.com/**", (route) =>
      route.abort(),
    );
    await page.route("**/api/patient/**", async (route) => {
      const req = route.request();
      const url = new URL(req.url()).pathname;
      let body = [];
      let status = req.method() === "OPTIONS" ? 204 : 200;
      if (url.endsWith("/auth/login")) body = { token: "test-token", patient };
      if (url.endsWith("/profile")) {
        if (req.method() === "PATCH") {
          saves++;
          if (failSave) {
            status = 409;
            body = {
              message:
                "These account details already exist, or the appointment slot has just been booked. Please check and try again.",
            };
          } else {
            patient = { ...patient, ...req.postDataJSON() };
            body = patient;
          }
        } else body = patient;
      }
      await route.fulfill({
        status,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Allow-Methods": "*",
        },
        contentType: "application/json",
        body: status === 204 ? "" : JSON.stringify(body),
      });
    });
    const base = process.env.UI_TEST_URL || "http://localhost:8083";
    const button = (name) => page.getByRole("button", { name, exact: true });
    const field = (name) => page.getByLabel(name, { exact: true });
    await page.goto(base + "/login", {
      waitUntil: "networkidle",
      timeout: 90000,
    });
    await field("Email or Phone").fill("patient@example.com");
    await field("Password").fill("Password123!");
    await button("Login").click();
    await button("Profile").click();
    console.log("Opened profile");
    await expect(field("Full Name")).not.toBeEditable();
    await button("Edit Profile").click();
    await field("Full Name").fill("New123 Patient@");
    await expect(field("Full Name")).toHaveValue("New Patient");
    await field("NIC / Passport No").fill("901234567vx");
    await expect(field("NIC / Passport No")).toHaveValue("901234567V");
    await field("Email").fill("invalid@");
    await field("Phone Number").fill("12");
    await field("Home Address").fill("a");
    await button("Save Changes").click();
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Enter a valid email address" }),
    ).toBeVisible();
    assert.equal(saves, 0);
    await button("Tamil").click();
    await expect(
      page.getByRole("alert").filter({ hasText: "செல்லுபடியான" }).first(),
    ).toBeVisible();
    await button("English").click();
    await field("Email").fill("new.patient@example.com");
    await field("Phone Number").fill("077 123 4567");
    await field("Home Address").fill("34 New Road");
    const png = await sharp({
      create: { width: 80, height: 80, channels: 3, background: "#087cba" },
    })
      .png()
      .toBuffer();
    async function choosePhoto() {
      const chooser = page.waitForEvent("filechooser");
      await button("Upload Photo").click();
      await (
        await chooser
      ).setFiles({ name: "profile.png", mimeType: "image/png", buffer: png });
      await expect(button("Change Photo")).toBeVisible();
      await expect(field("Profile photo")).toBeVisible();
    }
    await choosePhoto();
    console.log("Selected photo");
    await button("Cancel edits").click();
    await expect(field("Full Name")).toHaveValue("Test Patient");
    await expect(field("Profile photo")).toHaveCount(0);
    assert.equal(saves, 0);
    await button("Edit Profile").click();
    await field("Full Name").fill("Updated Patient");
    await choosePhoto();
    failSave = true;
    await button("Save Changes").click();
    await expect(
      page.getByRole("alert").filter({ hasText: "already exist" }),
    ).toBeVisible();
    await expect(field("Full Name")).toHaveValue("Updated Patient");
    await expect(field("Profile photo")).toBeVisible();
    failSave = false;
    await button("Save Changes").click();
    await expect(
      page.getByText("Your profile has been updated.", { exact: true }),
    ).toBeVisible();
    assert.match(patient.profileImage, /^data:image\/png;base64,/);
    await button("Home").click();
    await expect(field("Profile photo")).toBeVisible();
    await button("Profile").click();
    await expect(field("Full Name")).toHaveValue("Updated Patient");
    await button("Edit Profile").click();
    await button("Remove Photo").click();
    await button("Save Changes").click();
    await expect(
      page.getByText("Your profile has been updated.", { exact: true }),
    ).toBeVisible();
    assert.equal(patient.profileImage, null);
    assert.deepEqual(errors, []);
    console.log(
      "PASS profile validation, translated errors, gallery selection/preview, cancel, failed-save recovery, persistence across navigation, home avatar and photo removal.",
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
