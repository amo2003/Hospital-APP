import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Nurse } from "./nurse.model.js";
import { ApiError } from "../../patient/shared/errors.js";

declare global {
  namespace Express {
    interface Request {
      nurse?: InstanceType<typeof Nurse>;
    }
  }
}

export async function authenticateNurse(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) throw new ApiError(401, "Please sign in to continue.");
    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET!, {
        algorithms: ["HS256"], issuer: "careplus", audience: "nurse",
      }) as jwt.JwtPayload;
    } catch {
      throw new ApiError(401, "Your nurse session has expired. Please sign in again.");
    }
    const nurse = await Nurse.findById(payload.sub);
    if (!nurse || nurse.status !== "active" || nurse.tokenVersion !== payload.version)
      throw new ApiError(401, "This nurse account is inactive or the session has expired.");
    req.nurse = nurse;
    next();
  } catch (error) {
    next(error);
  }
}
