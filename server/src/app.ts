import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error.js";
import { authRouter } from "./routes/auth.js";
import { discoveryRouter } from "./routes/discovery.js";
import { matchesRouter } from "./routes/matches.js";
import { messagesRouter } from "./routes/messages.js";
import { profileRouter } from "./routes/profile.js";
import { safetyRouter } from "./routes/safety.js";
import { settingsRouter } from "./routes/settings.js";
import { subscriptionsRouter } from "./routes/subscriptions.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN.split(",").map((item) => item.trim()), credentials: false }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ status: "ok", service: "spectrum-api" }));
app.use("/auth", authRouter);
app.use("/profile", profileRouter);
app.use("/discovery", discoveryRouter);
app.use("/matches", matchesRouter);
app.use("/messages", messagesRouter);
app.use("/safety", safetyRouter);
app.use("/settings", settingsRouter);
app.use("/subscriptions", subscriptionsRouter);

app.use((_req, res) => res.status(404).json({ error: "Route not found" }));
app.use(errorHandler);
