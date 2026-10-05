import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Patient } from "./patient.model.js";
import { ApiError } from "../shared/errors.js";
declare global {
  namespace Express {
    interface Request {
      patient?: InstanceType<typeof Patient>;
    }
  }
}
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) throw new ApiError(401, "Please sign in to continue.");
    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET!, {
        algorithms: ["HS256"],
        issuer: "careplus",
        audience: "patient",
      }) as jwt.JwtPayload;
    } catch {
      throw new ApiError(
        401,
        "Your session has expired. Please sign in again.",
      );
    }
    const patient = await Patient.findById(payload.sub);
    if (!patient || patient.tokenVersion !== payload.version)
      throw new ApiError(401, "Please sign in again.");
    req.patient = patient;
    next();
  } catch (error) {
    next(error);
  }
}
