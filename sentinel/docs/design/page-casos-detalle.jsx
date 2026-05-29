// ============================================================
// PAGE: BANDEJA DE CASOS + DETALLE
// ============================================================

function PageCasos({ onOpenCase, onExportToast }) {
  const allCasos = window.FDATA.ALL_CASOS;
  const [activeNiveles, setActiveNiveles] = useState({ green: true, yellow: true, red: true });
  const [activeRamos, setActiveRamos] = useState({});
  const [activeCiudades, setActiveCiudades] = useState({});
  const [proveedorQ, setProveedorQ] = useState('');
  const [scoreRange, setScoreRange] = useState([0, 100]);
  const [docToggles, setDocToggles] = useState({ incompletos: false, inconsistentes: false });
  const [alertToggles, setAlertToggles] = useState({ borde: false, tardio: false, atipico: false });
  const [sortBy, setSortBy] = useState('score');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const perPage = 20;

  const toggleNivel = (n) => setActiveNiveles({ ...activeNiveles, [n]: !activeNiveles[n] });
  const toggleRamo = (r) => setActiveRamos({ ...activeRamos, [r]: !activeRamos[r] });
  const toggleCiudad = (c) => setActiveCiudades({ ...activeCiudades, [c]: !activeCiudades[c] });

  const filtered = useMemo(() => {
    return allCasos.filter(c => {
      if (!activeNiveles[c.nivel]) return false;
      const anyRamo = Object.values(activeRamos).some(Boolean);
      if (anyRamo && !activeRamos[c.ramo]) return false;
      const anyCiudad = Object.values(activeCiudades).some(Boolean);
      if (anyCiudad && !activeCiudades[c.ciudad]) return false;
      if (proveedorQ && !c.proveedor.toLowerCase().includes(proveedorQ.toLowerCase())) return false;
      if (c.score < scoreRange[0] || c.score > scoreRange[1]) return false;
      if (docToggles.incompletos && !c.flags?.docs_incompletos) return false;
      if (docToggles.inconsistentes && !c.flags?.docs_inconsistentes) return false;
      if (alertToggles.borde && !c.flags?.borde_vigencia) return false;
      if (alertToggles.tardio && !c.flags?.reporte_tardio) return false;
      if (alertToggles.atipico && !c.flags?.monto_atipico) return false;
      return true;
    }).sort((a, b) => {
      const dir = sortDir === 'desc' ? -1 : 1;
      if (sortBy === 'score') return (a.score - b.score) * dir;
      if (sortBy === 'monto') return (a.monto_reclamado - b.monto_reclamado) * dir;
      if (sortBy === 'id') return a.id.localeCompare(b.id) * dir;
      return 0;
    });
  }, [allCasos, activeNiveles, activeRamos, activeCiudades, proveedorQ, scoreRange, docToggles, alertToggles, sortBy, sortDir]);

  const hasActiveFilters = Object.values(activeRamos).some(Boolean) ||
    Object.values(activeCiudades).some(Boolean) || proveedorQ ||
    scoreRange[0] !== 0 || scoreRange[1] !== 100 ||
    Object.values(docToggles).some(Boolean) || Object.values(alertToggles).some(Boolean) ||
    !(activeNiveles.green && activeNiveles.yellow && activeNiveles.red);

  const clearAll = () => {
    setActiveNiveles({ green: true, yellow: true, red: true });
    setActiveRamos({}); setActiveCiudades({});
    setProveedorQ('');
    setScoreRange([0, 100]);
    setDocToggles({ incompletos: false, inconsistentes: false });
    setAlertToggles({ borde: false, tardio: false, atipico: false });
  };

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="page" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="casos-layout" style={{ flex: 1, minHeight: 0 }}>
        {/* Filters Panel */}
        <div className="filters">
          <div className="filters-header">
            <h3>Filtros</h3>
            {hasActiveFilters && (
              <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }} onClick={clearAll}>
                Limpiar
              </button>
            )}
          </div>
          {hasActiveFilters && (
            <div className="filters-counter">{filtered.length} de {allCasos.length} resultados</div>
          )}

          <div className="filter-group">
            <div className="filter-group-label">Nivel de riesgo</div>
            <div className="pills">
              {['green', 'yellow', 'red'].map(n => (
                <button
                  key={n}
                  className={`pill ${n} ${activeNiveles[n] ? 'active' : ''}`}
                  onClick={() => toggleNivel(n)}
                >
                  <span className="dot"></span>
                  {n === 'green' ? 'Verde' : n === 'yellow' ? 'Amarillo' : 'Rojo'}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-group-label">Ramo</div>
            <div className="checks">
              {window.FDATA.RAMOS.map(r => (
                <div key={r} className={`check ${activeRamos[r] ? 'checked' : ''}`} onClick={() => toggleRamo(r)}>
                  <span className="box"></span>{r}
                </div>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-group-label">Ciudad</div>
            <div className="checks">
              {window.FDATA.CIUDADES.map(c => (
                <div key={c} className={`check ${activeCiudades[c] ? 'checked' : ''}`} onClick={() => toggleCiudad(c)}>
                  <span className="box"></span>{c}
                </div>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-group-label">Proveedor</div>
            <input
              className="text-input"
              placeholder="PRV-..."
              value={proveedorQ}
              onChange={e => setProveedorQ(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <div className="filter-group-label">Score final</div>
            <div className="range-slider">
              <div className="range-row">
                <span>{scoreRange[0]}</span>
                <span>{scoreRange[1]}</span>
              </div>
              <input
                type="range" min="0" max="100" value={scoreRange[0]}
                className="range-input"
                onChange={e => setScoreRange([Number(e.target.value), scoreRange[1]])}
              />
              <input
                type="range" min="0" max="100" value={scoreRange[1]}
                className="range-input"
                onChange={e => setScoreRange([scoreRange[0], Number(e.target.value)])}
              />
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-group-label">Documentos</div>
            <div className="toggles">
              <div className={`toggle ${docToggles.incompletos ? 'active' : ''}`} onClick={() => setDocToggles({...docToggles, incompletos: !docToggles.incompletos})}>
                <span>Solo incompletos</span>
                <span className="switch"></span>
              </div>
              <div className={`toggle ${docToggles.inconsistentes ? 'active' : ''}`} onClick={() => setDocToggles({...docToggles, inconsistentes: !docToggles.inconsistentes})}>
                <span>Solo inconsistentes</span>
                <span className="switch"></span>
              </div>
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-group-label">Alertas</div>
            <div className="toggles">
              <div className={`toggle ${alertToggles.borde ? 'active' : ''}`} onClick={() => setAlertToggles({...alertToggles, borde: !alertToggles.borde})}>
                <span>Borde vigencia</span><span className="switch"></span>
              </div>
              <div className={`toggle ${alertToggles.tardio ? 'active' : ''}`} onClick={() => setAlertToggles({...alertToggles, tardio: !alertToggles.tardio})}>
                <span>Reporte tardío</span><span className="switch"></span>
              </div>
              <div className={`toggle ${alertToggles.atipico ? 'active' : ''}`} onClick={() => setAlertToggles({...alertToggles, atipico: !alertToggles.atipico})}>
                <span>Monto atípico</span><span className="switch"></span>
              </div>
            </div>
          </div>
        </div>

        {/* Cases Panel */}
        <div className="cases-panel">
          <div className="cases-toolbar">
            <div className="info">
              <span style={{color:'var(--text-primary)'}}>{filtered.length}</span> casos
              {hasActiveFilters && <span style={{color:'var(--text-tertiary)'}}> · {allCasos.length} total</span>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost-red" onClick={() => onExportToast('Exportado: casos rojos (CSV)')}>
                <Icon.Download /> Casos rojos
              </button>
              <button className="btn btn-ghost" onClick={() => onExportToast('Exportado: Top 10 mayor riesgo (CSV)')}>
                <Icon.Download /> Top 10 mayor riesgo
              </button>
              <button className="btn btn-ghost" onClick={() => onExportToast('Exportado: reporte ejecutivo (HTML)')}>
                <Icon.Doc /> Reporte ejecutivo HTML
              </button>
            </div>
          </div>

          <div className="cases-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('id')}>ID Siniestro <Icon.Sort style={{width:11, height:11, opacity:0.5}}/></th>
                  <th>Nivel</th>
                  <th onClick={() => handleSort('score')}>Score <Icon.Sort style={{width:11, height:11, opacity:0.5}}/></th>
                  <th>Ramo</th>
                  <th>Ciudad</th>
                  <th>Proveedor</th>
                  <th onClick={() => handleSort('monto')} style={{textAlign:'right'}}>Monto <Icon.Sort style={{width:11, height:11, opacity:0.5}}/></th>
                  <th>Acción sugerida</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map(c => {
                  const action = c.nivel === 'red'
                    ? 'Investigación profunda + inspección física'
                    : c.nivel === 'yellow'
                      ? 'Verificación documental complementaria'
                      : 'Liquidación normal';
                  return (
                    <tr key={c.id} onClick={() => onOpenCase(c.id)}>
                      <td className="col-id">{c.id}</td>
                      <td><RiskBadge nivel={c.nivel}/></td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 100 }}>
                          <span className="col-score" style={{ color: c.nivel === 'red' ? 'var(--risk-red)' : c.nivel === 'yellow' ? 'var(--risk-yellow)' : 'var(--risk-green)' }}>{c.score}</span>
                          <ScoreBar value={c.score} color={c.nivel}/>
                        </div>
                      </td>
                      <td>{c.ramo}</td>
                      <td>{c.ciudad}</td>
                      <td className="col-mono">{c.proveedor}</td>
                      <td className="col-money"><span className="dollar">$</span>{c.monto_reclamado.toLocaleString('en-US')}</td>
                      <td>
                        <span style={{
                          display: 'inline-block', padding: '3px 8px', borderRadius: 4,
                          border: '1px solid var(--border)', fontFamily: 'DM Mono', fontSize: 11,
                          color: 'var(--text-secondary)',
                          maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                        }} title={action}>
                          {action}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <span>Mostrando {Math.min(perPage, filtered.length - (page - 1) * perPage)} de {filtered.length}</span>
            <div className="pages">
              <span className="pg" onClick={() => setPage(Math.max(1, page - 1))}>‹</span>
              {Array.from({ length: totalPages }).map((_, i) => (
                <span key={i} className={`pg ${i + 1 === page ? 'active' : ''}`} onClick={() => setPage(i + 1)}>{i + 1}</span>
              ))}
              <span className="pg" onClick={() => setPage(Math.min(totalPages, page + 1))}>›</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DETALLE SINIESTRO
// ============================================================
function PageDetalle({ caseId, onBack, onOpenCase, onAgente }) {
  const caso = window.FDATA.ALL_CASOS.find(c => c.id === caseId);
  if (!caso) return <div className="page">Caso no encontrado</div>;

  const action = caso.nivel === 'red'
    ? 'Investigación profunda + inspección física'
    : caso.nivel === 'yellow'
      ? 'Verificación documental complementaria'
      : 'Liquidación normal recomendada';

  const ratio = (caso.monto_reclamado / caso.suma_asegurada).toFixed(2);
  const reclamadoAlto = caso.monto_reclamado > caso.monto_estimado;

  const flagRow = (key, label) => {
    if (!caso.flags || caso.flags[key] === undefined) return { state: 'na', label };
    return { state: caso.flags[key] ? 'on' : 'off', label };
  };
  const flags = [
    flagRow('borde_vigencia', 'Borde vigencia'),
    flagRow('reporte_tardio', 'Reporte tardío'),
    flagRow('docs_incompletos', 'Docs incompletos'),
    flagRow('docs_inconsistentes', 'Docs inconsistentes'),
    flagRow('monto_atipico', 'Monto atípico'),
    flagRow('proveedor_recurrente', 'Proveedor recurrente')
  ];

  const money = (n) => '$' + (n || 0).toLocaleString('en-US');

  return (
    <div className="page" style={{ paddingBottom: 80 }}>
      <div className="detail-header">
        <span className="back-link" onClick={onBack}>
          <Icon.ArrowLeft style={{width: 14, height: 14}}/> Volver a bandeja
        </span>
        <div className="detail-title-row">
          <div>
            <div className="detail-title">{caso.id}</div>
            <div style={{ fontFamily: 'DM Mono', fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
              {caso.ramo} · {caso.cobertura} · {caso.ciudad}
            </div>
          </div>
          <RiskBadge nivel={caso.nivel} large/>
        </div>
        <div className={`detail-action-box ${caso.nivel}`}>
          <span style={{fontFamily: 'DM Mono', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.7, marginRight: 8}}>Acción sugerida:</span>
          {action}
        </div>
      </div>

      <div className="detail-grid">
        {/* Left col */}
        <div className="detail-col">
          {/* Score Analysis */}
          <div className="card">
            <div className="label-mono" style={{marginBottom: 6}}>Análisis de riesgo</div>
            <div className={`score-final ${caso.nivel}`}>{caso.score}</div>
            <div style={{fontFamily:'DM Mono', fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4}}>
              Score de riesgo · escala 0–100
            </div>

            <div className="score-components">
              <ScoreComp label="Reglas de negocio" pct="40%" raw={caso.score_reglas} max={40} color="gray"/>
              <ScoreComp label="Modelo IA" pct="30%" raw={caso.score_modelo} max={30} color="accent"/>
              <ScoreComp label="Detección anomalías" pct="15%" raw={caso.score_anomalias} max={15} color="purple"/>
              <ScoreComp label="Similitud textual" pct="15%" raw={caso.score_nlp} max={15} color="teal"/>
            </div>
          </div>

          {/* Reglas activadas */}
          <div className="card">
            <div className="label-mono" style={{marginBottom: 10}}>Reglas activadas</div>
            {caso.reglas && caso.reglas.length > 0 ? (
              <div className="rules-chips">
                {caso.reglas.map(r => (
                  <span key={r} className={`rule-chip ${caso.nivel === 'red' ? 'red' : 'yellow'}`}>{r}</span>
                ))}
              </div>
            ) : (
              <p style={{fontFamily:'DM Mono', fontSize:12, color:'var(--text-tertiary)'}}>Sin reglas activadas</p>
            )}

            {caso.alertas && caso.alertas.length > 0 && (
              <div className="alerts-list" style={{marginTop: 6}}>
                {caso.alertas.map((a, i) => (
                  <div key={i} className="alert">
                    <Icon.AlertTriangle/>
                    <span>{a}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* NLP */}
          {caso.descripcion && (
            <div className="card">
              <div className="label-mono" style={{marginBottom: 8}}>Análisis narrativo</div>
              <div className="narrative-text">{caso.descripcion}</div>
              {caso.score_nlp_raw !== undefined && (
                <div style={{display:'flex', alignItems:'center', gap: 14}}>
                  <div style={{flex: 1}}>
                    <div style={{display:'flex', justifyContent:'space-between', fontFamily:'DM Mono', fontSize:11, marginBottom: 4}}>
                      <span style={{color:'var(--text-tertiary)'}}>Similitud textual</span>
                      <span style={{color:'var(--text-primary)', fontWeight:500}}>{caso.score_nlp_raw}/100</span>
                    </div>
                    <ScoreBar value={caso.score_nlp_raw} color={caso.score_nlp_raw > 70 ? 'red' : caso.score_nlp_raw > 40 ? 'yellow' : 'green'}/>
                  </div>
                </div>
              )}
              {caso.score_nlp_raw > 70 && caso.similar_a && (
                <div className="narrative-alert">
                  <Icon.AlertTriangle/>
                  <span>Narrativa similar a <span onClick={() => onOpenCase(caso.similar_a)} style={{color: '#F97316', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600}}>{caso.similar_a}</span></span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right col */}
        <div className="detail-col">
          {/* Datos del reclamo */}
          <div className="card">
            <div className="label-mono" style={{marginBottom: 14}}>Datos del reclamo</div>
            <div className="data-grid">
              <DataCell label="Asegurado" value={caso.asegurado}/>
              <DataCell label="Ramo" value={caso.ramo}/>
              <DataCell label="Cobertura" value={caso.cobertura}/>
              <DataCell label="Ciudad" value={caso.ciudad}/>
              <DataCell label="Proveedor" value={caso.proveedor}/>
              <DataCell label="Días a reporte" value={`${caso.dias_a_reporte} días`}/>
              <DataCell label="Fecha ocurrencia" value={caso.fecha_ocurrencia}/>
              <DataCell label="Fecha reporte" value={caso.fecha_reporte}/>
              <DataCell label="Vigencia" value="2026-01-01 → 2026-12-31"/>
            </div>
          </div>

          {/* Montos */}
          <div className="card">
            <div className="label-mono" style={{marginBottom: 14}}>Montos</div>
            <div className="amounts-table">
              <div className="cell">
                <div className="lbl">Reclamado</div>
                <div className={`val ${reclamadoAlto ? 'red' : 'green'}`}>{money(caso.monto_reclamado)}</div>
              </div>
              <div className="cell">
                <div className="lbl">Estimado</div>
                <div className="val">{money(caso.monto_estimado)}</div>
              </div>
              <div className="cell">
                <div className="lbl">Pagado</div>
                <div className="val">{money(caso.monto_pagado)}</div>
              </div>
              <div className="row-full"><span className="lbl">Suma asegurada</span><span className="val">{money(caso.suma_asegurada)}</span></div>
              <div className="row-full" style={{borderTop: '1px solid var(--border)'}}><span className="lbl">Ratio reclamado / suma asegurada</span><span className="val">{ratio}</span></div>
            </div>
          </div>

          {/* Flags */}
          <div className="card">
            <div className="label-mono" style={{marginBottom: 14}}>Flags de riesgo</div>
            <div className="flag-chips">
              {flags.map(f => (
                <span key={f.label} className={`flag-chip ${f.state}`}>
                  {f.state === 'on' && <Icon.X style={{width:11, height:11}}/>}
                  {f.state === 'off' && <Icon.Check style={{width:11, height:11}}/>}
                  {f.state === 'na' && <span>—</span>}
                  {f.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div className="explanation-card" style={{marginTop: 16}}>
        <div className="lbl">Explicación del sistema</div>
        <p>{caso.explicacion_final || 'Sin explicación disponible.'}</p>
      </div>

      {/* Ethical */}
      <div className="ethic-card" style={{marginTop: 16}}>
        <Icon.Shield style={{width: 18, height: 18}}/>
        <div>
          <div className="lbl">Aviso importante</div>
          <p>{caso.mensaje_etico || 'Mensaje ético no disponible.'}</p>
          <p className="nota">Este análisis es una alerta de posible riesgo, no una acusación. Toda decisión debe ser tomada por un analista humano.</p>
        </div>
      </div>

      <button className="fab-agent" onClick={onAgente}>
        <Icon.Sparkles style={{width: 14, height: 14}}/>
        Consultar al agente
      </button>
    </div>
  );
}

function ScoreComp({ label, pct, raw, max, color }) {
  return (
    <div className="score-comp">
      <div className="row">
        <span className="lbl">{label}<span className="pct">{pct}</span></span>
        <span className="val">{raw}/{max}</span>
      </div>
      <ScoreBar value={raw} max={max} color={color}/>
    </div>
  );
}

function DataCell({ label, value }) {
  return (
    <div className="data-cell">
      <div className="lbl">{label}</div>
      <div className="val">{value}</div>
    </div>
  );
}

Object.assign(window, { PageCasos, PageDetalle });
