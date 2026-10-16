import { useMemo } from 'react';

interface StarfieldProps {
  count?: number;
}

interface Star {
  top: string;
  left: string;
  size: string;
  delay: string;
  duration: string;
  opacity: string;
}

export default function Starfield({ count = 80 }: StarfieldProps) {
  const stars = useMemo<Star[]>(() => {
    return Array.from({ length: count }, () => ({
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: `${Math.random() * 2 + 1}px`,
      delay: `${Math.random() * 5}s`,
      duration: `${Math.random() * 3 + 2}s`,
      opacity: `${Math.random() * 0.7 + 0.2}`,
    }));
  }, [count]);

  return (
    <div className="starfield">
      {stars.map((star, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            top: star.top,
            left: star.left,
            width: star.size,
            height: star.size,
            opacity: star.opacity,
            animation: `twinkle ${star.duration} ease-in-out ${star.delay} infinite`,
          }}
        />
      ))}
    </div>
  );
}
