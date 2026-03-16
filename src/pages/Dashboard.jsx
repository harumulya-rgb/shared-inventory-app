import { useMemo, useState } from 'react';
import { useProfile } from '../contexts/ProfileContext';
import { 
    Package, TrendingUp, AlertCircle, Clock, Search, Filter, 
    ChevronLeft, ChevronRight, Edit2, Trash2, ArrowUpRight, ArrowDownLeft, CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SearchableSelect from '../components/SearchableSelect';

export default function Dashboard() {
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
            <p style={{ color: 'hsl(var(--text-muted))', fontSize: '1.1rem', fontWeight: 600 }}>Synchronizing Global Ledger...</p>
        </div>
    );
  }

  const handleDelete = async (entryId) => {
    if (window.confirm('Delete this movement entry and all associated line items?')) {
        const { error } = await deleteEntry(entryId);
        if (error) {
            setStatus({ type: 'error', message: `Expunge failed: ${error.message}` });
        } else {
            setStatus({ type: 'success', message: 'Logistical entry expunged from ledger.' });
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
        <h1 style={{ fontWeight: 800 }}>Intelligence</h1>
        <p style={{ color: 'hsl(var(--text-muted))', fontSize: '1.1rem' }}>Material trajectories and operational flow analytics.</p>
      </header>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        <div className="glass-panel" style={{ padding: '24px', position: 'relative' }}>
          <div style={{ padding: '12px', background: 'hsla(var(--primary), 0.1)', borderRadius: '16px', color: 'hsl(var(--primary))', width: 'fit-content', marginBottom: '20px' }}>
            <Package size={24} />
          </div>
          <div>
            <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Total Materials</p>
            <h2 style={{ fontSize: '2rem', margin: 0, fontWeight: 800 }}>{stats.totalMaterials}</h2>
          </div>
          <div className="hide-mobile" style={{ position: 'absolute', top: '10px', right: '10px', opacity: 0.1 }}><Package size={60} /></div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', position: 'relative' }}>
          <div style={{ padding: '12px', background: 'hsla(var(--success), 0.1)', borderRadius: '16px', color: 'hsl(var(--success))', width: 'fit-content', marginBottom: '20px' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Average Price</p>
            <h2 style={{ fontSize: '2rem', margin: 0, fontWeight: 800 }}>${stats.avgPrice}</h2>
          </div>
          <div className="hide-mobile" style={{ position: 'absolute', top: '10px', right: '10px', opacity: 0.1 }}><TrendingUp size={60} /></div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', position: 'relative' }}>
          <div style={{ padding: '12px', background: 'hsla(var(--warning), 0.1)', borderRadius: '16px', color: 'hsl(var(--warning))', width: 'fit-content', marginBottom: '20px' }}>
            <AlertCircle size={24} />
          </div>
          <div>
            <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Critial Alerts</p>
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
                        type="text" placeholder="Search..." 
                        style={{ padding: '10px 10px 10px 36px', borderRadius: '10px' }} 
                        className="input-field" 
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
                </div>
                <SearchableSelect 
                    options={[
                        { value: 'ALL', label: 'All Types' },
                        { value: 'ISSUE', label: 'Issuance' },
                        { value: 'RECEIVE', label: 'Receipt' }
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
                    <th>Destination / Context</th>
                    <th>Quantities</th>
                    <th style={{ textAlign: 'right' }}>Management</th>
                </tr>
            </thead>
            <tbody>
                {paginatedMovements.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '60px', color: 'hsl(var(--text-muted))', background: 'transparent' }}>No logistical movements synchronized.</td></tr>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--glass-border)' }}>
                <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>
                    Showing <span style={{ color: 'white', fontWeight: 600 }}>{(currentPage - 1) * itemsPerPage + 1}</span> to <span style={{ color: 'white', fontWeight: 600 }}>{Math.min(currentPage * itemsPerPage, movements.length)}</span> of <span style={{ color: 'white', fontWeight: 600 }}>{movements.length}</span> movements
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                        className="btn btn-secondary" 
                        disabled={currentPage === 1} 
                        onClick={() => setCurrentPage(p => p - 1)}
                        style={{ padding: '8px' }}
                    >
                        <ChevronLeft size={18} />
                    </button>
                    {[...Array(totalPages)].map((_, i) => (
                        <button 
                            key={i} 
                            onClick={() => setCurrentPage(i + 1)}
                            className={`btn ${currentPage === i + 1 ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ minWidth: '40px', padding: '8px' }}
                        >
                            {i + 1}
                        </button>
                    ))}
                    <button 
                        className="btn btn-secondary" 
                        disabled={currentPage === totalPages} 
                        onClick={() => setCurrentPage(p => p + 1)}
                        style={{ padding: '8px' }}
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
