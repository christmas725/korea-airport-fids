"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { officialAirlineLogo } from "@/lib/fids/officialAirlineLogos";

const AIRLINE_LOGO_BASE = "https://images.kiwi.com/airlines/64";

function airlineCode(flightId: string) {
  return flightId.replace(/\s+/g, "").trim().toUpperCase().match(/^([A-Z0-9]{2})/)?.[1] ?? "--";
}

const AirlineLogo = memo(function AirlineLogo({ flightId }: { flightId: string }) {
  const code = useMemo(() => airlineCode(flightId), [flightId]);
  const official = useMemo(() => officialAirlineLogo(code), [code]);
  const [fallbackStage, setFallbackStage] = useState(0);

  useEffect(() => {
    setFallbackStage(0);
  }, [code, official?.url]);

  if (code === "--" || fallbackStage >= 2) {
    return <span className="carrier-mark logo-fallback" aria-hidden="true">{code}</span>;
  }

  const useOfficial = Boolean(official) && fallbackStage === 0;
  const src = useOfficial
    ? official!.url
    : `${AIRLINE_LOGO_BASE}/${encodeURIComponent(code)}.png`;

  return (
    <span
      className="carrier-logo-shell"
      aria-hidden="true"
      data-airline-code={code}
      data-logo-source={useOfficial ? `official:${code}` : `fallback:${code}`}
      data-logo-official-source={useOfficial ? official?.source : undefined}
    >
      <img
        className="carrier-logo-img"
        src={src}
        alt=""
        loading="eager"
        decoding="async"
        referrerPolicy="no-referrer"
        data-airline-code={code}
        data-logo-source={useOfficial ? `official:${code}` : `fallback:${code}`}
        onError={() => setFallbackStage((stage) => Math.min(2, stage + 1))}
      />
    </span>
  );
});

export default AirlineLogo;
