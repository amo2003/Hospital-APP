import { randomUUID } from "node:crypto";
import { Patient } from "../auth/patient.model.js";
import { mailConfigured, mailDelivery, mailErrorCode } from "./mail.service.js";
import { welcomeEmail } from "./welcome-email.js";

const maxAttempts = 5;
const leaseMs = 2 * 60_000;

// The queue lives on the patient record: registration and queuing are one atomic insert.
export async function deliverNextWelcomeEmail(
  now = new Date(),
  patientId?: string,
): Promise<boolean> {
  if (!mailConfigured()) return false;
  const claimId = randomUUID();
  const patient = await Patient.findOneAndUpdate(
    {
      ...(patientId ? { _id: patientId } : {}),
      "welcomeEmail.attempts": { $lt: maxAttempts },
      $or: [
        {
          "welcomeEmail.status": "pending",
          "welcomeEmail.nextAttemptAt": { $lte: now },
        },
        {
          "welcomeEmail.status": "sending",
          "welcomeEmail.lockedUntil": { $lte: now },
        },
      ],
    },
    {
      $set: {
        "welcomeEmail.status": "sending",
        "welcomeEmail.claimId": claimId,
        "welcomeEmail.lockedUntil": new Date(now.getTime() + leaseMs),
      },
    },
    { returnDocument: "after", sort: { "welcomeEmail.nextAttemptAt": 1 } },
  ).select("+welcomeEmail");
  if (!patient) return false;
  const claim = { _id: patient._id, "welcomeEmail.claimId": claimId };
  const attempts = patient.welcomeEmail!.attempts + 1;
  try {
    await mailDelivery.send({
      ...welcomeEmail(patient),
      // Stable across retries; SMTP can still duplicate delivery after a process crash.
      messageId: `<welcome-${patient._id}@careplus.patient>`,
    });
  } catch (error) {
    await Patient.updateOne(claim, {
      $set: {
        "welcomeEmail.status": attempts >= maxAttempts ? "failed" : "pending",
        "welcomeEmail.attempts": attempts,
        "welcomeEmail.nextAttemptAt": new Date(
          now.getTime() + 60_000 * 2 ** (attempts - 1),
        ),
      },
      $unset: { "welcomeEmail.claimId": 1, "welcomeEmail.lockedUntil": 1 },
    });
    // Never log SMTP responses, credentials, recipient addresses or email contents.
    console.warn(
      `Welcome email attempt ${attempts}/${maxAttempts} failed (${mailErrorCode(error)})${attempts >= maxAttempts ? "; check SMTP configuration" : "; retry scheduled"}.`,
    );
    return true;
  }
  await Patient.updateOne(claim, {
    $set: {
      "welcomeEmail.status": "sent",
      "welcomeEmail.attempts": attempts,
      "welcomeEmail.sentAt": new Date(),
    },
    $unset: { "welcomeEmail.claimId": 1, "welcomeEmail.lockedUntil": 1 },
  });
  return true;
}

export function startWelcomeEmailWorker() {
  let stopping = false;
  let inFlight: Promise<void> | undefined;
  if (!mailConfigured())
    console.warn(
      "Welcome emails are queued. Configure SMTP_HOST, SMTP_USER, SMTP_PASSWORD and SMTP_FROM in Backend/.env, then restart.",
    );
  function tick() {
    if (stopping || inFlight) return;
    inFlight = (async () => {
      // Drain a bounded batch without overlapping this process's SMTP attempts.
      for (let i = 0; i < 10 && !stopping; i++) {
        if (!(await deliverNextWelcomeEmail())) break;
      }
    })()
      .catch(() => {
        console.warn(
          "Welcome email queue could not be processed; it will be retried.",
        );
      })
      .finally(() => {
        inFlight = undefined;
      });
  }
  const timer = setInterval(tick, 5000);
  timer.unref();
  tick();
  return async () => {
    stopping = true;
    clearInterval(timer);
    await inFlight;
  };
}
