import { useState, useEffect, useRef, useCallback } from 'react';

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

export function useCountUp(target: number, duration: number = 1500, trigger: boolean = true) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const animate = useCallback(() => {
    if (!trigger) return;

    const now = performance.now();
    if (startTimeRef.current === null) startTimeRef.current = now;

    const elapsed = now - startTimeRef.current;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easeOutQuart(progress);

    setValue(Math.round(easedProgress * target));

    if (progress < 1) {
      rafRef.current = requestAnimationFrame(animate);
    }
  }, [trigger, target, duration]);

  useEffect(() => {
    if (!trigger) {
      setValue(0);
      startTimeRef.current = null;
      return;
    }

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [trigger, animate]);

  return value;
}

export function useIntersectionObserver(threshold: number = 0.3) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}
