import { useEffect, useRef } from 'react';

export const useScrollPersistence = (key: string, isReady: boolean) => {
  const isRestored = useRef(false);

  useEffect(() => {
    // Only restore if ready and not already restored in this mount cycle
    if (isReady && !isRestored.current) {
      const savedPosition = sessionStorage.getItem(`scroll-${key}`);
      if (savedPosition) {
        // Small delay to ensure DOM is fully painted
        setTimeout(() => {
          window.scrollTo({
             top: parseInt(savedPosition, 10),
             behavior: 'instant'
          });
          isRestored.current = true;
        }, 50);
      } else {
        isRestored.current = true;
      }
    }

    const handleScroll = () => {
      // Only save if we have actually restored or if there's no saved position (initial state)
      if (isRestored.current) {
        sessionStorage.setItem(`scroll-${key}`, window.scrollY.toString());
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [key, isReady]);
};
