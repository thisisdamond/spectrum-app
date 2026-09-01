import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../services/tokens.js";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authorization = req.header("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    req.userId = await verifyAccessToken(authorization.slice(7));
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
