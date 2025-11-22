import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface SequentialRevealProps {
  children: React.ReactNode;
  index: number;
  delay?: number; // Delay in seconds between each card
  className?: string;
}

export default function SequentialReveal({ 
  children, 
  index, 
  delay = 1, 
  className = '' 
}: SequentialRevealProps) {
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // When the container enters viewport and hasn't animated yet
          if (entry.isIntersecting && !hasAnimated) {
            setShouldAnimate(true);
            setHasAnimated(true);
          }
        });
      },
      {
        threshold: 0.1, // Trigger when 10% visible
        rootMargin: '0px'
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, [hasAnimated]);

  return (
    <div ref={containerRef}>
      <motion.div
        initial={{ 
          opacity: 0, 
          y: 50,
          scale: 0.9
        }}
        animate={shouldAnimate ? { 
          opacity: 1, 
          y: 0,
          scale: 1
        } : {
          opacity: 0,
          y: 50,
          scale: 0.9
        }}
        transition={{
          duration: 0.6,
          delay: index * delay, // 1 second between each card
          ease: [0.25, 0.4, 0.25, 1]
        }}
        className={className}
      >
        {children}
      </motion.div>
    </div>
  );
}
