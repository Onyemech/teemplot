import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface WaveRevealCardProps {
  children: React.ReactNode;
  index: number;
  className?: string;
}

export default function WaveRevealCard({ children, index, className = '' }: WaveRevealCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Simple IntersectionObserver for visibility detection
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isVisible) {
            setIsVisible(true);
          }
        });
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [isVisible]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{
        duration: 0.5,
        delay: index * 0.08,
        ease: [0.25, 0.4, 0.25, 1]
      }}
      whileHover={{
        y: -8,
        transition: { 
          type: "spring", 
          stiffness: 400, 
          damping: 25 
        }
      }}
      className={className}
      style={{ willChange: isVisible ? 'transform, opacity' : 'auto' }}
    >
      {children}
    </motion.div>
  );
}
