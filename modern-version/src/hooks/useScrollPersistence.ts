import { useEffect, useRef } from 'react';

export const useScrollPersistence = (key: string, isReady: boolean) => {
  const isRestored = useRef<string | null>(null);
  const scrollYRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // If key changed, we are transitioning
    if (isRestored.current !== key) {
      isRestored.current = null;
    }

    if (isReady && isRestored.current !== key) {
      const savedPosition = sessionStorage.getItem(`scroll-${key}`);
      if (savedPosition) {
        // Restore scroll position
        setTimeout(() => {
          const y = parseInt(savedPosition, 10);
          window.scrollTo({ top: y, behavior: 'auto' });
          scrollYRef.current = y;
          isRestored.current = key;
        }, 100);
      } else {
        isRestored.current = key;
      }
    }

    const handleScroll = () => {
      if (isRestored.current === key) {
        scrollYRef.current = window.scrollY;
        
        // Debounce saving to sessionStorage so shrinking DOM doesn't overwrite with 0
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          // If we reach here and still the same key, it's safe to save
          if (isRestored.current === key && scrollYRef.current > 0) {
            sessionStorage.setItem(`scroll-${key}`, scrollYRef.current.toString());
          } else if (isRestored.current === key && scrollYRef.current === 0) {
            // Also save 0 if actually scrolled to top
            sessionStorage.setItem(`scroll-${key}`, '0');
          }
        }, 150);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [key, isReady]);
};
