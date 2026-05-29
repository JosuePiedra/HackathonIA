interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  variant?: "default" | "red" | "yellow" | "green";
}

export function KPICard({ title, value, subtitle, variant = "default" }: KPICardProps) {
  const toneClass = variant !== "default" ? `kpi-${variant}` : "";
  const valueClass = variant !== "default" ? variant : "";
  return (
    <div className={`kpi ${toneClass}`}>
      <div className="kpi-label">{title}</div>
      <div className={`kpi-value ${valueClass}`}>{value}</div>
      {subtitle ? <div className="kpi-sub">{subtitle}</div> : null}
    </div>
  );
}
