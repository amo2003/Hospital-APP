import nodemailer from "nodemailer";

export function mailConfig() {
  const host =
    process.env.SMTP_HOST?.trim() || process.env.EMAIL_HOST?.trim() || "";
  const user =
    process.env.SMTP_USER?.trim() || process.env.EMAIL_USER?.trim() || "";
  const password =
    process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD || "";
  const from =
    process.env.SMTP_FROM?.trim() || process.env.EMAIL_FROM?.trim() || "";
  const port = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587);
  const secureFlag = (process.env.SMTP_SECURE || process.env.EMAIL_SECURE)
    ?.trim()
    .toLowerCase();
  return {
    host,
    user,
    password,
    from,
    port,
    secure: secureFlag ? secureFlag === "true" : port === 465,
  };
}

export function mailConfigured() {
  const config = mailConfig();
  return [config.host, config.user, config.password, config.from].every(
    (value) => value.trim() && !/YOUR_|example\.com|REPLACE_/i.test(value),
  );
}

function createMailTransport() {
  if (!mailConfigured()) throw new Error("SMTP is not configured.");
  const config = mailConfig();
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535)
    throw new Error("SMTP_PORT must be a valid port number.");
  if (
    (config.port === 587 && config.secure) ||
    (config.port === 465 && !config.secure)
  )
    throw new Error(
      "Use SMTP_SECURE=false with port 587 or SMTP_SECURE=true with port 465.",
    );
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: !config.secure,
    auth: { user: config.user, pass: config.password },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 30000,
    dnsTimeout: 10000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
}

export async function verifyMailConnection() {
  const transport = createMailTransport();
  try {
    await transport.verify();
  } finally {
    transport.close();
  }
}

// Only fixed diagnostic codes are safe to log; provider responses may contain addresses.
export function mailErrorCode(error: unknown) {
  const code = (error as { code?: string })?.code;
  return [
    "EAUTH",
    "ECONNECTION",
    "ETIMEDOUT",
    "EDNS",
    "ESOCKET",
    "ETLS",
    "EENVELOPE",
    "EMESSAGE",
  ].includes(code || "")
    ? code!
    : "MAIL_ERROR";
}

export const mailDelivery = {
  async send(message: nodemailer.SendMailOptions): Promise<void> {
    const transport = createMailTransport();
    try {
      const result = await transport.sendMail({
        ...message,
        from: mailConfig().from,
      });
      if (!result.accepted?.length || result.rejected?.length)
        throw new Error("SMTP did not accept the recipient.");
    } finally {
      transport.close();
    }
  },
};
