// ============================================================
// PAGE: INICIO + DASHBOARD
// ============================================================

function PageInicio({ onLoadDemo, onUpload }) {
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const triggerSchemaError = () => {
    setError(['fecha_ocurrencia', 'monto_estimado', 'proveedor_id']);
  };

  return (
    <div className="inicio-screen">
      <div className="inicio-content">
        <div className="inicio-badge">
          <span className="pulse-dot"></span>
          SISTEMA DE ANÁLISIS DE RIESGO
        </div>
        <h1 className="inicio-heading">FRAUD<span className="dot">·</span>IA</h1>
        <p className="inicio-sub">Detector de posibles fraudes en siniestros</p>
        <div className="inicio-divider"></div>
        <div className="ethics-box">
          <Icon.Shield style={{width:20, height:20}}/>
          <p>
            Este sistema genera alertas de posible riesgo para apoyar la revisión humana de siniestros.
            No acusa automáticamente a ningún cliente, proveedor o beneficiario, ni toma decisiones de pago o rechazo.
          </p>
        </div>
        <div className="inicio-actions">
          <button className="btn btn-primary btn-large" onClick={onLoadDemo}>
            Cargar dataset demo
          </button>
          <button className="btn btn-ghost btn-large" onClick={() => fileRef.current?.click()}>
            <Icon.Upload /> Subir archivo CSV
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files[0]) {
                // simulate validation: 50% chance to trigger schema error
                if (Math.random() < 0.5) {
                  triggerSchemaError();
                } else {
                  onUpload(e.target.files[0].name);
                }
              }
            }}
          />
        </div>
        <p className="inicio-hint">Acepta archivos .csv · Columnas validadas automáticamente</p>

        {error && (
          <div className="validation-error">
            <h4>⚠ Columnas faltantes en el archivo</h4>
            <div style={{ fontFamily: 'DM Mono', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8 }}>
              El archivo cargado no contiene todas las columnas requeridas por el schema. Corrija el archivo y vuelva a intentarlo.
            </div>
            <div className="chips">
              {error.map(c => <span key={c} className="chip">{c}</span>)}
            </div>
            <button
              className="btn btn-ghost"
              style={{ marginTop: 12, fontSize: 11 }}
              onClick={() => setError(null)}
            >
              <Icon.X style={{width: 12, height: 12}}/> Cerrar
            </button>
          </div>
        )}

        <div style={{ marginTop: 8, display: 'flex', gap: 14, justifyContent: 'center', fontFamily: 'DM Mono', fontSize: 11, color: 'var(--text-tertiary)' }}>
          <span>v2.4.1</span>
          <span>·</span>
          <span>Modelo IA: ensemble v3</span>
          <span>·</span>
          <span>Última calibración: 2026-05-20</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DASHBOARD
