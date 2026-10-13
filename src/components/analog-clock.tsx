import { handAngles } from "@/lib/frames";

// Flat analog clock with 1-12 numerals; hands show the exact minute.
export function AnalogClock({ minutes, size = 240 }: { minutes: number; size?: number }) {
  const { hour, minute } = handAngles(minutes);
  return (
    <svg
      role="img"
      aria-label="Clock"
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className="shrink-0"
    >
      <circle
        cx="100"
        cy="100"
        r="96"
        className="fill-background stroke-foreground"
        strokeWidth="6"
      />
      {Array.from({ length: 12 }, (_, i) => {
        const n = i + 1;
        const a = (n * 30 * Math.PI) / 180;
        return (
          <text
            key={n}
            x={100 + 74 * Math.sin(a)}
            y={100 - 74 * Math.cos(a)}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="26"
            fontWeight="800"
            className="fill-foreground"
          >
            {n}
          </text>
        );
      })}
      <line
        x1="100"
        y1="100"
        x2="100"
        y2="54"
        strokeWidth="9"
        strokeLinecap="round"
        className="stroke-foreground"
        transform={`rotate(${hour} 100 100)`}
      />
      <line
        x1="100"
        y1="100"
        x2="100"
        y2="32"
        strokeWidth="6"
        strokeLinecap="round"
        className="stroke-late"
        transform={`rotate(${minute} 100 100)`}
      />
      <circle cx="100" cy="100" r="8" className="fill-foreground" />
    </svg>
  );
}
