import { useEffect, useRef, useState } from 'react';

interface UseScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

/**
 * IntersectionObserver-based hook that toggles a `.is-visible` class
 * on the referenced element when it scrolls into view.
 *
 * @returns { ref, isVisible } — attach `ref` to the target element
 *   and conditionally apply `.is-visible` + a `.fade-in-*` class.
 *
 * @example
 * const { ref, isVisible } = useScrollReveal();
 * <div ref={ref} className={`scroll-reveal fade-in-up ${isVisible ? 'is-visible' : ''}`}>
 *   …
 * </div>
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>({
  threshold = 0.1,
  rootMargin = '0px 0px -50px 0px',
  triggerOnce = true,
}: UseScrollRevealOptions = {}) {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) observer.disconnect();
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  return { ref, isVisible };
}
