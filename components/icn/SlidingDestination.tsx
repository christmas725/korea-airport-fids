"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

type Props = {
  text: string;
  direction: "ltr" | "rtl";
};

export default function SlidingDestination({ text, direction }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLElement>(null);
  const [overflowDistance, setOverflowDistance] = useState(0);

  useEffect(() => {
    const measure = () => {
      const viewport = viewportRef.current;
      const label = textRef.current;
      if (!viewport || !label) return;

      const distance = Math.max(0, label.scrollWidth - viewport.clientWidth);
      setOverflowDistance(distance > 2 ? distance : 0);
    };

    measure();
    const frame = window.requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);

    if (viewportRef.current) observer.observe(viewportRef.current);
    if (textRef.current) observer.observe(textRef.current);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [text]);

  const isOverflowing = overflowDistance > 0;
  const slideDistance = direction === "rtl" ? overflowDistance : -overflowDistance;
  const duration = Math.min(8, Math.max(5, 4.7 + overflowDistance / 30));
  const style = isOverflowing
    ? ({
        "--destination-slide-x": `${slideDistance}px`,
        "--destination-slide-duration": `${duration}s`,
      } as CSSProperties)
    : undefined;

  return (
    <div
      ref={viewportRef}
      className={`destination-name-viewport${isOverflowing ? " is-overflowing" : ""}`}
      data-direction={direction}
    >
      <strong ref={textRef} className="destination-name-text" style={style}>
        {text}
      </strong>
    </div>
  );
}