// ============================================================
function PageDashboard({ onNavigate, casos }) {
  const totalSinietros = casos.length;
  const rojos = casos.filter(c => c.nivel === 'red');
  const amarillos = casos.filter(c => c.nivel === 'yellow');
  const verdes = casos.filter(c => c.nivel === 'green');
  const scorePromedio = Math.round(casos.reduce((a, c) => a + c.score, 0) / casos.length);
  const montoTotal = casos.reduce((a, c) => a + c.monto_reclamado, 0);
  const montoRojos = rojos.reduce((a, c) => a + c.monto_reclamado, 0);
  const ahorroEstimado = Math.round(montoRojos * 0.6);
  const pctRojos = Math.round((montoRojos / montoTotal) * 100);

  // Donut data
  const donutData = [
    { label: 'Rojos', value: rojos.length, color: 'var(--risk-red)' },
    { label: 'Amarillos', value: amarillos.length, color: 'var(--risk-yellow)' },
    { label: 'Verdes', value: verdes.length, color: 'var(--risk-green)' }
  ];
  const donutTotal = donutData.reduce((a, d) => a + d.value, 0);

  // Top 8 proveedores by case count
  const provCount = {};
  casos.forEach(c => { provCount[c.proveedor] = (provCount[c.proveedor] || 0) + 1; });
  const topProv = Object.entries(provCount).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxProv = topProv[0]?.[1] || 1;

  // Stacked by ramo
  const ramoData = {};
  window.FDATA.RAMOS.forEach(r => { ramoData[r] = { green: 0, yellow: 0, red: 0 }; });
  casos.forEach(c => {
    if (ramoData[c.ramo]) ramoData[c.ramo][c.nivel]++;
  });

  // Histogram
  const histogram = window.FDATA.buildHistogram(casos);
  const maxHist = Math.max(...histogram.map(b => b.count)) || 1;

  const money = (n) => '$' + n.toLocaleString('en-US');

  return (
    <div className="page">
      <div className="kpi-grid">
        <KPI label="Total siniestros" value={totalSinietros} sub={`Periodo activo`} />
        <KPI label="Casos rojos" value={rojos.length} sub={`${Math.round(rojos.length / totalSinietros * 100)}% del total`} tone="red"/>
        <KPI label="Casos amarillos" value={amarillos.length} sub={`${Math.round(amarillos.length / totalSinietros * 100)}% del total`} tone="yellow"/>
        <KPI label="Casos verdes" value={verdes.length} sub={`${Math.round(verdes.length / totalSinietros * 100)}% del total`} tone="green"/>
        <KPI
          label="Score promedio"
          value={scorePromedio}
          sub="Escala 0–100"
          gauge={{ value: scorePromedio, color: scorePromedio >= 76 ? 'var(--risk-red)' : scorePromedio >= 41 ? 'var(--risk-yellow)' : 'var(--risk-green)' }}
        />
        <KPI label="Monto reclamado" value={money(montoTotal)} sub="Total acumulado"/>
        <KPI label="Monto en rojos" value={money(montoRojos)} sub={`${pctRojos}% del total`} tone="red"/>
        <KPI label="Ahorro potencial" value={money(ahorroEstimado)} sub="60% del monto rojo" tone="green"/>
      </div>

      <div className="charts-row">
        {/* Donut */}
        <div className="chart-card">
          <h4>Distribución de riesgo</h4>
          <div className="chart-sub">Casos por nivel</div>
          <div className="chart-body" style={{ height: 200 }}>
            <DonutChart data={donutData} total={donutTotal}/>
          </div>
          <div className="donut-legend">
            {donutData.map(d => (
              <span key={d.label}><span className="dot" style={{background: d.color}}></span>{d.label} {d.value}</span>
            ))}
          </div>
        </div>

        {/* Top providers */}
        <div className="chart-card">
          <h4>Top proveedores</h4>
          <div className="chart-sub">Por número de casos · click para ver detalle</div>
          <div className="chart-body" style={{ alignItems: 'flex-start' }}>
            <div className="hbars">
              {topProv.map(([id, count]) => (
                <div key={id} className="hbar" onClick={() => onNavigate('proveedores')}>
                  <span className="id">{id}</span>
                  <div className="bar"><div className="fill" style={{ width: `${(count / maxProv) * 100}%`, opacity: 0.55 + (count / maxProv) * 0.45 }}/></div>
                  <span className="val">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stacked by ramo */}
        <div className="chart-card">
          <h4>Casos por ramo</h4>
          <div className="chart-sub">Apilado por nivel de riesgo</div>
          <div className="chart-body" style={{ alignItems: 'flex-start' }}>
            <div className="sbars">
              {Object.entries(ramoData).map(([ramo, vals]) => {
                const total = vals.green + vals.yellow + vals.red;
                if (total === 0) return null;
                return (
                  <div key={ramo} className="sbar">
                    <span className="lbl">{ramo}</span>
                    <div className="stack">
                      {vals.green > 0 && <div className="seg green" style={{ width: `${(vals.green / total) * 100}%` }}/>}
                      {vals.yellow > 0 && <div className="seg yellow" style={{ width: `${(vals.yellow / total) * 100}%` }}/>}
                      {vals.red > 0 && <div className="seg red" style={{ width: `${(vals.red / total) * 100}%` }}/>}
                    </div>
                    <span className="total">{total}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Histogram */}
      <div className="chart-card histogram-card">
        <h4>Distribución del score</h4>
        <div className="chart-sub">Buckets de 10 puntos · coloreado por zona de riesgo</div>
        <div style={{ paddingTop: 18 }}>
          <div className="histogram">
            {histogram.map((b, i) => (
              <div
                key={i}
                className="histo-bar"
                style={{
                  height: `${(b.count / maxHist) * 100}%`,
                  background: b.color,
                  opacity: 0.85
                }}
                title={`${b.range}: ${b.count} casos`}
              >
                {b.count > 0 && <span className="count">{b.count}</span>}
              </div>
            ))}
          </div>
          <div className="histo-x">
            {histogram.map((b, i) => <span key={i}>{b.range}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple Donut SVG
function DonutChart({ data, total, size = 180 }) {
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {data.map((d, i) => {
          const portion = d.value / total;
          const dash = portion * c;
          const seg = (
            <circle
              key={i}
              cx={size/2} cy={size/2} r={r}
              fill="none" stroke={d.color} strokeWidth="20"
              strokeDasharray={`${dash} ${c}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${size/2} ${size/2})`}
              style={{ transition: 'stroke-dasharray 0.5s' }}
            />
          );
          offset += dash;
          return seg;
        })}
        <circle cx={size/2} cy={size/2} r={r - 12} fill="var(--bg-surface)"/>
      </svg>
      <div className="donut-center">
        <div className="num">{total}</div>
        <div className="lbl">Casos</div>
      </div>
    </div>
  );
}

Object.assign(window, { PageInicio, PageDashboard });
