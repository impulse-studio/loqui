import { useEffect, useRef, useState } from "react";
import barCount from "../constants/bar-count";
import lerp from "../lib/lerp";
import seededRandom from "../lib/seeded-random";

const zeros = () => new Array<number>(barCount).fill(0);

/**
 * Drives the FFT bar heights from the incoming RMS level.
 *
 * The animation loop only runs while `active` is true (i.e. recording). When
 * idle the loop is torn down and the bars rest at zero — otherwise a 60fps
 * `requestAnimationFrame` loop would re-render the always-mounted widget and
 * allocate a fresh array every frame for the entire lifetime of the app.
 */
export default function useFftBars(rms: number, active: boolean): number[] {
  const [bars, setBars] = useState<number[]>(zeros);
  const currentRef = useRef<number[]>(zeros());
  const targetRef = useRef<number[]>(zeros());
  const frameRef = useRef(0);
  const rafRef = useRef(0);

  // Update targets when rms changes — boost amplitude significantly
  useEffect(() => {
    if (!active) return;
    frameRef.current += 1;
    const frame = frameRef.current;
    const boosted = Math.min(1, rms * 6);
    for (let i = 0; i < barCount; i++) {
      const variation = 0.3 + seededRandom(i, frame) * 0.7;
      targetRef.current[i] = boosted * variation;
    }
  }, [rms, active]);

  // Animation loop — only while active.
  useEffect(() => {
    if (!active) {
      // Reset to rest and stop animating; nothing to draw while idle.
      currentRef.current = zeros();
      targetRef.current = zeros();
      setBars(zeros());
      return;
    }

    let running = true;

    function animate() {
      if (!running) return;
      const current = currentRef.current;
      const target = targetRef.current;
      const next = new Array(barCount) as number[];

      for (let i = 0; i < barCount; i++) {
        next[i] = lerp(current[i], target[i], 0.18);
      }

      currentRef.current = next;
      setBars(next);
      rafRef.current = requestAnimationFrame(animate);
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  return bars;
}
