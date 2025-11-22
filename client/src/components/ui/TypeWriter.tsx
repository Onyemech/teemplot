import { useState, useEffect } from 'react';

interface TypeWriterProps {
  text: string;
  delay?: number;
  speed?: number;
  className?: string;
  onComplete?: () => void;
  cursor?: boolean;
  cursorChar?: string;
}

export default function TypeWriter({
  text,
  delay = 0,
  speed = 50,
  className = '',
  onComplete,
  cursor = true,
  cursorChar = '|'
}: TypeWriterProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  // Typing effect
  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, currentIndex === 0 ? delay : speed);

      return () => clearTimeout(timeout);
    } else if (!isComplete) {
      setIsComplete(true);
      if (onComplete) {
        onComplete();
      }
    }
  }, [currentIndex, text, delay, speed, isComplete, onComplete]);

  // Blinking cursor effect
  useEffect(() => {
    if (!cursor) return;

    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530);

    return () => clearInterval(cursorInterval);
  }, [cursor]);

  return (
    <span className={className}>
      {displayedText}
      {cursor && !isComplete && (
        <span className={`inline-block ${showCursor ? 'opacity-100' : 'opacity-0'}`}>
          {cursorChar}
        </span>
      )}
    </span>
  );
}
