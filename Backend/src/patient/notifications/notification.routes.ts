import { Router } from "express";
import { z } from "zod";
import { Notification } from "./notification.model.js";
import { ApiError } from "../shared/errors.js";

export const notificationRoutes = Router();
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid notification ID.");

notificationRoutes.get("/", async (req, res) => {
  const notifications = await Notification.find({ patientId: req.patient!._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  res.json(notifications);
});

notificationRoutes.patch("/:id/read", async (req, res) => {
  const id = objectId.parse(req.params.id);
  const notification = await Notification.findOneAndUpdate(
    { _id: id, patientId: req.patient!._id },
    { $set: { read: true } },
    { new: true },
  ).lean();
  if (!notification) throw new ApiError(404, "Notification not found.");
  res.json(notification);
});

notificationRoutes.delete("/:id", async (req, res) => {
  const id = objectId.parse(req.params.id);
  const result = await Notification.deleteOne({
    _id: id,
    patientId: req.patient!._id,
  });
  if (!result.deletedCount) throw new ApiError(404, "Notification not found.");
  res.status(204).send();
});
