export type WelcomePatient = {
  patientId: string;
  fullName: string;
  username: string;
  email: string;
  phone: string;
};

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char]!,
  );
}

function appLink() {
  if (!process.env.PATIENT_APP_URL) return undefined;
  try {
    const url = new URL(process.env.PATIENT_APP_URL);
    if (url.protocol !== "https:" || url.username || url.password)
      return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

export function welcomeEmail(patient: WelcomePatient) {
  const details = [
    ["Patient ID", patient.patientId],
    ["Full name", patient.fullName],
    ["Username", patient.username],
    ["Registered email", patient.email],
    ["Mobile number", `••••••${patient.phone.slice(-4)}`],
    ["Account status", "Active"],
  ];
  const link = appLink();
  const steps = [
    "Open the CarePlus app and sign in with your email or mobile number and password. If you registered with Google, you can also use Continue with Google.",
    "Choose Book Appointment, select your hospital, department, doctor, date and available time.",
    "View your bookings in Appointments and update your details in Profile.",
  ];
  return {
    to: { name: patient.fullName, address: patient.email },
    subject: "Welcome to CarePlus — your patient account is ready",
    text: [
      `Hello ${patient.fullName},`,
      "Welcome to CarePlus Hospital! Your patient account has been created successfully.",
      details.map(([label, value]) => `${label}: ${value}`).join("\n"),
      "What you can do next:",
      steps.map((step, index) => `${index + 1}. ${step}`).join("\n"),
      ...(link ? [`Open CarePlus: ${link}`] : []),
      "Keep your patient ID for reference. For your privacy, this email does not contain your password, NIC, date of birth, home address or medical information.",
      "If you did not create this account, contact the hospital reception. Do not share your password or reset codes with anyone.",
      "CarePlus Hospital | Your Health, Our Priority",
    ].join("\n\n"),
    html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:24px 12px;background:#edf7ff;font-family:Arial,sans-serif;color:#142b49">
<table role="presentation" style="width:100%;max-width:600px;margin:auto;border-collapse:collapse;background:#fff;border:1px solid #cfe2f7">
<tr><td style="padding:28px;background:#103b66;color:white"><h1 style="margin:0;font-size:25px">CarePlus Hospital</h1><p style="margin:8px 0 0">Your Health, Our Priority</p></td></tr>
<tr><td style="padding:28px"><h2 style="color:#086ab9;margin-top:0">Your patient account is ready!</h2>
<p>Hello ${escapeHtml(patient.fullName)},</p><p>Welcome to CarePlus. Your account has been created successfully.</p>
<table style="width:100%;border-collapse:collapse;table-layout:fixed">${details.map(([label, value]) => `<tr><th scope="row" style="text-align:left;width:38%;padding:12px 8px;border-bottom:1px solid #e1ecf5;font-weight:normal;color:#526883">${label}</th><td style="padding:12px 8px;border-bottom:1px solid #e1ecf5;overflow-wrap:anywhere;word-break:break-word">${escapeHtml(value)}</td></tr>`).join("")}</table>
<h3 style="margin-top:28px">What you can do next</h3><ol style="padding-left:22px;line-height:1.6">${steps.map((step) => `<li style="margin-bottom:10px">${step}</li>`).join("")}</ol>
${link ? `<p style="margin:24px 0"><a href="${escapeHtml(link)}" style="display:inline-block;padding:14px 24px;background:#086ab9;color:#fff;text-decoration:none;border-radius:8px">Open CarePlus</a></p>` : ""}
<p style="font-size:13px;line-height:1.6;color:#526883">Keep your patient ID for reference. For your privacy, this email does not contain your password, NIC, date of birth, home address or medical information.</p>
<p style="font-size:13px;line-height:1.6;color:#526883">If you did not create this account, contact the hospital reception. Do not share your password or reset codes with anyone.</p>
</td></tr></table></body></html>`,
  };
}
