import { useEffect, useRef } from 'react';

export const useScrollPersistence = (key: string, isReady: boolean) => {
  const isRestored = useRef<string | null>(null);

  useEffect(() => {
    // If the key changed, reset the restoration flag for the new key
    if (isRestored.current !== key) {
      isRestored.current = null;
    }

    // Only restore if ready and not already restored for THIS specific key
    if (isReady && isRestored.current !== key) {
      const savedPosition = sessionStorage.getItem(`scroll-${key}`);
      if (savedPosition) {
        setTimeout(() => {
          window.scrollTo({
             top: parseInt(savedPosition, 10),
             behavior: 'instant'
          });
          isRestored.current = key;
        }, 50);
      } else {
        isRestored.current = key;
      }
    }

    const handleScroll = () => {
      // Only save if we have actually restored the position for the CURRENT key
      if (isRestored.current === key) {
        sessionStorage.setItem(`scroll-${key}`, window.scrollY.toString());
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [key, isReady]);
};
