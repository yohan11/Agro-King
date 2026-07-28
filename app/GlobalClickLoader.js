'use client';
import { useState, useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

function GlobalClickLoaderContent() {
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

export default function GlobalClickLoader() {
  return (
    <Suspense fallback={null}>
      <GlobalClickLoaderContent />
    </Suspense>
  );
}
