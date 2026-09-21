"use client";

import { useEffect } from "react";

const AIRLINE_LOGO_BASE = "https://images.kiwi.com/airlines/64";
const TRINITY_LOGO_URL = "https://otp.twayair.com/images/trinity.svg";

function normalizedFlightId(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

function airlineCode(flightId: string) {
  return normalizedFlightId(flightId).match(/^([A-Z0-9]{2})/)?.[1] ?? "";
}

export default function KacAirlineLogoSync() {
  useEffect(() => {
    let applying = false;

    const syncLogos = () => {
      if (applying) return;
      applying = true;

      document.querySelectorAll<HTMLElement>(".flight-cell").forEach((cell) => {
        const flightId = cell.querySelector<HTMLElement>(".flight-copy strong")?.textContent ?? "";
        const code = airlineCode(flightId);
        const image = cell.querySelector<HTMLImageElement>("img");
        if (!code || !image) return;

        if (code === "TW") {
          if (image.src !== TRINITY_LOGO_URL) image.src = TRINITY_LOGO_URL;
          image.dataset.logoSource = "trinity";
          return;
        }

        if (image.dataset.logoSource === "trinity") {
          image.src = `${AIRLINE_LOGO_BASE}/${code}.png`;
          delete image.dataset.logoSource;
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
