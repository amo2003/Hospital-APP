import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../src/app.js";
import {
  registrationSchema,
  emailSchema,
  passwordSchema,
} from "../src/patient/auth/validation.js";
import {
  filterName,
  filterNic,
  registrationErrors,
  emailError,
  loginErrors,
  passwordError,
} from "../../mobile/mobile/src/features/patient/auth/validation.ts";
import { translations } from "../../mobile/mobile/src/features/patient/i18n/translations.ts";

const valid = {
  fullName: "Nimal Perera",
  nic: "199812345678",
  dateOfBirth: "1998-05-10",
  gender: "Male" as const,
  phone: "0771234567",
  email: "patient@example.com",
  address: "12 Main Street",
  district: "Colombo",
  username: "nimal_patient",
  password: "Password123!",
  acceptedTerms: true,
};

test("registration accepts formatted mobile numbers, multilingual names and leap-day births", () => {
  for (const patch of [
    {},
    { phone: "+94 (77) 123-4567" },
    { phone: "077 123 4567" },
    { email: " Patient+opd@Example.COM " },
    { fullName: "නිමල් පෙරේරා" },
    { fullName: "நிமல் குமார்" },
    { fullName: "Anne Marie Silva" },
    { nic: "901234567v" },
    { dateOfBirth: "2000-02-29" },
  ]) {
    const data = { ...valid, ...patch };
    assert.deepEqual(
      registrationErrors(data, data.password, true),
      {},
      JSON.stringify(patch),
    );
    assert.equal(
      registrationSchema.safeParse(data).success,
      true,
      JSON.stringify(patch),
    );
  }
  const normalized = registrationSchema.parse({
    ...valid,
    email: " Patient@Example.COM ",
    phone: "077 123 4567",
  });
  assert.equal(normalized.email, "patient@example.com");
  assert.equal(normalized.phone, "+94771234567");
});

test("frontend and backend reject invalid patient fields and have localized field errors", () => {
  const cases = {
    fullName: ["", "  ", "12345", "A", ". .", "Anne-Marie", "A".repeat(101)],
    nic: [
      "",
      "1234",
      "901234567Z",
      "901234567X",
      "N1234567",
      "V123456789",
      "12345678VV",
    ],
    dateOfBirth: ["", "2023-02-29", "2024-02-30", "1899-12-31", "2999-01-01"],
    phone: [
      "",
      "077123456",
      "07712345678",
      "0112345678",
      "+940771234567",
      "+447712345678",
      "077abc4567",
    ],
    email: [
      "",
      "person",
      "a@b",
      "a..b@example.com",
      ".a@example.com",
      "a@-example.com",
      "a b@example.com",
      "a@example..com",
      "a@example-.com",
      "a".repeat(65) + "@example.com",
    ],
    address: ["", "    ", "abc", "a".repeat(301)],
    district: ["", "Unknown"],
    username: ["ab", "name space", "user!", "a".repeat(31)],
    password: ["short1", "abcdefgh", "12345678", "A1" + "é".repeat(36)],
  };
  for (const [key, values] of Object.entries(cases)) {
    for (const value of values) {
      const data = { ...valid, [key]: value };
      const errors = registrationErrors(data, data.password, true);
      const message = errors[key as keyof typeof errors];
      assert.ok(message, `${key}: ${value}`);
      assert.equal(
        registrationSchema.safeParse(data).success,
        false,
        `${key}: ${value}`,
      );
      assert.ok(
        translations[message]?.every(Boolean),
        `Missing translation: ${message}`,
      );
    }
  }
  assert.ok(registrationErrors(valid, "different", false).confirm);
  assert.ok(registrationErrors(valid, valid.password, false).gender);
  assert.ok(
    registrationErrors({ ...valid, acceptedTerms: false }, valid.password, true)
      .acceptedTerms,
  );
});

test("password byte boundaries match bcrypt without changing login strength rules", () => {
  for (const password of [
    "A1" + "é".repeat(35),
    "A1" + "é".repeat(36),
    "A1" + "😀".repeat(18),
  ]) {
    assert.equal(
      !passwordError(password),
      passwordSchema.safeParse(password).success,
    );
  }
  assert.deepEqual(loginErrors("patient@example.com", "old"), {});
  assert.deepEqual(loginErrors("077 123 4567", "old"), {});
  assert.ok(loginErrors("patient@", "").identifier);
  assert.ok(loginErrors("patient@example.com", "").password);
  assert.ok(loginErrors("077123", "old").identifier);
  assert.equal(
    !emailError(" patient+opd@example.com "),
    emailSchema.safeParse(" patient+opd@example.com ").success,
  );
});

test("API rejects invalid registration, login and reset email before accessing the database", async () => {
  process.env.NODE_ENV = "test";
  for (const patch of [
    { email: "a..b@example.com" },
    { phone: "0112345678" },
    { district: "Unknown" },
    { password: "A1" + "é".repeat(36) },
  ]) {
    await request(app)
      .post("/api/patient/auth/register")
      .send({ ...valid, ...patch })
      .expect(400);
  }
  await request(app)
    .post("/api/patient/auth/login")
    .send({ identifier: "bad@email", password: "old" })
    .expect(400);
  await request(app)
    .post("/api/patient/auth/login")
    .send({ identifier: "07712", password: "old" })
    .expect(400);
  await request(app)
    .post("/api/patient/auth/forgot-password")
    .send({ email: "bad@email" })
    .expect(400);
});

test("input filters block numbers in names and all NIC letters except V, including pasted text", () => {
  assert.equal(filterName("Nimal123 Perera@!"), "Nimal Perera");
  assert.equal(filterName("නිමල්123 පෙරේරා"), "නිමල් පෙරේරා");
  assert.equal(filterName("நிமல்42 குமார்"), "நிமல் குமார்");
  assert.equal(filterNic("901234567v"), "901234567V");
  assert.equal(filterNic("AB901234567xV!?"), "901234567V");
  assert.equal(filterNic("199812345678999"), "199812345678");
});
