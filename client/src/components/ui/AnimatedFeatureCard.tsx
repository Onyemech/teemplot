import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface AnimatedFeatureCardProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export default function AnimatedFeatureCard({
  children,
  delay = 0,
  className = ''
}: AnimatedFeatureCardProps) {
  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 50,
      scale: 0.9,
      rotateX: -15
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      rotateX: 0,
      transition: {
        duration: 0.6,
        delay,
        ease: [0.25, 0.4, 0.25, 1]
      }
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{
        scale: 1.05,
        y: -8,
        transition: { duration: 0.3, ease: 'easeOut' }
      }}
      whileTap={{ scale: 0.98 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
