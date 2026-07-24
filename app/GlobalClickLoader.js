'use client';
import { useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function GlobalClickLoader() {
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Hide loader whenever the route changes
    setIsNavigating(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleClick = (e) => {
      // Find closest button or anchor
      const target = e.target.closest('button, a');
      if (!target) return;

      // Don't show loader for links opening in new tabs
      if (target.tagName === 'A' && target.target === '_blank') return;
      
      // Don't show if the button is just expanding an accordion (you can check classes if needed)
      // We will show it by default to meet the user's requirement "apres chaque clic sur un bouton"
      
      setIsNavigating(true);

      // Auto-hide after 2 seconds just in case it's a client-side action that doesn't change route
      setTimeout(() => {
        setIsNavigating(false);
      }, 2000);
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  if (!isNavigating) return null;

  return (
    <div className="global-loader-overlay">
      <div className="large-spinner"></div>
      <div className="loading-text">Chargement...</div>
    </div>
  );
}
