import { useRef, ReactNode } from 'react';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';

interface FluidWaveContainerProps {
  children: ReactNode;
  className?: string;
}

export default function FluidWaveContainer({ children, className = '' }: FluidWaveContainerProps) {
  const ref = useRef<HTMLDivElement>(null);
  
  // Track scroll progress through this container
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  // Create smooth spring for scroll-based animations
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 150,
    damping: 25,
    restDelta: 0.001
  });

  // Create wave effect that flows through the container
  const waveIntensity = useTransform(
    smoothProgress,
    [0, 0.3, 0.7, 1],
    [0, 1, 1, 0]
  );

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{
        // Subtle container animation
        opacity: useTransform(smoothProgress, [0, 0.2, 0.8, 1], [0.5, 1, 1, 0.5]),
      }}
    >
      {children}
    </motion.div>
  );
}
