'use client';

import { useState, useEffect, RefObject } from 'react';

export function useStickyObserver(targetRef: RefObject<HTMLElement>): { isIntersecting: boolean } {
  const [isIntersecting, setIsIntersecting] = useState(true);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [targetRef]);

  return { isIntersecting };
}
