import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { DoctorAccount } from "./doctor.model.js";
import { ApiError } from "../patient/shared/errors.js";

declare global {
  namespace Express {
    interface Request {
      doctor?: InstanceType<typeof DoctorAccount>;
    }
  }
}

export async function authenticateDoctor(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) throw new ApiError(401, "Please sign in as a doctor to continue.");

    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET!, {
        algorithms: ["HS256"],
        issuer: "careplus",
        audience: "doctor",
      }) as jwt.JwtPayload;
    } catch {
      throw new ApiError(
        401,
        "Your doctor session has expired. Please sign in again.",
      );
    }

    if (payload.role !== "doctor") {
      throw new ApiError(403, "Access forbidden. Doctor role required.");
    }

    const doctor = await DoctorAccount.findById(payload.sub);
    if (!doctor || doctor.tokenVersion !== payload.version) {
      throw new ApiError(401, "Session invalidated. Please sign in again.");
    }

    if (doctor.status === "pending") {
      throw new ApiError(
        403,
        "Your doctor account is pending administrative approval.",
      );
    }

    if (doctor.status === "rejected") {
      throw new ApiError(
        403,
        "Your doctor registration has been rejected. Please contact administration.",
      );
    }

    if (doctor.status !== "approved") {
      throw new ApiError(403, "Your doctor account is not active.");
    }

    req.doctor = doctor;
    next();
  } catch (error) {
    next(error);
  }
}
