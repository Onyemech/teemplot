import { useEffect, ReactNode, useState } from 'react';
import { motion, Variants } from 'framer-motion';
import { useSharedIntersectionObserver } from '@/hooks/useSharedIntersectionObserver';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface ScrollRevealProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'scale' | 'fade';
  className?: string;
  once?: boolean;
  amount?: number;
}

const variants: Record<string, Variants> = {
  up: {
    hidden: { opacity: 0, y: 75 },
    visible: { opacity: 1, y: 0 }
  },
  down: {
    hidden: { opacity: 0, y: -75 },
    visible: { opacity: 1, y: 0 }
  },
  left: {
    hidden: { opacity: 0, x: 75 },
    visible: { opacity: 1, x: 0 }
  },
  right: {
    hidden: { opacity: 0, x: -75 },
    visible: { opacity: 1, x: 0 }
  },
  scale: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 }
  },
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  }
};

// Reduced motion variants - instant transitions
const reducedMotionVariants: Record<string, Variants> = {
  up: { hidden: { opacity: 0 }, visible: { opacity: 1 } },
  down: { hidden: { opacity: 0 }, visible: { opacity: 1 } },
  left: { hidden: { opacity: 0 }, visible: { opacity: 1 } },
  right: { hidden: { opacity: 0 }, visible: { opacity: 1 } },
  scale: { hidden: { opacity: 0 }, visible: { opacity: 1 } },
  fade: { hidden: { opacity: 0 }, visible: { opacity: 1 } }
};

export default function ScrollReveal({
  children,
  delay = 0,
  duration = 0.6,
  direction = 'up',
  className = '',
  once = true,
  amount = 0.3
}: ScrollRevealProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [willChange, setWillChange] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  
  const ref = useSharedIntersectionObserver(
    (entry) => {
      if (entry.isIntersecting) {
        // Apply will-change before animation
        setWillChange(true);
        setIsVisible(true);
      } else if (!once) {
        setIsVisible(false);
      }
    },
    { threshold: amount, once }
  );

  // Remove will-change after animation completes
  useEffect(() => {
    if (isVisible && willChange) {
      const timer = setTimeout(() => {
        setWillChange(false);
      }, (duration + delay) * 1000 + 100); // Add 100ms buffer
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, willChange, duration, delay]);

  const activeVariants = prefersReducedMotion ? reducedMotionVariants : variants;
  const activeDuration = prefersReducedMotion ? 0 : duration;

  return (
    <motion.div
      ref={ref as any}
      initial="hidden"
      animate={isVisible ? 'visible' : 'hidden'}
      variants={activeVariants[direction]}
      transition={{
        duration: activeDuration,
        delay: prefersReducedMotion ? 0 : delay,
        ease: [0.25, 0.4, 0.25, 1]
      }}
      className={className}
      style={{
        willChange: willChange ? 'transform, opacity' : 'auto'
      }}
    >
      {children}
    </motion.div>
  );
}
