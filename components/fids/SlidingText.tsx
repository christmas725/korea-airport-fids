"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

type SlidingTextProps = {
  text: string;
  direction?: "ltr" | "rtl";
  className?: string;
};

type SlidingStyle = CSSProperties & { "--destination-shift"?: string };

export default function SlidingText({
  text,
  direction = "ltr",
  className = "",
}: SlidingTextProps) {
  const viewportRef = useRef<HTMLSpanElement>(null);
  const trackRef = useRef<HTMLSpanElement>(null);
  const [shift, setShift] = useState(0);

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    const measure = () => {
      const overflow = Math.max(0, track.scrollWidth - viewport.clientWidth);
      setShift(overflow > 2 ? overflow : 0);
    };

    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(track);
    return () => observer.disconnect();
  }, [text]);

  const style: SlidingStyle = {
    "--destination-shift": `${direction === "rtl" ? shift : -shift}px`,
  };

  return (
    <span
      ref={viewportRef}
      className={`sliding-text ${shift ? "is-overflowing" : ""} ${className}`.trim()}
      dir={direction}
      style={style}
      title={shift ? text : undefined}
    >
      <span ref={trackRef} className="sliding-text-track">{text}</span>
    </span>
  );
}
