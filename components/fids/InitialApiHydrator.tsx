"use client";

import { useLayoutEffect, type ReactNode } from "react";

type InitialApiHydratorProps = {
  requestPath: string;
  payload: unknown;
  children: ReactNode;
};

export default function InitialApiHydrator({
  requestPath,
  payload,
  children,
}: InitialApiHydratorProps) {
  useLayoutEffect(() => {
    if (payload == null) return;

    const originalFetch = window.fetch.bind(window);
    let consumed = false;

    const patchedFetch: typeof window.fetch = async (input, init) => {
      const inputUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      const actual = new URL(inputUrl, window.location.origin);
      const expected = new URL(requestPath, window.location.origin);

      if (
        !consumed &&
        actual.origin === expected.origin &&
        actual.pathname === expected.pathname &&
        actual.search === expected.search
      ) {
        consumed = true;
        queueMicrotask(() => {
          if (window.fetch === patchedFetch) window.fetch = originalFetch;
        });

        return new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "content-type": "application/json; charset=utf-8" },
        });
      }

      return originalFetch(input, init);
    };

    window.fetch = patchedFetch;

    return () => {
      if (window.fetch === patchedFetch) window.fetch = originalFetch;
    };
  }, [payload, requestPath]);

  return children;
}
