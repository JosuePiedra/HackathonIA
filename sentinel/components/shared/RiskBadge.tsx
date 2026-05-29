import type { RiskLevel } from "@/lib/types";

const COLOR_CLASS: Record<RiskLevel, string> = {
  Verde: "green",
  Amarillo: "yellow",
  Rojo: "red",
};

const LABEL: Record<RiskLevel, string> = {
  Verde: "Verde",
  Amarillo: "Amarillo",
  Rojo: "Rojo",
};

interface RiskBadgeProps {
  level: RiskLevel;
  size?: "sm" | "md" | "lg";
}

export function RiskBadge({ level, size = "md" }: RiskBadgeProps) {
  return (
    <span className={`risk-badge ${COLOR_CLASS[level]}${size === "lg" ? " large" : ""}`}>
      <span className="dot" />
      {LABEL[level]}
    </span>
  );
}
