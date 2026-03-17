import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProfile } from '../contexts/ProfileContext';
import { 
    Package, TrendingUp, AlertCircle, Clock, Search, Filter, 
    ChevronLeft, ChevronRight, Edit2, Trash2, ArrowUpRight, ArrowDownLeft, CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SearchableSelect from '../components/SearchableSelect';

export default function Dashboard() {
  const { t } = useTranslation();
  const { materials, allEntries, fields, activities, workgroups, workers, vehicles, deleteEntry, updateEntry, isLoading } = useProfile();
  const navigate = useNavigate();

  // Filter & Pagination State
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [status, setStatus] = useState({ type: null, message: '' });

  // Flatten entries into movements
  const movements = useMemo(() => {
    let log = [];
    if (allEntries && Array.isArray(allEntries)) {
        allEntries.forEach(entry => {
            if (!entry.materials_used) return;
            entry.materials_used.forEach((mu, idx) => {
                const material = (materials || []).find(m => String(m.id) === String(mu.materialId));
                const field = (fields || []).find(f => f.id === entry.field_id);
                const activity = (activities || []).find(a => a.id === entry.activity_id);
                const workgroup = (workgroups || []).find(w => w.id === entry.workgroup_id);
                const worker = (workers || []).find(w => w.id === entry.worker_id);
                const vehicle = (vehicles || []).find(v => v.id === entry.vehicle_id);

                // Rich destination resolution: collect all valid parts
                let parts = [];
                if (mu.transaction_type === 'ISSUE') {
                    if (vehicle) parts.push(`${vehicle.name} (${vehicle.registration_no || 'N/A'})`);
                    if (worker) parts.push(worker.name);
                    if (field && !field.name.includes('[SYSTEM]')) parts.push(field.name);
                }
                
                const destination = parts.length > 0 ? parts.join(' / ') : (mu.transaction_type === 'RECEIVE' ? 'Inventory Recv' : 'Internal Adj');
                
                log.push({
                    id: `${entry.id}-${idx}`,
                    entryId: entry.id,
                    date: entry.date,
                    materialName: material?.name || 'Deleted Material',
                    unit: material?.unit || '-',
                    amount: mu.amount,
                    type: mu.transaction_type || 'ISSUE',
                    workgroup: workgroup?.name || 'N/A',
                    location: destination,
                    activity: (activity && !activity.name.includes('[SYSTEM]')) ? activity.name : '',
                    originalEntry: entry
                });
            });
        });
    }

    // Apply Filters ...
    let filtered = log;
    if (searchTerm) {
        filtered = filtered.filter(m => 
            m.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.workgroup.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.activity.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    if (typeFilter !== 'ALL') {
        filtered = filtered.filter(m => m.type === typeFilter);
    }

    // Apply Sorting
    filtered.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        
        if (sortConfig.key === 'date') {
            valA = new Date(valA);
            valB = new Date(valB);
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    return filtered;
  }, [allEntries, materials, fields, activities, workgroups, workers, vehicles, searchTerm, typeFilter, sortConfig]);

  // Pagination Logic ...
  const totalPages = Math.ceil(movements.length / itemsPerPage);
  const paginatedMovements = movements.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const stats = useMemo(() => {
    const total = (materials || []).length;
    const avg = total > 0 ? (materials.reduce((sum, m) => sum + Number(m.price || 0), 0) / total).toFixed(2) : '0.00';
    const alerts = (materials || []).filter(m => {
        const stock = (movements || []).filter(mov => mov.materialName === m.name).reduce((acc, curr) => acc + (curr.type === 'RECEIVE' ? curr.amount : -curr.amount), 0);
        return stock <= 0;
    }).length;
    return { totalMaterials: total, avgPrice: avg, alerts };
  }, [materials, movements]);

  if (isLoading && allEntries.length === 0) {
    return (
        <div className="animate-fade-in" style={{ height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px' }}>
            <div className="spinner" style={{ width: '50px', height: '50px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'hsl(var(--primary))', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <p style={{ color: 'hsl(var(--text-muted))', fontSize: '1.1rem', fontWeight: 600 }}>{t('dashboard.ledgerSync', 'Synchronizing Global Ledger...')}</p>
        </div>
    );
  }

  const handleDelete = async (entryId) => {
    if (window.confirm(t('dashboard.deleteConfirm', 'Delete this movement entry and all associated line items?'))) {
        const { error } = await deleteEntry(entryId);
        if (error) {
            setStatus({ type: 'error', message: `${t('dashboard.expungeFailed', 'Expunge failed')}: ${error.message}` });
        } else {
            setStatus({ type: 'success', message: t('dashboard.expunged', 'Logistical entry expunged from ledger.') });
            setTimeout(() => setStatus({ type: null, message: '' }), 4000);
        }
    }
  };

  const toggleSort = (key) => {
    setSortConfig(prev => ({
        key,
        direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '60px' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontWeight: 800 }}>{t('dashboard.intelligence', 'Intelligence')}</h1>
        <p style={{ color: 'hsl(var(--text-muted))', fontSize: '1.1rem' }}>{t('dashboard.subtitle', 'Material trajectories and operational flow analytics.')}</p>
      </header>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        <div className="glass-panel" style={{ padding: '24px', position: 'relative' }}>
          <div style={{ padding: '12px', background: 'hsla(var(--primary), 0.1)', borderRadius: '16px', color: 'hsl(var(--primary))', width: 'fit-content', marginBottom: '20px' }}>
            <Package size={24} />
          </div>
          <div>
            <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>{t('dashboard.totalMaterials', 'Total Materials')}</p>
            <h2 style={{ fontSize: '2rem', margin: 0, fontWeight: 800 }}>{stats.totalMaterials}</h2>
          </div>
          <div className="hide-mobile" style={{ position: 'absolute', top: '10px', right: '10px', opacity: 0.1 }}><Package size={60} /></div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', position: 'relative' }}>
          <div style={{ padding: '12px', background: 'hsla(var(--success), 0.1)', borderRadius: '16px', color: 'hsl(var(--success))', width: 'fit-content', marginBottom: '20px' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>{t('dashboard.avgPrice', 'Average Price')}</p>
            <h2 style={{ fontSize: '2rem', margin: 0, fontWeight: 800 }}>${stats.avgPrice}</h2>
          </div>
          <div className="hide-mobile" style={{ position: 'absolute', top: '10px', right: '10px', opacity: 0.1 }}><TrendingUp size={60} /></div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', position: 'relative' }}>
          <div style={{ padding: '12px', background: 'hsla(var(--warning), 0.1)', borderRadius: '16px', color: 'hsl(var(--warning))', width: 'fit-content', marginBottom: '20px' }}>
            <AlertCircle size={24} />
          </div>
          <div>
            <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>{t('dashboard.criticalAlerts', 'Critical Alerts')}</p>
            <h2 style={{ fontSize: '2rem', margin: 0, fontWeight: 800 }}>{stats.alerts}</h2>
          </div>
          <div className="hide-mobile" style={{ position: 'absolute', top: '10px', right: '10px', opacity: 0.1 }}><AlertCircle size={60} /></div>
        </div>
      </div>

      {/* Movement Log Table Section */}
      <div className="glass-panel animate-slide-up" style={{ padding: '32px' }}>
        {status.message && (
          <div className="animate-fade-in" style={{ 
            backgroundColor: status.type === 'error' ? 'hsla(var(--danger), 0.1)' : 'hsla(var(--success), 0.1)', 
            border: `1px solid ${status.type === 'error' ? 'hsla(var(--danger), 0.2)' : 'hsla(var(--success), 0.2)'}`,
            color: status.type === 'error' ? 'hsl(var(--danger))' : 'hsl(var(--success))', 
            padding: '16px 20px', borderRadius: 'var(--radius-md)', marginBottom: '32px', 
            display: 'flex', alignItems: 'center', gap: '16px', fontWeight: 600, fontSize: '1rem'
          }}>
            {status.type === 'error' ? <AlertCircle size={24} /> : <CheckCircle2 size={24} />}
            {status.message}
          </div>
        )}

        <div className="flex-mobile-column" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', gap: '20px' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Clock size={24} color="hsl(var(--primary))" />
                Movement Log
            </h3>
            <div className="flex-mobile-column" style={{ display: 'flex', gap: '12px' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                    <input 
                        type="text" placeholder={t('dashboard.search', 'Search...')}
                        style={{ padding: '10px 10px 10px 36px', borderRadius: '10px' }} 
                        className="input-field" 
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
                </div>
                <SearchableSelect 
                    options={[
                        { value: 'ALL', label: t('dashboard.allTypes', 'All Types') },
                        { value: 'ISSUE', label: t('dashboard.issuance', 'Issuance') },
                        { value: 'RECEIVE', label: t('dashboard.receipt', 'Receipt') }
                    ]}
                    value={typeFilter}
                    onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
                    className="dashboard-filter"
                />
            </div>
        </div>

        <table className="modern-table">
            <thead>
                <tr>
                    <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('date')}>Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                    <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('materialName')}>Resource {sortConfig.key === 'materialName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                    <th>{t('dashboard.destination', 'Destination / Context')}</th>
                    <th>{t('dashboard.quantities', 'Quantities')}</th>
                    <th style={{ textAlign: 'right' }}>{t('dashboard.management', 'Management')}</th>
                </tr>
            </thead>
            <tbody>
                {paginatedMovements.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '60px', color: 'hsl(var(--text-muted))', background: 'transparent' }}>{t('dashboard.noMovements', 'No logistical movements synchronized.')}</td></tr>
                ) : (
                    paginatedMovements.map((mov) => (
                        <tr key={mov.id}>
                            <td data-label="Date">
                                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{new Date(mov.date).toLocaleDateString()}</div>
                            </td>
                            <td data-label="Resource">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ padding: '6px', borderRadius: '8px', background: mov.type === 'RECEIVE' ? 'hsla(var(--success), 0.1)' : 'hsla(var(--danger), 0.1)', color: mov.type === 'RECEIVE' ? 'hsl(var(--success))' : 'hsl(var(--danger))' }}>
                                        {mov.type === 'RECEIVE' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                                    </div>
                                    <div style={{ fontWeight: 700 }}>{mov.materialName}</div>
                                </div>
                            </td>
                            <td data-label="Context">
                                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'white' }}>{mov.location}</div>
                                <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginTop: '2px' }}>
                                    {mov.activity}{mov.activity && mov.workgroup !== 'N/A' ? ' • ' : ''}
                                    {mov.workgroup !== 'N/A' ? mov.workgroup : ''}
                                    {!mov.activity && mov.workgroup === 'N/A' && <span style={{ fontStyle: 'italic' }}>Operational Intake</span>}
                                </div>
                            </td>
                            <td data-label="Quantity">
                                <div style={{ fontWeight: 800, color: mov.type === 'RECEIVE' ? 'hsl(var(--success))' : 'hsl(var(--danger))' }}>
                                    {mov.type === 'RECEIVE' ? '+' : '-'}{mov.amount} {mov.unit}
                                </div>
                            </td>
                            <td data-label="Actions" style={{ textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                    <button className="btn btn-secondary" style={{ padding: '8px' }} onClick={() => navigate('/issue', { state: { editId: mov.entryId }})} title="Modify Entry">
                                        <Edit2 size={16} />
                                    </button>
                                    <button 
                                        className="btn" 
                                        style={{ padding: '8px', background: 'hsla(var(--danger), 0.05)', color: 'hsl(var(--danger))', border: '1px solid hsla(var(--danger), 0.1)' }} 
                                        onClick={() => handleDelete(mov.entryId)}
                                        title="Expunge Entry"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>

        {/* Pagination Controls */}
        {totalPages > 1 && (
            <div className="flex-mobile-column" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--glass-border)', gap: '20px' }}>
                <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', margin: 0 }}>
                    {t('dashboard.showing', 'Showing')} <span style={{ color: 'white', fontWeight: 600 }}>{(currentPage - 1) * itemsPerPage + 1}</span> {t('dashboard.to', 'to')} <span style={{ color: 'white', fontWeight: 600 }}>{Math.min(currentPage * itemsPerPage, movements.length)}</span> {t('dashboard.of', 'of')} <span style={{ color: 'white', fontWeight: 600 }}>{movements.length}</span>
                </p>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button 
                        className="btn btn-secondary" 
                        disabled={currentPage === 1} 
                        onClick={() => setCurrentPage(p => p - 1)}
                        style={{ padding: '8px', minWidth: '36px' }}
                    >
                        <ChevronLeft size={16} />
                    </button>

                    {(() => {
                        const pages = [];
                        const delta = window.innerWidth < 640 ? 1 : 2; // Show fewer neighbors on very small screens
                        
                        for (let i = 1; i <= totalPages; i++) {
                            if (
                                i === 1 || 
                                i === totalPages || 
                                (i >= currentPage - delta && i <= currentPage + delta)
                            ) {
                                pages.push(i);
                            } else if (
                                (i === currentPage - delta - 1) || 
                                (i === currentPage + delta + 1)
                            ) {
                                pages.push('...');
                            }
                        }

                        // Remove duplicate ellipses
                        const uniquePages = pages.filter((item, index) => pages.indexOf(item) === index);

                        return uniquePages.map((page, i) => (
                            page === '...' ? (
                                <span key={`sep-${i}`} style={{ color: 'hsl(var(--text-muted))', padding: '0 4px' }}>...</span>
                            ) : (
                                <button 
                                    key={page} 
                                    onClick={() => setCurrentPage(page)}
                                    className={`btn ${currentPage === page ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{ minWidth: '36px', padding: '8px', height: '36px', fontSize: '0.85rem' }}
                                >
                                    {page}
                                </button>
                            )
                        ));
                    })()}

                    <button 
                        className="btn btn-secondary" 
                        disabled={currentPage === totalPages} 
                        onClick={() => setCurrentPage(p => p + 1)}
                        style={{ padding: '8px', minWidth: '36px' }}
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
