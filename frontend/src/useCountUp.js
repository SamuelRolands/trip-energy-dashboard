import { useEffect, useRef, useState } from "react";

// Animates a number from 0 (or its previous value) up to `target` whenever
// `target` changes - used for KPI figures and the predictor's result value,
// so numbers arrive with a bit of motion instead of just appearing.
export function useCountUp(target, { duration = 700, decimals = 0 } = {}) {
  const [value, setValue] = useState(0);
  const frame = useRef(null);
  const start = useRef(null);
  const from = useRef(0);

  useEffect(() => {
    if (typeof target !== "number" || Number.isNaN(target)) return undefined;
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setValue(target);
      return undefined;
    }

    from.current = value;
    start.current = null;

    function tick(ts) {
      if (start.current === null) start.current = ts;
      const elapsed = ts - start.current;
      const t = Math.min(1, elapsed / duration);
      // ease-out-cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from.current + (target - from.current) * eased);
      if (t < 1) frame.current = requestAnimationFrame(tick);
    }
    frame.current = requestAnimationFrame(tick);
    return () => frame.current && cancelAnimationFrame(frame.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return Number(value.toFixed(decimals));
}
