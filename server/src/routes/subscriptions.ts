import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

export const subscriptionsRouter = Router();
subscriptionsRouter.use(requireAuth);

subscriptionsRouter.get("/status", async (req, res) => {
  const subscription = await prisma.subscription.findUnique({ where: { userId: req.userId } });
  res.json({ subscription });
});

subscriptionsRouter.post("/verify", (_req, res) => {
  res.status(501).json({ error: "RevenueCat receipt verification arrives in Phase 5" });
});
