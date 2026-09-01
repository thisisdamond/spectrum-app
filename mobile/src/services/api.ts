import * as SecureStore from "expo-secure-store";
import type { Session, SpectrumUser } from "../types";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";
const accessKey = "spectrum.accessToken";
const refreshKey = "spectrum.refreshToken";
const userKey = "spectrum.user";

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly issues?: unknown) {
    super(message);
  }
}

export async function saveSession(session: Session) {
  await Promise.all([
    SecureStore.setItemAsync(accessKey, session.accessToken),
    SecureStore.setItemAsync(refreshKey, session.refreshToken),
    SecureStore.setItemAsync(userKey, JSON.stringify(session.user)),
  ]);
}

export async function clearSession() {
  await Promise.all([SecureStore.deleteItemAsync(accessKey), SecureStore.deleteItemAsync(refreshKey), SecureStore.deleteItemAsync(userKey)]);
}

export async function getStoredUser(): Promise<SpectrumUser | null> {
  const value = await SecureStore.getItemAsync(userKey);
  if (!value) return null;
  try { return JSON.parse(value) as SpectrumUser; } catch { return null; }
}

async function refreshAccessToken() {
  const refreshToken = await SecureStore.getItemAsync(refreshKey);
  if (!refreshToken) return false;
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) { await clearSession(); return false; }
  const tokens = await response.json() as { accessToken: string; refreshToken: string };
  await Promise.all([SecureStore.setItemAsync(accessKey, tokens.accessToken), SecureStore.setItemAsync(refreshKey, tokens.refreshToken)]);
  return true;
}

async function parse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => ({ error: "Request failed" }));
  if (!response.ok) throw new ApiError(body.error ?? "Request failed", response.status, body.issues);
  return body as T;
}

async function request<T>(path: string, init: RequestInit, retry: boolean): Promise<T> {
  const token = await SecureStore.getItemAsync(accessKey);
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body && typeof init.body === "string" ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (response.status === 401 && retry && !path.startsWith("/auth/")) {
    if (await refreshAccessToken()) return request<T>(path, init, false);
  }
  return parse<T>(response);
}

export function api<T>(path: string, init: RequestInit = {}) {
  return request<T>(path, init, true);
}

export async function uploadPhotoBinary(uploadUrl: string, uri: string, mimeType: string) {
  const source = await fetch(uri);
  const blob = await source.blob();
  const token = uploadUrl.startsWith(API_URL) ? await SecureStore.getItemAsync(accessKey) : null;
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "content-type": mimeType, ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: blob,
  });
  if (!response.ok) throw new ApiError("Photo upload failed", response.status);
}
