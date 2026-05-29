// ============================================================
// PAGE: RED DE RELACIONES + PROVEEDORES + AGENTE
// ============================================================

function PageRed({ onOpenCase }) {
  const [selectedNode, setSelectedNode] = useState(null);
  const [isolateMode, setIsolateMode] = useState(false);
  const [layout, setLayout] = useState(null);
  const svgRef = useRef(null);
  const W = 1100, H = 620;

  useEffect(() => {
    // Force-directed layout, manual implementation
    const nodes = window.FDATA.GRAPH_NODES.map(n => ({ ...n, x: W/2 + (Math.random()-0.5)*200, y: H/2 + (Math.random()-0.5)*200, vx: 0, vy: 0 }));
    const links = window.FDATA.GRAPH_LINKS.map(l => ({ ...l }));
    const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));

    const ITER = 220;
    for (let step = 0; step < ITER; step++) {
      // Repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const repulsion = 9000 / (dist * dist);
          const fx = (dx / dist) * repulsion;
          const fy = (dy / dist) * repulsion;
          a.vx -= fx; a.vy -= fy;
          b.vx += fx; b.vy += fy;
        }
      }
      // Spring
      links.forEach(l => {
        const a = nodeMap[l.source], b = nodeMap[l.target];
        if (!a || !b) return;
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const targetDist = 120;
        const force = (dist - targetDist) * 0.04;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      });
      // Center pull
      nodes.forEach(n => {
        n.vx += (W/2 - n.x) * 0.005;
        n.vy += (H/2 - n.y) * 0.005;
      });
      // Apply
      nodes.forEach(n => {
        n.vx *= 0.7; n.vy *= 0.7;
        n.x += n.vx; n.y += n.vy;
        n.x = Math.max(40, Math.min(W - 40, n.x));
        n.y = Math.max(40, Math.min(H - 40, n.y));
      });
    }

    setLayout({ nodes, links, nodeMap });
  }, []);

  const visibleNodes = useMemo(() => {
    if (!layout) return new Set();
    if (!isolateMode) return new Set(layout.nodes.map(n => n.id));
    const keep = new Set();
    // siniestros rojos + their direct neighbors
    const redSiniestros = layout.nodes.filter(n => n.type === 'siniestro' && n.nivel === 'red').map(n => n.id);
    redSiniestros.forEach(id => keep.add(id));
    layout.links.forEach(l => {
      if (redSiniestros.includes(l.source) || redSiniestros.includes(l.target)) {
        keep.add(l.source);
        keep.add(l.target);
      }
    });
    return keep;
  }, [layout, isolateMode]);

  const renderNode = (n) => {
    const isVisible = visibleNodes.has(n.id);
    if (!isVisible) return null;
    const sel = selectedNode?.id === n.id;
    const isClickable = true;

    if (n.type === 'asegurado') {
      return (
        <g key={n.id} transform={`translate(${n.x},${n.y})`} style={{cursor:'pointer'}}
           onClick={() => setSelectedNode(n)}>
          <circle r={n.size} fill="var(--accent)" fillOpacity="0.18" stroke="var(--accent)" strokeWidth={sel ? 2 : 1.2}/>
          <text textAnchor="middle" dy={n.size + 14} fill="var(--text-secondary)" fontSize="10" fontFamily="DM Mono">{n.id}</text>
        </g>
      );
    }
    if (n.type === 'proveedor') {
      const restrictiva = n.restrictiva;
      return (
        <g key={n.id} transform={`translate(${n.x},${n.y})`} style={{cursor:'pointer'}}
           onClick={() => setSelectedNode(n)}>
          <rect
            x={-n.size} y={-n.size} width={n.size*2} height={n.size*2}
            transform="rotate(45)"
            fill="var(--purple)" fillOpacity="0.18"
            stroke={restrictiva ? 'var(--risk-red)' : 'var(--purple)'}
            strokeWidth={restrictiva ? 1.8 : 1.2}
            style={restrictiva ? { animation: 'pulse 2s infinite' } : {}}
          />
          <text textAnchor="middle" dy={n.size + 14} fill="var(--text-secondary)" fontSize="10" fontFamily="DM Mono">{n.id}</text>
        </g>
      );
    }
    if (n.type === 'siniestro') {
      const color = n.nivel === 'red' ? 'var(--risk-red)' : n.nivel === 'yellow' ? 'var(--risk-yellow)' : 'var(--risk-green)';
      return (
        <g key={n.id} transform={`translate(${n.x},${n.y})`} style={{cursor:'pointer'}}
           onClick={() => onOpenCase(n.id)}>
          <rect x={-n.size} y={-n.size} width={n.size*2} height={n.size*2} fill={color} fillOpacity="0.25" stroke={color} strokeWidth="1.3"/>
          <text textAnchor="middle" dy={n.size + 12} fill="var(--text-tertiary)" fontSize="9" fontFamily="DM Mono">{n.id.replace('SIN-2026-', '')}</text>
        </g>
      );
    }
  };

  return (
    <div className="graph-page">
      <div className="graph-header">
        <div>
          <h2>Red de relaciones</h2>
          <div className="sub">Grafo interactivo · {window.FDATA.GRAPH_NODES.length} nodos · {window.FDATA.GRAPH_LINKS.length} aristas</div>
        </div>
        <div className="graph-actions">
          <button className={`btn ${isolateMode ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setIsolateMode(!isolateMode)}>
            <Icon.AlertTriangle/> {isolateMode ? 'Vista completa' : 'Aislar nodos críticos'}
          </button>
        </div>
      </div>

      <div className="graph-stage">
        <svg ref={svgRef} className="graph-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
          {/* defs for grid */}
          <defs>
            <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="rgba(30,32,40,0.7)"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" opacity="0.6"/>

          {/* Links */}
          {layout?.links.map((l, i) => {
            const a = layout.nodeMap[l.source];
            const b = layout.nodeMap[l.target];
            if (!a || !b) return null;
            if (!visibleNodes.has(a.id) || !visibleNodes.has(b.id)) return null;
            return (
              <line
                key={i}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={l.critical ? 'var(--risk-red)' : 'var(--border)'}
                strokeWidth={l.critical ? 1.5 : 1.2}
                strokeDasharray={l.critical ? '4 3' : ''}
                opacity={l.critical ? 0.65 : 0.55}
              />
            );
          })}

          {/* Nodes */}
          {layout?.nodes.map(renderNode)}
        </svg>

        {/* Legend */}
        <div className="graph-legend">
          <h5>Leyenda</h5>
          <div className="row">
            <div className="glyph"><svg width="14" height="14"><circle cx="7" cy="7" r="6" fill="var(--accent)" fillOpacity="0.3" stroke="var(--accent)" strokeWidth="1.2"/></svg></div>
            <span>Asegurado</span>
          </div>
          <div className="row">
            <div className="glyph"><svg width="14" height="14"><rect x="3" y="3" width="8" height="8" transform="rotate(45 7 7)" fill="var(--purple)" fillOpacity="0.3" stroke="var(--purple)" strokeWidth="1.2"/></svg></div>
            <span>Proveedor</span>
          </div>
          <div className="row">
            <div className="glyph"><svg width="14" height="14"><rect x="3" y="3" width="8" height="8" transform="rotate(45 7 7)" fill="none" stroke="var(--risk-red)" strokeWidth="1.4"/></svg></div>
            <span>Restrictivo</span>
          </div>
          <div className="row">
            <div className="glyph"><svg width="14" height="14"><rect x="2" y="2" width="10" height="10" fill="var(--risk-red)" fillOpacity="0.3" stroke="var(--risk-red)" strokeWidth="1.2"/></svg></div>
            <span>Siniestro</span>
          </div>
          <div className="row" style={{marginTop: 8, paddingTop: 6, borderTop: '1px solid var(--border)'}}>
            <div className="glyph"><svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke="var(--risk-red)" strokeWidth="1.5" strokeDasharray="4 3"/></svg></div>
            <span>Caso rojo</span>
          </div>
        </div>

        {selectedNode && (
          <NodePanel
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            onOpenCase={onOpenCase}
            links={layout?.links || []}
          />
        )}
      </div>
    </div>
  );
}

function NodePanel({ node, onClose, onOpenCase, links }) {
  const connections = links
    .filter(l => l.source === node.id || l.target === node.id)
    .map(l => l.source === node.id ? l.target : l.source);
  const uniqueConns = [...new Set(connections)];

  return (
    <div className="node-panel">
      <span className="close-btn" onClick={onClose}><Icon.X style={{width:16,height:16}}/></span>
      <h3>{node.id}</h3>
      <div className="node-type-badge">{node.type === 'asegurado' ? 'Asegurado' : node.type === 'proveedor' ? `Proveedor${node.restrictiva ? ' · Restrictivo' : ''}` : `Siniestro · ${node.nivel}`}</div>

      <div className="panel-metrics">
        {node.type === 'asegurado' && (
          <>
            <PanelMetric label="Casos" val={node.casos}/>
            <PanelMetric label="Score prom." val={node.scorePromedio}/>
            <PanelMetric label="Monto total" val={`$${(node.montoTotal/1000).toFixed(1)}k`}/>
            <PanelMetric label="Estado" val={node.scorePromedio >= 76 ? 'Crítico' : node.scorePromedio >= 41 ? 'Alerta' : 'OK'}/>
          </>
        )}
        {node.type === 'proveedor' && (
          <>
            <PanelMetric label="Casos asociados" val={node.casos}/>
            <PanelMetric label="Alertas" val={node.alertas}/>
            <PanelMetric label="Score prom." val={node.scorePromedio}/>
            <PanelMetric label="Restrictivo" val={node.restrictiva ? 'Sí' : 'No'}/>
          </>
        )}
        {node.type === 'siniestro' && (
          <>
            <PanelMetric label="Nivel" val={node.nivel.toUpperCase()}/>
            <PanelMetric label="Estado" val="En revisión"/>
          </>
        )}
      </div>

      <h4>Conexiones directas ({uniqueConns.length})</h4>
      <div className="connections">
        {uniqueConns.map(id => (
          <div key={id} className="conn-item" onClick={() => id.startsWith('SIN-') && onOpenCase(id)}>
            <span className="id">{id}</span>
          </div>
        ))}
      </div>

      {node.type === 'siniestro' && (
        <button className="btn btn-primary" style={{ width: '100%', marginTop: 16, justifyContent: 'center' }} onClick={() => onOpenCase(node.id)}>
          Ver caso completo <Icon.ArrowRight/>
        </button>
      )}
    </div>
  );
}

function PanelMetric({ label, val }) {
  return (
    <div className="panel-metric">
      <div className="lbl">{label}</div>
      <div className="val">{val}</div>
    </div>
  );
}

// ============================================================
// PROVEEDORES
// ============================================================
function PageProveedores({ onOpenCase }) {
  const ranking = window.FDATA.PROVEEDORES_RANKING;
  const [selectedProv, setSelectedProv] = useState(null);
  const [recoveryPct, setRecoveryPct] = useState(60);

  // Savings calculation
  const redCasesProvRecurrente = window.FDATA.ALL_CASOS.filter(c =>
    c.nivel === 'red' && c.flags?.proveedor_recurrente
  );
  const baseSavings = redCasesProvRecurrente.reduce((a, c) => a + c.monto_reclamado, 0);
  const savings = Math.round(baseSavings * (recoveryPct / 100));

  return (
    <div className="page">
      <h2 className="section-title">Ranking de proveedores</h2>
      <p className="section-sub">Ordenado por % de alertas descendente</p>

      <div className="cases-panel" style={{ maxHeight: 'calc(100vh - 380px)', minHeight: 360 }}>
        <div className="cases-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>ID Proveedor</th>
                <th>Casos totales</th>
                <th>Casos rojos</th>
                <th>% Alertas</th>
                <th>Monto promedio</th>
                <th>Lista restrictiva</th>
                <th>Nivel riesgo</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((p, i) => (
                <tr key={p.id} className={p.restrictiva ? 'restrictiva' : ''} onClick={() => setSelectedProv(p)}>
                  <td className="col-mono">#{i + 1}</td>
                  <td className="col-id">{p.id}</td>
                  <td className="col-mono" style={{ color: 'var(--text-primary)' }}>{p.casos}</td>
                  <td><span style={{ color: p.rojos > 0 ? 'var(--risk-red)' : 'var(--text-tertiary)', fontFamily: 'DM Mono' }}>{p.rojos}</span></td>
                  <td style={{ minWidth: 160 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${p.pct}%`, background: p.pct >= 50 ? 'var(--risk-red)' : p.pct >= 25 ? 'var(--risk-yellow)' : 'var(--risk-green)', borderRadius: 3 }}/>
                      </div>
                      <span style={{ fontFamily: 'DM Mono', fontSize: 12, color: 'var(--text-primary)', minWidth: 32, textAlign: 'right' }}>{p.pct}%</span>
                    </div>
                  </td>
                  <td className="col-money"><span className="dollar">$</span>{p.avg.toLocaleString('en-US')}</td>
                  <td>
                    {p.restrictiva
                      ? <span className="rule-chip red" style={{textTransform: 'uppercase', letterSpacing: '0.05em'}}>Restringido</span>
                      : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                  </td>
                  <td><RiskBadge nivel={p.nivel}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Savings Card */}
      <div className="savings-card">
        <div>
          <div className="label">Simulación de impacto</div>
          <p className="desc">
            Si se investigan todos los casos de proveedores en lista restrictiva, el monto potencialmente recuperable es:
          </p>
          <div className="value">${savings.toLocaleString('en-US')}</div>
          <p className="disclaimer">
            Estimación ilustrativa basada en patrones detectados ({redCasesProvRecurrente.length} casos rojos con proveedor recurrente, base de ${baseSavings.toLocaleString('en-US')}). No garantiza recuperación real.
          </p>
        </div>
        <div className="recovery-slider-wrap">
          <div className="label">% de recuperación estimado</div>
          <div className="display">{recoveryPct}%</div>
          <input
            type="range" min="0" max="100" value={recoveryPct}
            className="range-input"
            onChange={e => setRecoveryPct(Number(e.target.value))}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: 'DM Mono', fontSize: 10, color: 'var(--text-tertiary)' }}>
            <span>0%</span><span>100%</span>
          </div>
        </div>
      </div>

      {selectedProv && (
        <ProveedorPanel prov={selectedProv} onClose={() => setSelectedProv(null)} onOpenCase={onOpenCase}/>
      )}
    </div>
  );
}

