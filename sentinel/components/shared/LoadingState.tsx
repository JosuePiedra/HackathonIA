interface Props {
  /** Cantidad de tarjetas/KPIs de la fila superior (default 4). */
  cards?: number;
  /** Mostrar un bloque grande (tabla/gráfico) debajo. */
  block?: boolean;
}

/** Esqueleto de carga genérico para las páginas de datos. */
export function LoadingState({ cards = 4, block = true }: Props) {
  return (
    <div className="page">
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="skeleton-block" style={{ height: 88, flex: 1, minWidth: 150 }} />
        ))}
      </div>
      {block ? <div className="skeleton-block" style={{ height: 320, marginTop: 16 }} /> : null}
    </div>
  );
}
