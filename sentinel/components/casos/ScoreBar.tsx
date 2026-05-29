import type { CSSProperties } from "react";

interface ScoreBarProps {
  value: number;
  /** Clase de color del relleno: accent | green | yellow | red | purple | teal | gray */
  color?: string;
  height?: number;
  animated?: boolean;
}

export function ScoreBar({
  value,
  color = "accent",
  height = 6,
  animated = true,
}: ScoreBarProps) {
  const pct = Math.min(100, Math.max(0, value));
  const style: CSSProperties = {
    "--fill": `${pct}%`,
    ...(animated ? {} : { animation: "none" }),
  } as CSSProperties;
  return (
    <div className="score-bar" style={{ height }}>
      <div className={`score-bar-fill ${color}`} style={style} />
    </div>
  );
}
