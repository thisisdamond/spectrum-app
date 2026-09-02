import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../services/tokens.js";
import { prisma } from "../db.js";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authorization = req.header("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    req.userId = await verifyAccessToken(authorization.slice(7));
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { status: true, deletedAt: true } });
  if (!user || user.deletedAt || ["SUSPENDED", "DELETED"].includes(user.status)) {
    res.status(403).json({ error: "Account unavailable" });
    return;
  }
  next();
}
