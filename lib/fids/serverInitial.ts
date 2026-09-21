import "server-only";

import { headers } from "next/headers";

export async function fetchInitialJson<T>(
  path: string,
  timeoutMs = 8_000
): Promise<T | null> {
  try {
    const requestHeaders = await headers();
    const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
    if (!host) return null;

    const forwardedProto = requestHeaders.get("x-forwarded-proto");
    const protocol = forwardedProto ?? (host.startsWith("localhost") ? "http" : "https");
    const cookie = requestHeaders.get("cookie");

    const response = await fetch(`${protocol}://${host}${path}`, {
      cache: "no-store",
      headers: cookie ? { cookie } : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
