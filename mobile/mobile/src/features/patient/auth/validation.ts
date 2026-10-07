import type { Registration } from "../shared/types";

export const districts = [
  "Ampara",
  "Anuradhapura",
  "Badulla",
  "Batticaloa",
  "Colombo",
  "Galle",
  "Gampaha",
  "Hambantota",
  "Jaffna",
  "Kalutara",
  "Kandy",
  "Kegalle",
  "Kilinochchi",
  "Kurunegala",
  "Mannar",
  "Matale",
  "Matara",
  "Monaragala",
  "Mullaitivu",
  "Nuwara Eliya",
  "Polonnaruwa",
  "Puttalam",
  "Ratnapura",
  "Trincomalee",
  "Vavuniya",
];

// Keep these input rules aligned with Backend/src/patient/auth/validation.ts.
export const emailPattern =
  /^(?!\.)(?!.*\.\.)(?=.{1,64}@)([A-Z0-9_'+\-.]*)[A-Z0-9_+-]@([A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,}$/i;
export const namePattern = /^[\p{L}\p{M} \u200c\u200d]+$/u;
export const filterName = (value: string) =>
  value.replace(/[^\p{L}\p{M} \u200c\u200d]/gu, "");
export const filterNic = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^0-9V]/g, "")
    .slice(0, 12);
export const normalizePhone = (value: string) => {
  const phone = value.replace(/[\s()-]/g, "");
  return phone.startsWith("0") ? `+94${phone.slice(1)}` : phone;
};
export function emailError(value: string) {
  const email = value.trim();
  return email.length <= 254 && emailPattern.test(email)
    ? ""
    : "Enter a valid email address, such as name@example.com.";
}
export function passwordError(value: string) {
  // bcrypt uses at most 72 UTF-8 bytes, not 72 Unicode characters.
  const bytes = Array.from(value).reduce((total, char) => {
    const point = char.codePointAt(0)!;
    return (
      total + (point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4)
    );
  }, 0);
  if (bytes > 72) return "Password is too long. Use at most 72 UTF-8 bytes.";
  return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value)
    ? ""
    : "Use at least 8 characters, including a letter and a number.";
}
export function parseBirthDate(value: string) {
  const parts = value.trim().split(/[\/\s-]+/);
  return parts.length === 3 && parts[0].length !== 4
    ? `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`
    : value.trim();
}
export function validBirthDate(value: string) {
  const date = new Date(value);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
  }).format(new Date());
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    value >= "1900-01-01" &&
    value <= today
  );
}
export type RegistrationErrors = Partial<
  Record<keyof Registration | "confirm", string>
>;
export function personalErrors(
  data: Pick<
    Registration,
    | "fullName"
    | "nic"
    | "dateOfBirth"
    | "gender"
    | "phone"
    | "email"
    | "address"
    | "district"
  >,
  genderChosen = ["Male", "Female", "Other"].includes(data.gender),
): RegistrationErrors {
  const errors: RegistrationErrors = {};
  if (
    data.fullName.trim().length < 2 ||
    data.fullName.trim().length > 100 ||
    !namePattern.test(data.fullName.trim()) ||
    !/\p{L}/u.test(data.fullName)
  )
    errors.fullName =
      "Enter a name of 2–100 characters using letters and spaces only.";
  if (!/^(\d{9}V|\d{12})$/i.test(data.nic.trim()))
    errors.nic = "Enter 12 digits or 9 digits followed by V.";
  if (!validBirthDate(parseBirthDate(data.dateOfBirth)))
    errors.dateOfBirth = "Choose a valid birth date from 1900 to today.";
  if (!genderChosen) errors.gender = "Select your gender.";
  if (!/^\+947\d{8}$/.test(normalizePhone(data.phone)))
    errors.phone = "Enter a valid mobile number: 0771234567 or +94771234567.";
  if (emailError(data.email)) errors.email = emailError(data.email);
  if (data.address.trim().length < 5 || data.address.trim().length > 300)
    errors.address = "Enter a home address of 5–300 characters.";
  if (!districts.includes(data.district))
    errors.district = "Select your district.";
  return errors;
}
export function registrationErrors(
  data: Registration,
  confirm: string,
  genderChosen: boolean,
): RegistrationErrors {
  const errors = personalErrors(data, genderChosen);
  if (!/^[a-z0-9_]{3,30}$/i.test(data.username.trim()))
    errors.username =
      "Use 3–30 letters, numbers or underscores for your username.";
  if (passwordError(data.password))
    errors.password = passwordError(data.password);
  if (!confirm) errors.confirm = "Confirm your password.";
  else if (data.password !== confirm)
    errors.confirm = "Passwords do not match.";
  if (!data.acceptedTerms)
    errors.acceptedTerms =
      "Please read and accept the Terms of Service and Privacy Policy.";
  return errors;
}
export const registrationSteps: (keyof RegistrationErrors)[][] = [
  ["fullName", "nic", "dateOfBirth", "gender"],
  ["phone", "email", "address", "district"],
  ["username", "password", "confirm", "acceptedTerms"],
];
export function loginErrors(identifier: string, password: string) {
  const errors: { identifier?: string; password?: string } = {};
  const value = identifier.trim();
  if (value.includes("@")) {
    if (emailError(value)) errors.identifier = emailError(value);
  } else if (!/^(0\d{9}|\+94\d{9})$/.test(value.replace(/[\s()-]/g, ""))) {
    errors.identifier = "Enter a valid email address phone number.";
  }
  // Login must still accept existing passwords; strength rules apply only on creation/reset.
  if (!password) errors.password = "Enter your password.";
  else if (password.length > 72)
    errors.password = "Password is too long. Use at most 72 UTF-8 bytes.";
  return errors;
}
