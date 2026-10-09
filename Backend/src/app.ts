import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { ZodError } from "zod";
import { authRoutes } from "./patient/auth/auth.routes.js";
import { authenticate } from "./patient/auth/auth.middleware.js";
import { profileRoutes } from "./patient/profile/profile.routes.js";
import { bookingRoutes } from "./patient/booking/booking.routes.js";
import { ApiError } from "./patient/shared/errors.js";
import { doctorRoutes } from "./doctor/doctor.routes.js";
import { adminRoutes } from "./admin/admin.routes.js";
// Government OPD: payment modules preserved but disabled.
// import { adminPaymentRoutes } from "./admin/payments.routes.js";
// import { paymentRoutes } from "./patient/payments/payment.routes.js";
import { nurseAuthRoutes } from "./nurse/auth/auth.routes.js";
import { authenticateNurse } from "./nurse/auth/auth.middleware.js";
import { nurseRoutes } from "./nurse/nurse.routes.js";
import { notificationRoutes } from "./patient/notifications/notification.routes.js";
export const app = express();
app.disable("x-powered-by");
app.use(helmet());
const configuredOrigins = (process.env.CORS_ORIGINS || "http://localhost:8081")
  .split(",")
  .map((s) => s.trim());
const allowedOrigins = Array.from(
  new Set([...configuredOrigins, "http://localhost:3001", "http://127.0.0.1:3001"]),
);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use(
  "/api",
  rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "careplus-patient-api" });
});
// Only authenticated profile uploads accept a larger JSON body (base64 photo).
app.use("/api/patient/profile", authenticate, express.json({ limit: "7mb" }), profileRoutes);
app.use(express.json({ limit: "32kb" }));
app.use(
  "/api/patient/auth",
  rateLimit({
    windowMs: 15 * 60_000,
    limit: 30,
    skip: () => process.env.NODE_ENV === "test",
    message: { message: "Too many attempts. Please try again in 15 minutes." },
  }),
  authRoutes,
);
app.use("/api/patient/booking", authenticate, bookingRoutes);
app.use("/api/patient/notifications", authenticate, notificationRoutes);
// app.use("/api/patient/payments", authenticate, paymentRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/admin", adminRoutes);
// app.use("/api/admin", adminPaymentRoutes);
app.use(
  "/api/nurse/auth",
  rateLimit({
    windowMs: 15 * 60_000,
    limit: 30,
    skip: () => process.env.NODE_ENV === "test",
    message: { message: "Too many attempts. Please try again in 15 minutes." },
  }),
  nurseAuthRoutes,
);
app.use("/api/nurse", authenticateNurse, nurseRoutes);
app.use((_req, _res, next) => next(new ApiError(404, "Endpoint not found.")));
app.use(
  (
    error: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (error?.type === "entity.too.large") {
      res.status(413).json({ message: "The upload is too large. Choose a photo smaller than 5 MB." });
      return;
    }
    if (error instanceof ZodError) {
      res
        .status(400)
        .json({
          message: error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("\n"),
        });
      return;
    }
    if (error?.code === 11000) {
      res
        .status(409)
        .json({
          message:
            "These account details already exist, or the appointment slot has just been booked. Please check and try again.",
        });
      return;
    }
    const status =
      error instanceof ApiError
        ? error.status
        : error.status === 400
          ? 400
          : 500;
    if (status === 500) console.error("API error:", error.name);
    res
      .status(status)
      .json({
        message:
          status === 500
            ? "Something went wrong. Please try again."
            : error.message,
      });
  },
);
