import { test } from "node:test";
import assert from "node:assert/strict";
import nodemailer from "nodemailer";
import {
  mailConfig,
  mailConfigured,
  mailDelivery,
  verifyMailConnection,
  mailErrorCode,
} from "../src/patient/notifications/mail.service.js";

test("EMAIL aliases work for verification and delivery; SMTP settings take precedence", async (t) => {
  const keys = [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASSWORD",
    "SMTP_FROM",
    "SMTP_SECURE",
    "EMAIL_HOST",
    "EMAIL_PORT",
    "EMAIL_USER",
    "EMAIL_PASSWORD",
    "EMAIL_FROM",
    "EMAIL_SECURE",
  ];
  const old = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const options: any[] = [];
  const messages: any[] = [];
  let closed = 0;
  const transport = t.mock.method(nodemailer, "createTransport", ((
    config: any,
  ) => {
    options.push(config);
    return {
      verify: async () => true,
      sendMail: async (mail: any) => {
        messages.push(mail);
        return { accepted: ["recipient@careplus.test"], rejected: [] };
      },
      close: () => {
        closed++;
      },
    };
  }) as any);
  try {
    keys.forEach((key) => delete process.env[key]);
    Object.assign(process.env, {
      EMAIL_HOST: "smtp.alias.test",
      EMAIL_USER: "user",
      EMAIL_PASSWORD: "test-password",
      SMTP_FROM: "sender@careplus.test",
      SMTP_PORT: "587",
      SMTP_SECURE: "false",
    });
    assert.equal(mailConfigured(), true);
    await verifyMailConnection();
    await mailDelivery.send({
      to: "recipient@careplus.test",
      subject: "Test",
      text: "Test only",
    });
    assert.equal(options[0].host, "smtp.alias.test");
    assert.equal(options[0].secure, false);
    assert.equal(options[0].requireTLS, true);
    assert.equal(options[0].auth.pass, "test-password");
    assert.equal(messages[0].from, "sender@careplus.test");
    assert.equal(closed, 2);
    process.env.SMTP_HOST = "smtp.primary.test";
    assert.equal(mailConfig().host, "smtp.primary.test");
    process.env.SMTP_HOST = " ";
    assert.equal(mailConfig().host, "smtp.alias.test");
    process.env.SMTP_SECURE = "true";
    await assert.rejects(verifyMailConnection(), /SMTP_SECURE=false/);
    process.env.SMTP_PORT = "465";
    await verifyMailConnection();
    assert.equal(options.at(-1).secure, true);
    assert.equal(
      mailErrorCode({ code: "EAUTH", response: "private" }),
      "EAUTH",
    );
    assert.equal(mailErrorCode({ code: "private details" }), "MAIL_ERROR");
  } finally {
    transport.mock.restore();
    for (const key of keys) {
      if (old[key] === undefined) delete process.env[key];
      else process.env[key] = old[key];
    }
  }
});
