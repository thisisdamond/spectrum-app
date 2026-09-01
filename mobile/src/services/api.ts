import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await SecureStore.getItemAsync("spectrum.accessToken");
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(body.error ?? "Request failed");
  }
  return response.json() as Promise<T>;
}
