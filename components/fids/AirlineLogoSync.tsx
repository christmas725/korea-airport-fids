"use client";

import { useEffect } from "react";
import { officialAirlineLogo } from "@/lib/fids/officialAirlineLogos";

const AIRLINE_LOGO_BASE = "https://images.kiwi.com/airlines/64";

function normalizedFlightId(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

function airlineCode(flightId: string) {
  return normalizedFlightId(flightId).match(/^([A-Z0-9]{2})/)?.[1] ?? "";
}

function createImageForFallback(cell: HTMLElement, code: string) {
  const carrierMark = cell.querySelector<HTMLElement>(".carrier-mark");
  if (carrierMark) {
    const frame = document.createElement("span");
    frame.className = "carrier-logo-shell";
    frame.setAttribute("aria-hidden", "true");
    frame.dataset.airlineCode = code;

    const image = document.createElement("img");
    image.className = "carrier-logo-img";
    image.alt = "";
    image.loading = "eager";
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";
    image.dataset.airlineCode = code;

    frame.appendChild(image);
    carrierMark.replaceWith(frame);
    return image;
  }

  const logoFallback = cell.querySelector<HTMLElement>(".logo-fallback");
  if (logoFallback) {
    const image = document.createElement("img");
    image.alt = "";
    image.loading = "eager";
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";
    image.dataset.airlineCode = code;
    logoFallback.replaceWith(image);
    return image;
  }

  return null;
}

export default function AirlineLogoSync() {
  useEffect(() => {
    let applying = false;

    const syncLogos = () => {
      if (applying) return;
      applying = true;

      document.querySelectorAll<HTMLElement>(".flight-cell").forEach((cell) => {
        const flightId = cell.querySelector<HTMLElement>(".flight-copy strong")?.textContent ?? "";
        const code = airlineCode(flightId);
        if (!code) return;

        let image = cell.querySelector<HTMLImageElement>("img");
        if (!image) image = createImageForFallback(cell, code);
        if (!image) return;

        const official = officialAirlineLogo(code);
        const desiredUrl = official?.url ?? `${AIRLINE_LOGO_BASE}/${encodeURIComponent(code)}.png`;
        const sourceKey = official ? `official:${code}` : `fallback:${code}`;
        const frame = image.closest<HTMLElement>(".carrier-logo-shell");

        image.dataset.airlineCode = code;
        cell.dataset.airlineCode = code;
        if (frame) frame.dataset.airlineCode = code;

        if (image.dataset.logoSource !== sourceKey || image.src !== desiredUrl) {
          image.src = desiredUrl;
          image.dataset.logoSource = sourceKey;
          if (official) image.dataset.logoOfficialSource = official.source;
          else delete image.dataset.logoOfficialSource;
        }
      });

      applying = false;
    };

    syncLogos();

    const observer = new MutationObserver(() => {
      if (!applying) queueMicrotask(syncLogos);
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["src"],
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
