// ============================================================
// MAIN APP — Routing, toasts, command palette
// ============================================================

function App() {
  const [route, setRoute] = useState({ page: 'inicio', caseId: null, agenteQ: null });
  const [fileName, setFileName] = useState('siniestros_demo_2026.csv');
  const [toasts, setToasts] = useState([]);
  const [cmdOpen, setCmdOpen] = useState(false);

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);

  const navigate = (page, extra = {}) => {
    setRoute({ page, caseId: extra.caseId || null, agenteQ: extra.agenteQ || null });
  };

  // ⌘K shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(true);
      }
      if (e.key === 'Escape') {
        setCmdOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const onLoadDemo = () => {
    setFileName('siniestros_demo_2026.csv');
    showToast(`${window.FDATA.ALL_CASOS.length} registros cargados correctamente`);
    setTimeout(() => navigate('dashboard'), 600);
  };

  const onUpload = (name) => {
    setFileName(name);
    showToast(`${window.FDATA.ALL_CASOS.length} registros cargados desde ${name}`);
    setTimeout(() => navigate('dashboard'), 600);
  };

  const sectionLabels = {
    inicio: 'Inicio',
    dashboard: 'Dashboard',
    casos: 'Bandeja de casos',
    detalle: 'Detalle del siniestro',
    red: 'Red de relaciones',
    proveedores: 'Proveedores',
    agente: 'Agente IA'
  };

  // Inicio is full screen
  if (route.page === 'inicio') {
    return (
      <>
        <div className="app-shell no-sidebar">
          <PageInicio onLoadDemo={onLoadDemo} onUpload={onUpload}/>
        </div>
        <ToastContainer toasts={toasts}/>
      </>
    );
  }

  return (
    <>
      <div className="app-shell">
        <Sidebar
          current={route.page === 'detalle' ? 'casos' : route.page}
          onNavigate={(p) => navigate(p)}
          fileName={fileName}
          records={window.FDATA.ALL_CASOS.length}
        />
        <div className="main">
          <Topbar
            section={sectionLabels[route.page] || ''}
            breadcrumbExtra={route.page === 'detalle' ? route.caseId : null}
            onSearch={() => setCmdOpen(true)}
            onExport={() => showToast('Reporte exportado correctamente', 'success')}
          />
          {route.page === 'dashboard' && (
            <PageDashboard
              onNavigate={(p) => navigate(p)}
              casos={window.FDATA.ALL_CASOS}
            />
          )}
          {route.page === 'casos' && (
            <PageCasos
              onOpenCase={(id) => navigate('detalle', { caseId: id })}
              onExportToast={(msg) => showToast(msg)}
            />
          )}
          {route.page === 'detalle' && (
            <PageDetalle
              caseId={route.caseId}
              onBack={() => navigate('casos')}
              onOpenCase={(id) => navigate('detalle', { caseId: id })}
              onAgente={() => navigate('agente', { agenteQ: `Dame el desglose del score para ${route.caseId}` })}
            />
          )}
          {route.page === 'red' && (
            <PageRed onOpenCase={(id) => navigate('detalle', { caseId: id })}/>
          )}
          {route.page === 'proveedores' && (
            <PageProveedores onOpenCase={(id) => navigate('detalle', { caseId: id })}/>
          )}
          {route.page === 'agente' && (
            <PageAgente initialQuestion={route.agenteQ} key={route.agenteQ}/>
          )}
        </div>
      </div>

      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onSelect={(c) => { setCmdOpen(false); navigate('detalle', { caseId: c.id }); }}
      />

      <ToastContainer toasts={toasts}/>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