function ProveedorPanel({ prov, onClose, onOpenCase }) {
  const provCasos = window.FDATA.ALL_CASOS.filter(c => c.proveedor === prov.id);
  const distribution = {
    red: provCasos.filter(c => c.nivel === 'red').length,
    yellow: provCasos.filter(c => c.nivel === 'yellow').length,
    green: provCasos.filter(c => c.nivel === 'green').length
  };
  const total = provCasos.length;

  return (
    <div className="proveedor-panel-detail" onClick={(e) => e.stopPropagation()}>
      <span className="close-btn" style={{position: 'absolute', top: 18, right: 18, cursor: 'pointer'}} onClick={onClose}>
        <Icon.X/>
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <h3 style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 700 }}>{prov.id}</h3>
        {prov.restrictiva && <span className="rule-chip red" style={{ textTransform: 'uppercase' }}>Restringido</span>}
      </div>
      <div style={{ fontFamily: 'DM Mono', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 20 }}>
        {prov.nombre}
      </div>

      <div className="panel-metrics">
        <PanelMetric label="Casos totales" val={prov.casos}/>
        <PanelMetric label="Casos rojos" val={prov.rojos}/>
        <PanelMetric label="Monto promedio" val={`$${(prov.avg/1000).toFixed(1)}k`}/>
        <PanelMetric label="Monto total" val={`$${(prov.total/1000).toFixed(1)}k`}/>
      </div>

      <h4 style={{ fontFamily: 'DM Mono', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginTop: 24, marginBottom: 10 }}>
        Últimos siniestros asociados
      </h4>
      <div className="connections">
        {provCasos.slice(0, 5).map(c => (
          <div key={c.id} className="conn-item" onClick={() => onOpenCase(c.id)}>
            <span className="id">{c.id}</span>
            <RiskBadge nivel={c.nivel}/>
            <span style={{ marginLeft: 'auto', fontFamily: 'DM Mono', fontSize: 11, color: 'var(--text-secondary)' }}>${c.monto_reclamado.toLocaleString('en-US')}</span>
          </div>
        ))}
      </div>

      <h4 style={{ fontFamily: 'DM Mono', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginTop: 24, marginBottom: 10 }}>
        Distribución de riesgo
      </h4>
      {total > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0' }}>
          <MiniDonut data={distribution} total={total}/>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'DM Mono', fontSize: 12, color: 'var(--text-secondary)' }}>
            <span><span style={{display:'inline-block', width:8, height:8, background:'var(--risk-red)', borderRadius:'50%', marginRight:6}}/>Rojos: {distribution.red}</span>
            <span><span style={{display:'inline-block', width:8, height:8, background:'var(--risk-yellow)', borderRadius:'50%', marginRight:6}}/>Amarillos: {distribution.yellow}</span>
            <span><span style={{display:'inline-block', width:8, height:8, background:'var(--risk-green)', borderRadius:'50%', marginRight:6}}/>Verdes: {distribution.green}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniDonut({ data, total }) {
  const size = 100, r = 38, c = 2 * Math.PI * r;
  let offset = 0;
  const segs = [
    { color: 'var(--risk-red)', value: data.red },
    { color: 'var(--risk-yellow)', value: data.yellow },
    { color: 'var(--risk-green)', value: data.green }
  ];
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size}>
        {segs.map((s, i) => {
          if (s.value === 0) return null;
          const portion = s.value / total;
          const dash = portion * c;
          const el = (
            <circle key={i} cx={size/2} cy={size/2} r={r} fill="none" stroke={s.color} strokeWidth="10"
              strokeDasharray={`${dash} ${c}`} strokeDashoffset={-offset}
              transform={`rotate(-90 ${size/2} ${size/2})`}/>
          );
          offset += dash;
          return el;
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne', fontWeight: 600, fontSize: 18 }}>
        {total}
      </div>
    </div>
  );
}

// ============================================================
// AGENTE
// ============================================================
function PageAgente({ initialQuestion }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (initialQuestion) {
      handleSend(initialQuestion);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thinking]);

  const respondTo = (q) => {
    const lower = q.toLowerCase();
    const all = window.FDATA.ALL_CASOS;
    const rojos = all.filter(c => c.nivel === 'red');

    if (lower.includes('cuántos casos rojos') || lower.includes('cuantos casos rojos')) {
      return {
        text: `Actualmente hay ${rojos.length} casos en nivel rojo (score ≥ 76). Esto representa el ${Math.round(rojos.length/all.length*100)}% del total de ${all.length} siniestros analizados. El monto reclamado en estos casos asciende a $${rojos.reduce((a,c)=>a+c.monto_reclamado,0).toLocaleString('en-US')}.`,
        type: 'direct'
      };
    }
    if (lower.includes('mayor concentración') || lower.includes('mayor concentracion') || (lower.includes('ramo') && lower.includes('fraude'))) {
      const ramos = {};
      rojos.forEach(c => { ramos[c.ramo] = (ramos[c.ramo] || 0) + 1; });
      const top = Object.entries(ramos).sort((a,b)=>b[1]-a[1])[0];
      return {
        text: `El ramo con mayor concentración de casos rojos es ${top[0]} con ${top[1]} de ${rojos.length} casos totales (${Math.round(top[1]/rojos.length*100)}%). El siguiente ramo es ${Object.entries(ramos).sort((a,b)=>b[1]-a[1])[1]?.[0] || 'N/A'}.`,
        type: 'direct'
      };
    }
    if (lower.includes('5 siniestros') || lower.includes('mayor score') || lower.includes('top') && lower.includes('score')) {
      const top5 = [...all].sort((a,b)=>b.score-a.score).slice(0,5);
      return {
        text: `Los 5 siniestros con mayor score son:\n${top5.map((c,i)=>`${i+1}. ${c.id} — score ${c.score} (${c.ramo}, ${c.ciudad}, $${c.monto_reclamado.toLocaleString('en-US')})`).join('\n')}`,
        type: 'direct'
      };
    }
    if (lower.includes('ciudad') && (lower.includes('crític') || lower.includes('critic'))) {
      const c = {};
      rojos.forEach(s => { c[s.ciudad] = (c[s.ciudad] || 0) + 1; });
      const top = Object.entries(c).sort((a,b)=>b[1]-a[1])[0];
      return {
        text: `${top[0]} concentra ${top[1]} de los ${rojos.length} casos rojos (${Math.round(top[1]/rojos.length*100)}%). El patrón sugiere revisión cruzada de proveedores en esa zona.`,
        type: 'direct'
      };
    }
    if (lower.includes('ahorro')) {
      const m = rojos.reduce((a,c)=>a+c.monto_reclamado,0);
      return {
        text: `El ahorro potencial estimado es $${Math.round(m*0.6).toLocaleString('en-US')}, calculado como el 60% del monto reclamado en casos rojos ($${m.toLocaleString('en-US')}). Esta estimación es ilustrativa y se basa en patrones detectados.`,
        type: 'direct'
      };
    }
    if (lower.includes('sin-2026-1042')) {
      const c = all.find(x => x.id === 'SIN-2026-1042');
      return {
        text: `Desglose del score para SIN-2026-1042 (total: ${c.score}/100):\n• Reglas de negocio: ${c.score_reglas}/40\n• Modelo IA: ${c.score_modelo}/30\n• Detección de anomalías: ${c.score_anomalias}/15\n• Similitud textual: ${c.score_nlp}/15 (raw: ${c.score_nlp_raw}/100)\nReglas activadas: ${c.reglas.join(', ')}.`,
        type: 'generated'
      };
    }
    if (lower.includes('restrictiva')) {
      const restricted = window.FDATA.PROVEEDORES_DATA.filter(p => p.restrictiva);
      return {
        text: `Hay ${restricted.length} proveedores en lista restrictiva:\n${restricted.map(p=>`• ${p.id} — ${p.nombre}`).join('\n')}`,
        type: 'direct'
      };
    }
    if (lower.includes('días de reporte') || lower.includes('dias de reporte')) {
      const avg = rojos.reduce((a,c)=>a+c.dias_a_reporte,0) / rojos.length;
      return {
        text: `El promedio de días entre ocurrencia y reporte en casos rojos es ${avg.toFixed(1)} días. Para casos verdes este indicador es notablemente menor (≈2.1 días).`,
        type: 'direct'
      };
    }
    if (lower.includes('distribución') || lower.includes('distribucion')) {
      return {
        text: `Distribución actual por nivel:\n• Verde: ${all.filter(c=>c.nivel==='green').length} casos\n• Amarillo: ${all.filter(c=>c.nivel==='yellow').length} casos\n• Rojo: ${all.filter(c=>c.nivel==='red').length} casos\nTotal analizado: ${all.length} siniestros.`,
        type: 'direct'
      };
    }
    if (lower.includes('top 3') || lower.includes('reglas') && lower.includes('frecuencia')) {
      const r = {};
      all.forEach(c => (c.reglas || []).forEach(re => { r[re] = (r[re] || 0) + 1; }));
      const top = Object.entries(r).sort((a,b)=>b[1]-a[1]).slice(0,3);
      return {
        text: `Top 3 reglas activadas con mayor frecuencia:\n${top.map((e,i)=>`${i+1}. ${e[0]} — ${e[1]} activaciones`).join('\n')}`,
        type: 'direct'
      };
    }
    if (lower.includes('monto') && lower.includes('promedio') && lower.includes('nivel')) {
      const byLevel = ['red', 'yellow', 'green'].map(n => {
        const sub = all.filter(c => c.nivel === n);
        const avg = sub.length ? sub.reduce((a,c)=>a+c.monto_reclamado, 0) / sub.length : 0;
        return { nivel: n, avg };
      });
      return {
        text: `Monto reclamado promedio por nivel:\n• Rojo: $${Math.round(byLevel[0].avg).toLocaleString('en-US')}\n• Amarillo: $${Math.round(byLevel[1].avg).toLocaleString('en-US')}\n• Verde: $${Math.round(byLevel[2].avg).toLocaleString('en-US')}`,
        type: 'direct'
      };
    }
    if (lower.includes('vehículos') || lower.includes('vehiculos') && lower.includes('inconsistente')) {
      const matches = all.filter(c => c.ramo === 'Vehículos' && c.flags?.docs_inconsistentes);
      return {
        text: `Encontré ${matches.length} casos en Vehículos con documentación inconsistente:\n${matches.map(c=>`• ${c.id} — score ${c.score}, ${c.ciudad}, $${c.monto_reclamado.toLocaleString('en-US')}`).join('\n')}`,
        type: 'generated'
      };
    }
    if (lower.includes('quito') && lower.includes('proveedor')) {
      const quitoCasos = all.filter(c => c.ciudad === 'Quito' && c.nivel === 'red');
      const counts = {};
      quitoCasos.forEach(c => { counts[c.proveedor] = (counts[c.proveedor] || 0) + 1; });
      const top = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
      return {
        text: `En Quito, el proveedor con mayor concentración de casos rojos es ${top?.[0] || 'N/A'} con ${top?.[1] || 0} casos de un total de ${quitoCasos.length} casos rojos en la ciudad.`,
        type: 'generated'
      };
    }
    if (lower.includes('patrón') || lower.includes('patron')) {
      return {
        text: `Análisis de patrón en primeros 10 días: identifiqué 3 casos con reclamos en los primeros 10 días de vigencia, todos en nivel amarillo o rojo. Esta proximidad temporal entre emisión y reclamo es una señal clásica que el modelo pondera en su evaluación.`,
        type: 'generated'
      };
    }

    return {
      text: `Esta es una respuesta orientativa. Para esa consulta específica recomiendo consultar la sección correspondiente del dashboard. Recuerda que toda decisión la toma un analista humano.`,
      type: 'direct'
    };
  };

  const handleSend = (text) => {
    const q = (text || input).trim();
    if (!q) return;
    const newMsgs = [...messages, { role: 'user', text: q, time: new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }) }];
    setMessages(newMsgs);
    setInput('');
    setThinking(true);
    setTimeout(() => {
      const r = respondTo(q);
      setMessages([...newMsgs, { role: 'agent', text: r.text, type: r.type, time: new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }) }]);
      setThinking(false);
    }, 700 + Math.random() * 500);
  };

  const ctx = {
    sinies: window.FDATA.ALL_CASOS.length,
    rojos: window.FDATA.ALL_CASOS.filter(c => c.nivel === 'red').length,
    avg: Math.round(window.FDATA.ALL_CASOS.reduce((a, c) => a + c.score, 0) / window.FDATA.ALL_CASOS.length)
  };

  return (
    <div className="agente-layout">
      {/* Sidebar */}
      <aside className="agente-side">
        <h3>Consultas frecuentes</h3>
        <div>
          {window.FDATA.SUGGESTED.map(s => (
            <div key={s} className="suggestion-chip" onClick={() => handleSend(s)}>
              <span>{s}</span>
              <Icon.ArrowRight className="arrow" style={{ width: 12, height: 12 }}/>
            </div>
          ))}
        </div>

        <div className="context-block">
          <div style={{ marginBottom: 6, color: 'var(--text-secondary)' }}>Contexto activo</div>
          <div className="ctx-row"><span>siniestros</span><span className="v">{ctx.sinies}</span></div>
          <div className="ctx-row"><span>rojos</span><span className="v" style={{color: 'var(--risk-red)'}}>{ctx.rojos}</span></div>
          <div className="ctx-row"><span>score prom.</span><span className="v">{ctx.avg}</span></div>
        </div>

        <h4 style={{ fontFamily: 'DM Mono', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginTop: 22, marginBottom: 10 }}>
          Ejemplos de consultas complejas
        </h4>
        {window.FDATA.COMPLEX_QUERIES.map(s => (
          <div key={s} className="suggestion-chip complex" onClick={() => handleSend(s)}>
            <span>{s}</span>
            <Icon.ArrowRight className="arrow" style={{ width: 12, height: 12, color: 'var(--purple)' }}/>
          </div>
        ))}
      </aside>

      {/* Chat */}
      <div className="chat-main">
        <div className="chat-scroll" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="chat-empty">
              <Icon.MessageBig/>
              <h3>¿En qué puedo ayudarte?</h3>
              <p>Pregunta sobre los siniestros, scores, proveedores o patrones detectados.</p>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`bubble-wrap ${m.role}`}>
                {m.role === 'user' ? (
                  <div className="bubble user">{m.text}</div>
                ) : (
                  <>
                    <div className="bubble">
                      <div className="header">
                        <span>FRAUD·IA</span>
                        <span className="time">{m.time}</span>
                      </div>
                      <div style={{ whiteSpace: 'pre-line' }}>{m.text}</div>
                    </div>
                    <div className="meta">
                      {m.type === 'generated' ? (
                        <><Icon.Code style={{width: 11, height: 11}}/> Consulta generada dinámicamente</>
                      ) : (
                        <><Icon.Zap style={{width: 11, height: 11}}/> Análisis directo</>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))
          )}
          {thinking && (
            <div className="bubble-wrap">
              <div className="bubble">
                <div className="header">
                  <span>FRAUD·IA</span>
                </div>
                <div className="thinking-dots"><span/><span/><span/></div>
              </div>
            </div>
          )}
        </div>

        <div className="chat-input-area">
          <div className="chat-input-row">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Escribe tu pregunta sobre los siniestros..."
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
            <button className={`chat-send ${input.trim() ? 'active' : ''}`} onClick={() => handleSend()}>
              <Icon.Send style={{ width: 14, height: 14 }}/>
            </button>
          </div>
          <div className="chat-disclaimer">
            Las respuestas son orientativas. Toda decisión la toma un analista humano.
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PageRed, PageProveedores, PageAgente });
