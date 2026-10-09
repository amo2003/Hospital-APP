import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Admin } from "./admin.model.js";
import { ApiError } from "../patient/shared/errors.js";

declare global {
  namespace Express {
    interface Request {
      admin?: InstanceType<typeof Admin>;
    }
  }
}

export async function authenticateAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) throw new ApiError(401, "Please sign in as administrator.");

    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET!, {
        algorithms: ["HS256"],
        issuer: "careplus",
        audience: "admin",
      }) as jwt.JwtPayload;
    } catch {
      throw new ApiError(
        401,
        "Your admin session has expired. Please sign in again.",
      );
    }

    if (payload.role !== "admin") {
      throw new ApiError(403, "Access forbidden. Administrator role required.");
    }

    const admin = await Admin.findById(payload.sub);
    if (!admin || admin.tokenVersion !== payload.version) {
      throw new ApiError(401, "Admin session invalidated. Please sign in again.");
    }

    req.admin = admin;
    next();
  } catch (error) {
    next(error);
  }
}
