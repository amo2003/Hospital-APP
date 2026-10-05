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
export const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin: (process.env.CORS_ORIGINS || "http://localhost:8081")
      .split(",")
      .map((s) => s.trim()),
  }),
);
app.use(express.json({ limit: "32kb" }));
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
app.use("/api/patient/profile", authenticate, profileRoutes);
app.use("/api/patient/booking", authenticate, bookingRoutes);
app.use((_req, _res, next) => next(new ApiError(404, "Endpoint not found.")));
app.use(
  (
    error: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
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
