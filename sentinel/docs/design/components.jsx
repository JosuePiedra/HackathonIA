// ============================================================
// SHARED COMPONENTS & ICONS
// ============================================================

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ----- Icons (inline SVG, lucide style) -----
const Icon = {
  Home: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V9.5z"/></svg>,
  Dashboard: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>,
  ListFilter: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/></svg>,
  GitFork: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="18" r="2"/><circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><path d="M18 8a4 4 0 0 1-4 4h-4a4 4 0 0 0-4 4"/><path d="M12 12v4"/></svg>,
  Building: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01M12 6h.01M12 10h.01M12 14h.01"/></svg>,
  Message: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M9 9l-2 2 2 2M15 9l2 2-2 2"/></svg>,
  Download: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>,
  Search: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>,
  Shield: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Upload: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg>,
  ArrowRight: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14M13 5l7 7-7 7"/></svg>,
  ArrowLeft: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>,
  AlertTriangle: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M10.3 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>,
  Check: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 6L9 17l-5-5"/></svg>,
  X: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M18 6L6 18M6 6l12 12"/></svg>,
  Send: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14M13 5l7 7-7 7"/></svg>,
  Sparkles: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2zM19 14l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM5 16l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/></svg>,
  MessageBig: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  Doc: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></svg>,
  Zap: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
  Code: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg>,
  Sort: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M7 11l5-5 5 5M7 13l5 5 5-5" opacity="0.5"/></svg>,
  ChevronDown: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 9l6 6 6-6"/></svg>,
  TrendUp: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 17l6-6 4 4 8-8M21 7h-6M21 7v6"/></svg>
};

// ----- RiskBadge -----
function RiskBadge({ nivel, label, large }) {
  const text = label || ({ green: 'Verde', yellow: 'Amarillo', red: 'Rojo' }[nivel] || nivel);
  return (
    <span className={`risk-badge ${nivel}${large ? ' large' : ''}`}>
      <span className="dot"></span>
      {text}
    </span>
  );
}

// ----- ScoreBar -----
function ScoreBar({ value, color, max = 100 }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="score-bar">
      <div
        className={`score-bar-fill ${color || 'accent'}`}
        style={{ '--fill': `${pct}%` }}
      />
    </div>
  );
}

// ----- Gauge (circular) -----
function Gauge({ value, size = 56, color = 'var(--accent)' }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth="4"/>
      <circle
        cx={size/2} cy={size/2} r={r}
        fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={c} strokeDashoffset={off}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
    </svg>
  );
}

// ----- KPI -----
function KPI({ label, value, sub, tone, gauge }) {
  return (
    <div className={`kpi ${tone ? 'kpi-' + tone : ''}`}>
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value ${tone || ''}`}>{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
      {gauge && <div className="gauge-wrap"><Gauge value={gauge.value} color={gauge.color}/></div>}
    </div>
  );
}

// ----- Sidebar -----
function Sidebar({ current, onNavigate, fileName, records }) {
  const redCount = window.FDATA.ALL_CASOS.filter(c => c.nivel === 'red').length;
  const items = [
    { id: 'inicio', label: 'Inicio', icon: Icon.Home },
    { id: 'dashboard', label: 'Dashboard', icon: Icon.Dashboard },
    { id: 'casos', label: 'Bandeja de casos', icon: Icon.ListFilter, badge: redCount },
    { id: 'red', label: 'Red de relaciones', icon: Icon.GitFork },
    { id: 'proveedores', label: 'Proveedores', icon: Icon.Building },
    { id: 'agente', label: 'Agente IA', icon: Icon.Message, live: true }
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">FRAUD<span className="dot">·</span>IA</div>
      <div className="sidebar-subtitle">Unidad Antifraude</div>
      <nav className="sidebar-nav">
        {items.map(it => {
          const I = it.icon;
          return (
            <div key={it.id} className={`nav-item ${current === it.id ? 'active' : ''}`} onClick={() => onNavigate(it.id)}>
              <I />
              <span>{it.label}</span>
              {it.badge ? <span className="badge-count">{it.badge}</span> : null}
              {it.live ? <span className="live-dot" /> : null}
            </div>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <div className="filename">{fileName || 'siniestros_2026.csv'}</div>
        <div className="records">{(records || 247).toLocaleString('es-EC')} registros</div>
        <button className="reload-btn" onClick={() => onNavigate('inicio')}>
          <Icon.Upload style={{width:12,height:12}} />
          Cargar nuevo CSV
        </button>
      </div>
    </aside>
  );
}

// ----- Topbar -----
function Topbar({ section, onSearch, onExport, breadcrumbExtra }) {
  return (
    <div className="topbar">
      <div className="breadcrumb">
        <span>FraudIA</span>
        <span className="sep">/</span>
        <span className="current">{section}</span>
        {breadcrumbExtra && <><span className="sep">/</span><span className="current mono">{breadcrumbExtra}</span></>}
      </div>
      <div className="search-box" onClick={onSearch}>
        <Icon.Search />
        <span className="placeholder">Buscar siniestro por ID...</span>
        <span className="kbd">⌘K</span>
      </div>
      <button className="btn btn-ghost" onClick={onExport}>
        <Icon.Download /> Exportar
      </button>
    </div>
  );
}

// ----- Toast system -----
function ToastContainer({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.type === 'success' ? <Icon.Check style={{width:14,height:14}}/> : <Icon.AlertTriangle style={{width:14,height:14}}/>}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ----- Command Palette -----
function CommandPalette({ open, onClose, onSelect }) {
  const [q, setQ] = useState('');
  const inputRef = useRef(null);
  useEffect(() => {
    if (open) {
      setQ('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);
  if (!open) return null;
  const results = window.FDATA.ALL_CASOS.filter(c =>
    c.id.toLowerCase().includes(q.toLowerCase()) ||
    (c.asegurado || '').toLowerCase().includes(q.toLowerCase()) ||
    (c.proveedor || '').toLowerCase().includes(q.toLowerCase())
  ).slice(0, 8);
  return (
    <div className="cmd-overlay" onClick={onClose}>
      <div className="cmd-modal" onClick={e => e.stopPropagation()}>
        <div className="cmd-input-row">
          <Icon.Search style={{width:16,height:16}}/>
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Busca siniestros por ID, asegurado o proveedor..."
            onKeyDown={e => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'Enter' && results[0]) { onSelect(results[0]); }
            }}
          />
          <span style={{fontFamily:'DM Mono', fontSize:10, color:'var(--text-tertiary)'}}>esc</span>
        </div>
        <div className="cmd-results">
          {results.length === 0 ? (
            <div style={{padding: 24, textAlign: 'center', color: 'var(--text-tertiary)', fontFamily: 'DM Mono', fontSize: 12}}>
              Sin resultados
            </div>
          ) : results.map((c, i) => (
            <div key={c.id} className={`cmd-result ${i === 0 ? 'active' : ''}`} onClick={() => onSelect(c)}>
              <span className="id">{c.id}</span>
              <RiskBadge nivel={c.nivel}/>
              <span style={{color:'var(--text-secondary)', fontSize:12}}>{c.ramo} · {c.ciudad}</span>
              <span className="meta">${c.monto_reclamado.toLocaleString('en-US')}</span>
            </div>
          ))}
        </div>
        <div className="cmd-footer">
          <span>↵ abrir</span>
          <span>↑↓ navegar</span>
          <span>esc cerrar</span>
        </div>
      </div>
    </div>
  );
}

// expose globally for other JSX files
Object.assign(window, {
  Icon, RiskBadge, ScoreBar, Gauge, KPI, Sidebar, Topbar, ToastContainer, CommandPalette
});
