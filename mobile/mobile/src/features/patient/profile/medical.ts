export const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export function measurement(value: string, min: number, max: number) {
  const text = value.trim().replace(",", ".");
  if (!text) return null;
  if (!/^\d+(?:\.\d+)?$/.test(text)) return NaN;
  const number = Number(text);
  return Number.isFinite(number) && number >= min && number <= max
    ? number
    : NaN;
}

// CDC adult categories apply at age 20+. Classify the unrounded BMI.
// https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html
export function bmiResult(
  height: number | null,
  weight: number | null,
  birthDate: string,
  today = new Date(),
) {
  if (
    height == null ||
    weight == null ||
    !Number.isFinite(height) ||
    !Number.isFinite(weight) ||
    height < 30 ||
    height > 300 ||
    weight < 1 ||
    weight > 700
  )
    return null;
  const value = weight / (height / 100) ** 2;
  const localDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(today);
  const age =
    Number(localDate.slice(0, 4)) -
    Number(birthDate.slice(0, 4)) -
    (localDate.slice(5) < birthDate.slice(5) ? 1 : 0);
  const category =
    !/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || age < 20
      ? "Age-specific assessment needed"
      : value < 18.5
        ? "Underweight"
        : value < 25
          ? "Healthy weight"
          : value < 30
            ? "Overweight"
            : "Obesity range";
  return { value, category };
}
