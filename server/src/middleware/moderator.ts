import type { RequestHandler } from "express";
import { prisma } from "../db.js";

export const requireModerator: RequestHandler = async (req, res, next) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { role: true, status: true } });
  if (!user || user.status !== "ACTIVE" || !["MODERATOR", "ADMIN"].includes(user.role)) {
    res.status(403).json({ error: "Moderator access required" });
    return;
  }
  next();
};
