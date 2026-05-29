
const DML = /\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|GRANT|REVOKE)\b/i;

export function validateSql(sql: string): { ok: boolean; error?: string; sanitized?: string } {
  const trimmed = sql.trim().replace(/;+$/, "");

  if (DML.test(trimmed))
    return { ok: false, error: "Solo se permiten consultas SELECT." };

  if (!trimmed.toUpperCase().startsWith("SELECT"))
    return { ok: false, error: "La consulta debe comenzar con SELECT." };

  // Ensure LIMIT
  const hasLimit = /\bLIMIT\s+\d+/i.test(trimmed);
  const sanitized = hasLimit ? trimmed : `${trimmed} LIMIT 100`;

  return { ok: true, sanitized };
}
