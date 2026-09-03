"use client";

import { useEffect, useState } from "react";
import { DEFAULT_FIDS_ROWS, rowsForViewport } from "@/lib/fids/layout";

function readRowsPerPage() {
  if (typeof window === "undefined") return DEFAULT_FIDS_ROWS;

  return rowsForViewport({
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
    maxTouchPoints: navigator.maxTouchPoints || 0,
  });
}

export function useRowsPerPage() {
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_FIDS_ROWS);

  useEffect(() => {
    const update = () => setRowsPerPage(readRowsPerPage());
    const pointerQuery = window.matchMedia("(pointer: coarse)");
    const orientationQuery = window.matchMedia("(orientation: portrait)");

    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    pointerQuery.addEventListener?.("change", update);
    orientationQuery.addEventListener?.("change", update);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      pointerQuery.removeEventListener?.("change", update);
      orientationQuery.removeEventListener?.("change", update);
    };
  }, []);

  return rowsPerPage;
}
