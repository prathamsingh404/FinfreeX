'use client';

import { useEffect, useRef } from 'react';

export default function GlobalCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const circleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const isFinePointer = window.matchMedia("(pointer: fine)").matches;
    if (!isFinePointer) return;

    let mouseX = 0, mouseY = 0;
    let circleX = 0, circleY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mouseX - 3}px, ${mouseY - 3}px, 0)`;
      }
    };

    const updateCirclePosition = () => {
      circleX += (mouseX - circleX) * 0.18;
      circleY += (mouseY - circleY) * 0.18;
      if (circleRef.current) {
        circleRef.current.style.transform = `translate3d(${circleX - 16}px, ${circleY - 16}px, 0)`;
      }
      requestAnimationFrame(updateCirclePosition);
    };

    const handleMouseEnter = () => document.body.classList.add('hover-active');
    const handleMouseLeave = () => document.body.classList.remove('hover-active');

    window.addEventListener('mousemove', handleMouseMove);
    const animFrame = requestAnimationFrame(updateCirclePosition);

    const updateHoverListeners = () => {
      const interactives = document.querySelectorAll('a, button, [role="button"], input, textarea, select, .magnetic-btn, .cursor-target');
      interactives.forEach(el => {
        el.removeEventListener('mouseenter', handleMouseEnter);
        el.removeEventListener('mouseleave', handleMouseLeave);
        el.addEventListener('mouseenter', handleMouseEnter);
        el.addEventListener('mouseleave', handleMouseLeave);
      });
    };

    updateHoverListeners();

    // Observe changes to the DOM to bind dynamic elements
    const observer = new MutationObserver(updateHoverListeners);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animFrame);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <div ref={dotRef} className="cursor-dot fixed top-0 left-0 pointer-events-none z-[9999] mix-blend-difference bg-white rounded-full w-1.5 h-1.5 transition-transform duration-0 hidden md:block"></div>
      <div ref={circleRef} className="cursor-circle fixed top-0 left-0 pointer-events-none z-[9999] mix-blend-difference border border-white rounded-full w-8 h-8 transition-[width,height,background-color,border-color] duration-300 ease-out hidden md:block"></div>
    </>
  );
}
