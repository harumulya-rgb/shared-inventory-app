import { useEffect, useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { supabase } from '../supabaseClient';
import { useProfile } from '../contexts/ProfileContext';
import { X, Search, Plus, Filter, ArrowUpCircle, ArrowDownCircle, Edit2, Trash2, History } from 'lucide-react';

export default function MaterialsView() {
  const { 
    currentProfile, fields, activities, workgroups, 
    materials: rawMaterials, allEntries, materialCategories, 
    workers, vehicles, refreshProfileData 
  } = useProfile();
  
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', unit: '', price: '', material_no: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [selectedHistoryMaterial, setSelectedHistoryMaterial] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [activeTab, setActiveTab] = useState('registry'); // 'registry', 'herbicide', 'fertilizer', 'lcc', 'tools', 'ppe', 'workshop'
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  // Calculate enriched materials with stock levels reactively
  const materials = useMemo(() => {
    let stockMap = {};
    if (allEntries && Array.isArray(allEntries)) {
        allEntries.forEach(entry => {
            if (entry.materials_used && Array.isArray(entry.materials_used)) {
                entry.materials_used.forEach(mu => {
                    const id = String(mu.materialId);
                    const amt = parseFloat(mu.amount || 0);
                    if (!stockMap[id]) stockMap[id] = 0;
                    
                    if (mu.transaction_type === 'RECEIVE') {
                        stockMap[id] += amt;
                    } else {
                        stockMap[id] -= amt;
                    }
                });
            }
        });
    }

    if (!rawMaterials || !Array.isArray(rawMaterials)) return [];

    return rawMaterials.map(m => ({
        ...m,
        current_stock: stockMap[String(m.id)] || 0
    }));
  }, [rawMaterials, allEntries]);

  const filteredMaterials = useMemo(() => {
    if (!materials || !Array.isArray(materials)) return [];
    let result = materials.filter(m => {
        const matchesSearch = (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (m.material_no && String(m.material_no).toLowerCase().includes(searchTerm.toLowerCase())) ||
                             (m.category && String(m.category).toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCategory = categoryFilter === '' || m.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    // Apply Sorting
    result.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        if (sortConfig.key === 'current_stock' || sortConfig.key === 'price') {
            valA = Number(valA);
            valB = Number(valB);
        } else {
            valA = String(valA || '').toLowerCase();
            valB = String(valB || '').toLowerCase();
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    return result;
  }, [materials, searchTerm, categoryFilter, sortConfig]);

  const toggleSort = (key) => {
    setSortConfig(prev => ({
        key,
        direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const startEdit = (e, mat) => {
    e.stopPropagation();
    setEditingMaterial(mat.id);
    setEditForm({
      name: mat.name,
      unit: mat.unit,
      price: mat.price,
      material_no: mat.material_no || ''
    });
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const saveEdit = async () => {
    setEditLoading(true);
    const { error } = await supabase
      .from('materials')
      .update({
        name: editForm.name,
        unit: editForm.unit,
        price: Math.ceil((parseFloat(editForm.price) || 0) * 100) / 100,
        material_no: editForm.material_no || null
      })
      .eq('id', editingMaterial);
    
    setEditLoading(false);
    if (!error) {
      setEditingMaterial(null);
      await refreshProfileData();
    } else {
      alert("Error: " + error.message);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Delete ${name}?`)) {
      setLoading(true);
      const { error } = await supabase.from('materials').delete().eq('id', id);
      if (!error) await refreshProfileData();
      else { alert("Error: " + error.message); }
      setLoading(false);
    }
  };

  const getMaterialHistory = () => {
    if (!selectedHistoryMaterial) return [];
    const matId = String(selectedHistoryMaterial.id);
    let history = [];
    allEntries.forEach(entry => {
        if (!entry.materials_used) return;
        const used = entry.materials_used.find(mu => String(mu.materialId) === matId);
        if (used) {
            const field = fields.find(f => f.id === entry.field_id);
            const activity = activities.find(a => a.id === entry.activity_id);
            history.push({
                date: entry.date,
                amount: parseFloat(used.amount),
                type: used.transaction_type || 'ISSUE',
                field: field ? field.name : 'Unknown',
                activity: activity ? activity.name : 'Unknown'
            });
        }
    });
    return history.sort((a,b) => new Date(b.date) - new Date(a.date));
  };

  const getCategoryMovements = (categoryNames) => {
    // Get all materials in these categories
    if (!materials || !Array.isArray(materials)) return [];
    const categoryMaterials = materials.filter(m => {
      const cat = (m.category || 'Uncategorized').toLowerCase();
      return categoryNames.some(cn => cat.includes(cn.toLowerCase()));
    });
    const matIds = categoryMaterials.map(m => String(m.id));
    
    let movements = [];
    if (allEntries && Array.isArray(allEntries)) {
        allEntries.forEach(entry => {
            if (!entry.materials_used) return;
            entry.materials_used.forEach(mu => {
                if (matIds.includes(String(mu.materialId)) && mu.transaction_type === 'ISSUE') {
                    const material = categoryMaterials.find(m => String(m.id) === String(mu.materialId));
                    const field = (fields || []).find(f => f.id === entry.field_id);
                    const activity = (activities || []).find(a => a.id === entry.activity_id);
                    const workgroup = (workgroups || []).find(w => w.id === entry.workgroup_id);
                    const worker = (workers || []).find(w => w.id === entry.worker_id);
                    const vehicle = (vehicles || []).find(v => v.id === entry.vehicle_id);

                    const movement = {
                        date: entry.date,
                        materialName: material?.name || 'Unknown',
                        amount: mu.amount,
                        unit: material?.unit || '-',
                        workgroup: workgroup?.name || 'N/A',
                        activity: activity?.name || 'N/A',
                        field: field?.name || 'Inventory',
                        workerName: worker?.name || 'N/A',
                        vehicleDetails: vehicle ? `${vehicle.name} (${vehicle.registration_no || 'No Reg'})` : 'N/A'
                    };

                    // Apply Search Filter inside movement log
                    const matchesSearch = searchTerm === '' || 
                        movement.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        movement.workgroup.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        movement.activity.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        movement.field.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        movement.workerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        movement.vehicleDetails.toLowerCase().includes(searchTerm.toLowerCase());

                    if (matchesSearch) movements.push(movement);
                }
            });
        });
    }

    // Apply Sorting
    movements.sort((a, b) => {
        let valA = a[sortConfig.key] || '';
        let valB = b[sortConfig.key] || '';

        if (sortConfig.key === 'date') {
            valA = new Date(valA);
            valB = new Date(valB);
        } else if (sortConfig.key === 'amount') {
            valA = Number(valA);
            valB = Number(valB);
        } else {
            valA = String(valA).toLowerCase();
            valB = String(valB).toLowerCase();
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    return movements;
  };

  const renderRegistry = () => (
    <div className="animate-slide-up">
        <table className="modern-table">
          <thead>
            <tr>
              <th onClick={() => toggleSort('name')} style={{ cursor: 'pointer' }}>Material</th>
              <th onClick={() => toggleSort('category')} style={{ cursor: 'pointer' }}>Category</th>
              <th className="hide-mobile">Units</th>
              <th onClick={() => toggleSort('price')} style={{ cursor: 'pointer' }}>Price</th>
              <th onClick={() => toggleSort('current_stock')} style={{ cursor: 'pointer' }}>Stock</th>
              <th style={{ textAlign: 'right' }}>Management</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '80px', color: 'hsl(var(--text-muted))', background: 'transparent' }}>Synchronizing...</td></tr>
            ) : filteredMaterials.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '80px', color: 'hsl(var(--text-muted))', background: 'transparent' }}>No materials matched.</td></tr>
            ) : (
              filteredMaterials.map(mat => (
                <tr 
                  key={mat.id} 
                  onClick={() => { if(editingMaterial !== mat.id) setSelectedHistoryMaterial(mat); }}
                  style={{ cursor: editingMaterial === mat.id ? 'default' : 'pointer' }}
                >
                  {editingMaterial === mat.id ? (
                    <>
                      <td data-label="Material">
                        <input name="name" className="input-field" value={editForm.name} onChange={handleEditChange} style={{ marginBottom: '8px' }} />
                        <input name="material_no" className="input-field" value={editForm.material_no} onChange={handleEditChange} placeholder="Serial #" style={{ fontSize: '0.8rem' }} />
                      </td>
                      <td data-label="Category">
                        <span style={{ fontSize: '0.85rem' }}>{mat.category || 'Uncategorized'}</span>
                      </td>
                      <td data-label="Units">
                        <input name="unit" className="input-field" value={editForm.unit} onChange={handleEditChange} style={{ width: '100px' }} />
                      </td>
                      <td data-label="Price">
                        <input type="number" name="price" className="input-field" value={editForm.price} onChange={handleEditChange} style={{ width: '120px' }} />
                      </td>
                      <td data-label="Stock" style={{ fontWeight: 800 }}>{Number(mat.current_stock).toFixed(2)}</td>
                      <td data-label="Manage" style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button className="btn btn-secondary" style={{ padding: '8px 16px' }} onClick={(e) => { e.stopPropagation(); setEditingMaterial(null); }}>Discard</button>
                          <button className="btn btn-primary" style={{ padding: '8px 16px' }} onClick={(e) => { e.stopPropagation(); saveEdit(); }} disabled={editLoading}>Apply</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td data-label="Material">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'white' }}>{mat.name}</span>
                          {mat.material_no && <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', letterSpacing: '0.05em' }}>ID: #{mat.material_no}</span>}
                        </div>
                      </td>
                      <td data-label="Category">
                        <span style={{ 
                            fontSize: '0.8rem', 
                            padding: '4px 10px', 
                            borderRadius: '8px', 
                            background: mat.category ? 'hsla(var(--primary), 0.1)' : 'rgba(255,255,255,0.05)',
                            color: mat.category ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))',
                            fontWeight: 600
                        }}>
                          {mat.category || 'Uncategorized'}
                        </span>
                      </td>
                      <td data-label="Units" className="hide-mobile" style={{ color: 'hsl(var(--text-muted))', fontWeight: 500 }}>{mat.unit}</td>
                      <td data-label="Price" style={{ fontWeight: 700, color: 'hsl(var(--primary))' }}>${Number(mat.price).toFixed(2)}</td>
                      <td data-label="Stock">
                        <div style={{ 
                          display: 'inline-flex', 
                          padding: '4px 12px', 
                          borderRadius: '20px', 
                          background: mat.current_stock <= 0 ? 'hsla(var(--danger), 0.1)' : 'hsla(var(--success), 0.1)',
                          color: mat.current_stock <= 0 ? 'hsl(var(--danger))' : 'hsl(var(--success))',
                          fontWeight: 700,
                          fontSize: '0.85rem'
                        }}>
                          {Number(mat.current_stock).toFixed(2)} <span className="show-mobile" style={{ marginLeft: '4px', fontSize: '0.7rem' }}>{mat.unit}</span>
                        </div>
                      </td>
                      <td data-label="Manage" style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                          <button className="btn btn-secondary" style={{ padding: '8px' }} title="History" onClick={() => setSelectedHistoryMaterial(mat)}>
                            <History size={16} />
                          </button>
                          <button className="btn btn-secondary" style={{ padding: '8px' }} title="Edit" onClick={(e) => startEdit(e, mat)}>
                            <Edit2 size={16} />
                          </button>
                          <button className="btn" style={{ padding: '8px', background: 'hsla(var(--danger), 0.05)', color: 'hsl(var(--danger))', border: '1px solid hsla(var(--danger), 0.2)' }} onClick={() => handleDelete(mat.id, mat.name)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );

  const renderSpecializedTable = (categories, type) => {
    const movements = getCategoryMovements(categories);
    return (
      <div className="animate-slide-up">
        <table className="modern-table">
          <thead>
            <tr>
              <th onClick={() => toggleSort('date')} style={{ cursor: 'pointer' }}>Date Issuance {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
              {type === 'agronomical' && (
                <>
                  <th onClick={() => toggleSort('workgroup')} style={{ cursor: 'pointer' }}>Workgroup {sortConfig.key === 'workgroup' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                  <th onClick={() => toggleSort('activity')} style={{ cursor: 'pointer' }}>Activity {sortConfig.key === 'activity' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                  <th onClick={() => toggleSort('field')} style={{ cursor: 'pointer' }}>Field {sortConfig.key === 'field' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                </>
              )}
              {type === 'assets' && (
                <th onClick={() => toggleSort('workerName')} style={{ cursor: 'pointer' }}>Worker Name {sortConfig.key === 'workerName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
              )}
              {type === 'workshop' && (
                <th onClick={() => toggleSort('vehicleDetails')} style={{ cursor: 'pointer' }}>Vehicle Details {sortConfig.key === 'vehicleDetails' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
              )}
              <th onClick={() => toggleSort('materialName')} style={{ cursor: 'pointer' }}>Material {sortConfig.key === 'materialName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
              <th onClick={() => toggleSort('amount')} style={{ textAlign: 'right', cursor: 'pointer' }}>Quantity {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
            </tr>
          </thead>
          <tbody>
            {movements.length === 0 ? (
              <tr><td colSpan="10" style={{ textAlign: 'center', padding: '80px', color: 'hsl(var(--text-muted))', background: 'transparent' }}>No issuance history found for this category.</td></tr>
            ) : (
              movements.map((mov, idx) => (
                <tr key={idx}>
                  <td>{new Date(mov.date).toLocaleDateString()}</td>
                  {type === 'agronomical' && (
                    <>
                      <td style={{ fontWeight: 600 }}>{mov.workgroup}</td>
                      <td style={{ fontSize: '0.85rem' }}>{mov.activity}</td>
                      <td>
                        <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }}>{mov.field}</span>
                      </td>
                    </>
                  )}
                  {type === 'assets' && (
                    <td style={{ fontWeight: 700, color: 'white' }}>{mov.workerName}</td>
                  )}
                  {type === 'workshop' && (
                    <td style={{ fontWeight: 600 }}>{mov.vehicleDetails}</td>
                  )}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 700 }}>{mov.materialName}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: 'hsl(var(--primary))' }}>
                    {mov.amount.toFixed(2)} <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>{mov.unit}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      <header className="flex-mobile-column" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px', gap: '24px' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontWeight: 800 }}>Materials</h1>
          <p style={{ color: 'hsl(var(--text-muted))', fontSize: '1.1rem', marginBottom: '24px' }}>Global directory for estate inventory and unit logistics.</p>
          
          <div className="glass-panel flex-mobile-column" style={{ padding: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ flex: 1, position: 'relative', width: '100%' }}>
              <Search size={18} style={{ position: 'absolute', left: '16px', top: '14px', color: 'hsl(var(--text-muted))' }} />
              <input 
                type="text" 
                className="input-field" 
                placeholder="Search resources..." 
                style={{ width: '100%', paddingLeft: '48px' }} 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {activeTab === 'registry' && (
              <div style={{ width: '100%', maxWidth: '220px' }} className="mobile-maxWidth-none">
                <style>{`@media (max-width: 768px) { .mobile-maxWidth-none { max-width: none !important; } }`}</style>
                <select 
                  className="input-field" 
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">All Categories</option>
                  <option value="Uncategorized">Uncategorized</option>
                  {(materialCategories || []).map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
        <button className="btn btn-primary" style={{ padding: '14px 28px' }}>
          <Plus size={20} /> New Material
        </button>
      </header>

      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '32px', 
        overflowX: 'auto', 
        paddingBottom: '8px',
        scrollbarWidth: 'none'
      }}>
        {[
          { id: 'registry', label: 'All Materials' },
          { id: 'herbicide', label: 'Herbicide' },
          { id: 'fertilizer', label: 'Fertilizer' },
          { id: 'lcc', label: 'LCC' },
          { id: 'tools', label: 'Tools' },
          { id: 'ppe', label: 'PPE' },
          { id: 'workshop', label: 'Workshop' },
          { id: 'tyre', label: 'Tyre & Tube' },
          { id: 'fuel', label: 'Fuel & Lubricant' },
          { id: 'spare', label: 'Spare Part' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 24px',
              borderRadius: '12px',
              border: 'none',
              background: activeTab === tab.id ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.03)',
              color: activeTab === tab.id ? 'white' : 'hsl(var(--text-muted))',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
              border: activeTab === tab.id ? '1px solid hsl(var(--primary))' : '1px solid var(--glass-border)'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'registry' && renderRegistry()}
      {activeTab === 'herbicide' && renderSpecializedTable(['Herbicide', 'Herbicides'], 'agronomical')}
      {activeTab === 'fertilizer' && renderSpecializedTable(['Fertilizer', 'Fertilizers'], 'agronomical')}
      {activeTab === 'lcc' && renderSpecializedTable(['LCC'], 'agronomical')}
      {activeTab === 'tools' && renderSpecializedTable(['Tools', 'Tool'], 'assets')}
      {activeTab === 'ppe' && renderSpecializedTable(['PPE'], 'assets')}
      {activeTab === 'workshop' && renderSpecializedTable(['Workshop'], 'workshop')}
      {activeTab === 'tyre' && renderSpecializedTable(['Tyre', 'Tube'], 'workshop')}
      {activeTab === 'fuel' && renderSpecializedTable(['Fuel', 'Lubricant'], 'workshop')}
      {activeTab === 'spare' && renderSpecializedTable(['Spare Part'], 'workshop')}

      {selectedHistoryMaterial && ReactDOM.createPortal(
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '24px' }}>
          <div className="glass-panel animate-slide-up" style={{ width: '100%', maxWidth: '900px', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '40px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.02em' }}>Stock Trajectory</h2>
                <p style={{ color: 'hsl(var(--text-muted))', fontSize: '1.1rem' }}>
                  <span style={{ color: 'white', fontWeight: 700 }}>{selectedHistoryMaterial.name}</span> • Ledger visualization
                </p>
              </div>
              <button 
                onClick={() => setSelectedHistoryMaterial(null)}
                className="btn btn-secondary"
                style={{ padding: '10px', borderRadius: '50%' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
              {getMaterialHistory().length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px', color: 'hsl(var(--text-muted))', border: '2px dashed var(--glass-border)', borderRadius: 'var(--radius-lg)' }}>
                  No historical entries found for this asset.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {getMaterialHistory().map((log, index) => (
                    <div key={index} className="glass-panel" style={{ 
                      padding: '24px', 
                      background: 'rgba(255,255,255,0.02)', 
                      display: 'flex',
                      alignItems: 'center',
                      border: '1px solid hsla(var(--glass-border))'
                    }}>
                      <div style={{ 
                        width: '56px', height: '56px', 
                        borderRadius: '16px',
                        background: log.type === 'RECEIVE' ? 'hsla(var(--success), 0.1)' : 'hsla(var(--danger), 0.1)',
                        color: log.type === 'RECEIVE' ? 'hsl(var(--success))' : 'hsl(var(--danger))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginRight: '24px'
                      }}>
                        {log.type === 'RECEIVE' ? <ArrowDownCircle size={28} /> : <ArrowUpCircle size={28} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{log.type === 'RECEIVE' ? 'Inventory Inflow' : 'Operational Outflow'}</span>
                          <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '2px 10px', borderRadius: '12px', color: 'hsl(var(--text-muted))' }}>{log.field}</span>
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'hsl(var(--text-muted))', fontWeight: 500 }}>
                          {new Date(log.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} • {log.activity}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: log.type === 'RECEIVE' ? 'hsl(var(--success))' : 'white' }}>
                          {log.type === 'RECEIVE' ? '+' : '-'}{log.amount.toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', fontWeight: 700 }}>{selectedHistoryMaterial.unit}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}
