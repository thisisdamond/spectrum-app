import { env } from "../config/env.js";
import { HttpError } from "../lib/httpError.js";

type AuthEmail = {
  email: string;
  kind: "verify-email" | "reset-password";
  token: string;
};

export async function deliverAuthEmail(input: AuthEmail) {
  const url = `${env.APP_BASE_URL.replace(/\/$/, "")}/${input.kind}?token=${encodeURIComponent(input.token)}`;

  if (env.EMAIL_WEBHOOK_URL) {
    const response = await fetch(env.EMAIL_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(env.EMAIL_WEBHOOK_SECRET ? { authorization: `Bearer ${env.EMAIL_WEBHOOK_SECRET}` } : {}),
      },
      body: JSON.stringify({ to: input.email, template: input.kind, actionUrl: url }),
    });
    if (!response.ok) throw new HttpError(503, "Email delivery is temporarily unavailable");
  } else if (env.NODE_ENV === "production") {
    throw new HttpError(503, "Email delivery is not configured");
  }

  return env.NODE_ENV === "production" ? undefined : url;
}
