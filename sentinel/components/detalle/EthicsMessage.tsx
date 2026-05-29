import { Shield } from "lucide-react";
import { ETHICAL_MESSAGE } from "@/lib/constants";

interface Props {
  mensaje?: string;
}

export function EthicsMessage({ mensaje }: Props) {
  const text = mensaje && mensaje.trim() ? mensaje : ETHICAL_MESSAGE;
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderLeft: "2px solid var(--accent)",
        borderRadius: 8,
        padding: 16,
      }}
    >
      <Shield style={{ width: 18, height: 18, flexShrink: 0, color: "var(--accent)" }} />
      <div>
        <div className="label-mono" style={{ marginBottom: 6 }}>
          Aviso ético
        </div>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary)" }}>{text}</p>
      </div>
    </div>
  );
}
