import { useEffect, useState } from 'react';

export default function SignalRadar({ active = false }) {
  const [sweepAngle, setSweepAngle] = useState(0);

  useEffect(() => {
    if (!active) return;

    let animationId;
    const animate = () => {
      setSweepAngle((prev) => (prev + 2) % 360);
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [active]);

  if (!active) return null;

  return (
    <div className="flex items-center justify-center">
      <div className="relative h-32 w-32">
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <defs>
            <radialGradient id="radarGrad">
              <stop offset="0%" stopColor="rgba(34,211,238,0.8)" />
              <stop offset="100%" stopColor="rgba(34,211,238,0.1)" />
            </radialGradient>
          </defs>

          {/* Concentric circles */}
          {[20, 40, 60, 80].map((r) => (
            <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="rgba(148,163,184,0.2)" strokeWidth="0.5" />
          ))}

          {/* Grid lines */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const x = 50 + 80 * Math.cos(rad);
            const y = 50 + 80 * Math.sin(rad);
            return <line key={angle} x1="50" y1="50" x2={x} y2={y} stroke="rgba(148,163,184,0.1)" strokeWidth="0.3" />;
          })}

          {/* Animated sweep */}
          <g style={{ transform: `rotate(${sweepAngle}deg)`, transformOrigin: '50% 50%', transition: 'none' }}>
            <path d="M 50 50 L 50 10 A 40 40 0 0 1 78.28 21.72" fill="url(#radarGrad)" opacity="0.6" />
          </g>

          {/* Center dot */}
          <circle cx="50" cy="50" r="3" fill="rgba(34,211,238,1)" />
        </svg>

        {/* Corner pulses */}
        <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
        <div className="absolute -bottom-1 -left-1 h-2 w-2 rounded-full bg-violet-400 animate-pulse" style={{ animationDelay: '0.3s' }} />
      </div>
    </div>
  );
}
