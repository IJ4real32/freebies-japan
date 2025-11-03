import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Returns { hidden, atTop } based on scroll direction.
 * - Hides when scrolling down past threshold
 * - Shows when scrolling up
 * - Respects prefers-reduced-motion (never hides)
 */
export default function useScrollHide({ threshold = 16 } = {}) {
  const [hidden, setHidden] = useState(false);
  const [atTop, setAtTop] = useState(true);
  const lastY = useRef(0);
  const reduceMotion = useMemo(
    () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  useEffect(() => {
    if (reduceMotion) return; // don't animate/hide for reduced motion users
    const onScroll = () => {
      const y = window.scrollY || window.pageYOffset || 0;
      setAtTop(y <= 2);
      const dirDown = y > lastY.current;
      const passed = y > threshold;
      setHidden(dirDown && passed);
      lastY.current = y;
    };
    // init
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold, reduceMotion]);

  return { hidden: reduceMotion ? false : hidden, atTop };
}
