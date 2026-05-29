import type { RiskLevel } from "@/lib/types";

const COLOR_CLASS: Record<RiskLevel, string> = {
  VERDE: "green",
  AMARILLO: "yellow",
  ROJO: "red",
};

const LABEL: Record<RiskLevel, string> = {
  VERDE: "Verde",
  AMARILLO: "Amarillo",
  ROJO: "Rojo",
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
