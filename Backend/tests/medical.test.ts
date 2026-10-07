import { test } from "node:test";
import assert from "node:assert/strict";
import { bmiResult, measurement } from "../../mobile/mobile/src/features/patient/profile/medical.ts";
import { medicalSchema } from "../src/patient/profile/medical.validation.js";

test("BMI formula, category boundaries and age cutoff", () => {
  const now = new Date("2026-10-07T12:00:00+05:30");
  const result = bmiResult(170, 65, "1998-05-10", now)!;
  assert.ok(Math.abs(result.value - 22.49134948) < 0.00001);
  assert.equal(result.category, "Healthy weight");
  for (const [bmi, category] of [[18.49, "Underweight"], [18.5, "Healthy weight"], [24.99, "Healthy weight"], [25, "Overweight"], [29.99, "Overweight"], [30, "Obesity range"]] as const) {
    assert.equal(bmiResult(200, bmi * 4, "1998-05-10", now)?.category, category);
  }
  assert.equal(bmiResult(170, 65, "2006-10-08", now)?.category, "Age-specific assessment needed");
  assert.equal(bmiResult(170, 65, "2006-10-07", now)?.category, "Healthy weight");
  assert.equal(bmiResult(null, 65, "1998-05-10", now), null);
  assert.equal(bmiResult(0, 65, "1998-05-10", now), null);
  assert.equal(bmiResult(NaN, 65, "1998-05-10", now), null);
});

test("measurement input and medical payload validation reject invalid values", () => {
  assert.equal(measurement("", 30, 300), null);
  assert.equal(measurement("170,5", 30, 300), 170.5);
  for (const text of ["170cm", "-170", "1e2", "Infinity", "0", "301", "1.2.3"]) {
    assert.ok(Number.isNaN(measurement(text, 30, 300)));
  }
  const valid = { bloodGroup: "AB+", heightCm: 170.5, weightKg: 65.5 };
  assert.ok(medicalSchema.safeParse(valid).success);
  for (const change of [{ bloodGroup: "X+" }, { heightCm: "170" }, { weightKg: Infinity }, { heightCm: 0 }, { weightKg: -1 }, { bmi: 22 }]) {
    assert.equal(medicalSchema.safeParse({ ...valid, ...change }).success, false);
  }
  assert.ok(medicalSchema.safeParse({ bloodGroup: null, heightCm: null, weightKg: null }).success);
});
