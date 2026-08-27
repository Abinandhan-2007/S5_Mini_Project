import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export interface PageTransitionProps {
  children: React.ReactNode;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const location = useLocation();

  useEffect(() => {
    // Scroll window smoothly to top of page on every screen switch
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  return (
    <div key={location.pathname} className="w-full min-h-screen relative">
      {/* SCREEN CONTENT ANIMATING FROM THE TOP OF THE SCREEN WITHOUT ANY LINE */}
      <div className="w-full min-h-screen animate-in fade-in-90 slide-in-from-top-4 duration-350 ease-out fill-mode-forwards">
        {children}
      </div>
    </div>
  );
};
