import { useRef, useEffect } from 'react';
import { motion, useInView, useSpring, useTransform, useScroll } from 'framer-motion';

interface WaveRevealCardProps {
  children: React.ReactNode;
  index: number;
  className?: string;
}

export default function WaveRevealCard({ children, index, className = '' }: WaveRevealCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  
  // Track scroll velocity for responsive animation
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  // Create spring animations for smooth, organic motion
  const springConfig = { 
    stiffness: 150, 
    damping: 25, 
    mass: 0.8 
  };

  // Base delay increases with index for wave effect (faster timing)
  const baseDelay = index * 0.05;
  
  // Opacity spring - fades in smoothly
  const opacity = useSpring(0, springConfig);
  
  // Y position spring - creates the wave motion
  const y = useSpring(100, springConfig);
  
  // X position for snake-like horizontal sway
  const x = useSpring(0, springConfig);
  
  // Rotation for organic feel
  const rotate = useSpring(0, springConfig);
  
  // Scale for depth effect
  const scale = useSpring(0.8, springConfig);

  useEffect(() => {
    if (isInView) {
      // Stagger the animation start based on index
      const timer = setTimeout(() => {
        opacity.set(1);
        y.set(0);
        x.set(0);
        rotate.set(0);
        scale.set(1);
      }, baseDelay * 1000);

      return () => clearTimeout(timer);
    }
  }, [isInView, baseDelay, opacity, y, x, rotate, scale]);

  // Create wave-like motion based on scroll position
  const waveY = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    [20, 0, -20]
  );

  // Horizontal sway for snake effect (alternates based on index)
  const waveX = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    index % 2 === 0 ? [-10, 0, 10] : [10, 0, -10]
  );

  // Subtle rotation for organic movement
  const waveRotate = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    index % 2 === 0 ? [-2, 0, 2] : [2, 0, -2]
  );

  return (
    <motion.div
      ref={ref}
      style={{
        opacity,
        y,
        x,
        rotate,
        scale,
      }}
      className={className}
    >
      <motion.div
        style={{
          y: waveY,
          x: waveX,
          rotate: waveRotate,
        }}
        whileHover={{
          scale: 1.05,
          y: -12,
          rotate: 0,
          transition: { 
            type: "spring", 
            stiffness: 500, 
            damping: 20 
          }
        }}
        whileTap={{ scale: 0.98 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
