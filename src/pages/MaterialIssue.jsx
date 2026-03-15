import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useProfile } from '../contexts/ProfileContext';
import { Send, Plus, Trash2, CheckCircle2, AlertCircle, ArrowDownCircle, ArrowUpCircle, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import SearchableSelect from '../components/SearchableSelect';

export default function MaterialIssue() {
    const { currentProfile, fields, activities, workgroups, workers, vehicles, materials, materialLogs, systemDestinations, allEntries, refreshProfileData } = useProfile();
    const location = useLocation();
    const navigate = useNavigate();
    const editId = location.state?.editId;

    const [transactionMode, setTransactionMode] = useState('ISSUE');
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        fieldId: '',
        activityId: '',
        workgroupId: '',
        workerId: '',
        vehicleId: '',
        selectedMaterials: []
    });
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ type: null, message: '' });

    // Handle Edit Initialization
    useEffect(() => {
        if (editId && allEntries.length > 0) {
            const entry = allEntries.find(e => e.id === editId);
            if (entry) {
                // Determine mode from the first material (usually they are all same type in one entry)
                const mode = entry.materials_used[0]?.transaction_type || 'ISSUE';
                setTransactionMode(mode);
                setFormData({
                    date: entry.date,
                    fieldId: entry.field_id || '',
                    activityId: entry.activity_id || '',
                    workgroupId: entry.workgroup_id || '',
                    selectedMaterials: entry.materials_used.map(mu => ({
                        materialId: mu.materialId,
                        amount: mu.amount,
                        unitPrice: mu.unitPrice
                    })),
                    workerId: entry.worker_id || '',
                    vehicleId: entry.vehicle_id || ''
                });
            }
        }
    }, [editId, allEntries]);

    const getBestPrice = (materialId, date) => {
        if (!materialId) return 0;
        const targetDate = new Date(date);
        const targetMat = materials.find(m => String(m.id) === String(materialId));
        if (!targetMat) return 0;
        const logs = materialLogs
            .filter(l => String(l.material_id) === String(materialId))
            .sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at));
        const validLog = logs.find(l => new Date(l.changed_at) <= targetDate);
        return validLog ? validLog.price : targetMat.price;
    };

    useEffect(() => {
        // Only auto-update prices if NOT in edit mode to preserve historical prices
        if (editId) return;
        
        setFormData(prev => {
            if (prev.selectedMaterials.length === 0) return prev;
            let hasChanges = false;
            const updated = prev.selectedMaterials.map(item => {
                if (!item.materialId) return item;
                const newPrice = getBestPrice(item.materialId, prev.date);
                if (item.unitPrice !== newPrice) {
                    hasChanges = true;
                    return { ...item, unitPrice: newPrice };
                }
                return item;
            });
            return hasChanges ? { ...prev, selectedMaterials: updated } : prev;
        });
    }, [formData.date, materialLogs, materials, editId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newData = { ...prev, [name]: value };
            if (name === 'workgroupId') newData.activityId = '';
            return newData;
        });
    };

    const addMaterialRow = () => {
        setFormData(prev => ({
            ...prev,
            selectedMaterials: [...prev.selectedMaterials, { materialId: '', amount: '', unitPrice: 0 }]
        }));
    };

    const updateMaterialRow = (index, field, value) => {
        const newMaterials = [...formData.selectedMaterials];
        if (field === 'materialId') {
            const bestPrice = getBestPrice(value, formData.date);
            newMaterials[index] = { ...newMaterials[index], [field]: value, unitPrice: bestPrice };
        } else {
            newMaterials[index] = { ...newMaterials[index], [field]: value };
        }
        setFormData({ ...formData, selectedMaterials: newMaterials });
    };

    const removeMaterialRow = index => {
        setFormData(prev => ({ ...prev, selectedMaterials: prev.selectedMaterials.filter((_, i) => i !== index) }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!currentProfile) {
            setStatus({ type: 'error', message: 'No Estate Session detected.' });
            return;
        }
        if (transactionMode === 'ISSUE') {
            const selectedCats = formData.selectedMaterials.map(sm => {
                const mat = materials.find(m => String(m.id) === String(sm.materialId));
                return (mat?.category || '').toLowerCase();
            });
            const hasAgronomical = selectedCats.some(cat => 
                cat.includes('herbicide') || cat.includes('fertilizer') || cat.includes('lcc')
            );
            const hasAssets = selectedCats.some(cat => cat.includes('tools') || cat.includes('ppe'));
            const hasWorkshop = selectedCats.some(cat => 
                cat.includes('workshop') || cat.includes('tyre') || cat.includes('tube') || 
                cat.includes('fuel') || cat.includes('lubricant') || cat.includes('spare part')
            );

            if (hasAgronomical && (!formData.fieldId || !formData.activityId || !formData.workgroupId)) {
                setStatus({ type: 'error', message: 'Agronomical distribution requires Field, Activity, and Workgroup.' });
                return;
            }
            if (hasAssets && !formData.workerId) {
                setStatus({ type: 'error', message: 'Asset issuance (Tools/PPE) requires a Responsible Worker.' });
                return;
            }
            if (hasWorkshop && !formData.vehicleId) {
                setStatus({ type: 'error', message: 'Workshop issuance requires an Assigned Vehicle.' });
                return;
            }
        }
        const validMaterials = formData.selectedMaterials
            .filter(m => m.materialId && m.amount)
            .map(m => ({
                materialId: m.materialId,
                amount: parseFloat(m.amount),
                unitPrice: parseFloat(m.unitPrice || 0),
                transaction_type: transactionMode
            }));

        if (validMaterials.length === 0) {
            setStatus({ type: 'error', message: 'No materials defined for this transaction.' });
            return;
        }

        setLoading(true);
        const payload = {
            profile_id: currentProfile.id,
            date: formData.date,
            field_id: (transactionMode === 'ISSUE' && formData.fieldId) ? formData.fieldId : systemDestinations?.fieldId,
            activity_id: (transactionMode === 'ISSUE' && formData.activityId) ? formData.activityId : systemDestinations?.activityId,
            workgroup_id: transactionMode === 'ISSUE' ? (formData.workgroupId || null) : null,
            worker_id: transactionMode === 'ISSUE' ? (formData.workerId || null) : null,
            vehicle_id: transactionMode === 'ISSUE' ? (formData.vehicleId || null) : null,
            materials_used: validMaterials,
            labor_days: 0, overtime: 0, hectare_achieve: 0, is_complete: false
        };

        const { error } = editId 
            ? await supabase.from('entries').update(payload).eq('id', editId)
            : await supabase.from('entries').insert([payload]);

        setLoading(false);
        if (error) setStatus({ type: 'error', message: error.message });
        else {
            setStatus({ type: 'success', message: editId ? 'Movement successfully localized.' : `Transaction verified: ${transactionMode === 'ISSUE' ? 'Issuance' : 'Receipt'} recorded.` });
            await refreshProfileData();
            
            setTimeout(() => {
                setStatus({ type: null, message: '' });
                if (editId) navigate('/');
            }, editId ? 2000 : 6000);
        }
    };

    return (
        <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '60px' }}>
            <header style={{ marginBottom: '56px' }}>
                <h1 className="mobile-title-lg" style={{ fontWeight: 800, marginBottom: '12px', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {transactionMode === 'ISSUE' ? <ArrowUpCircle size={40} color="hsl(var(--danger))" /> : <ArrowDownCircle size={40} color="hsl(var(--success))" />}
                    Inventory Flow
                </h1>
                <style>
                  {`
                    @media (max-width: 768px) {
                      .mobile-title-lg { font-size: 2rem !important; }
                      .mode-switcher { width: 100% !important; display: flex !important; }
                      .mode-switcher button { flex: 1 !important; text-align: center !important; }
                      .issue-form { padding: 24px !important; }
                      .material-row { grid-template-columns: 1fr !important; gap: 12px !important; }
                      .metadata-grid { grid-template-columns: 1fr !important; gap: 20px !important; }
                      .form-actions { flex-direction: column !important; gap: 12px !important; }
                      .form-actions button { width: 100% !important; }
                    }
                  `}
                </style>
                <p style={{ color: 'hsl(var(--text-muted))', fontSize: '1.1rem' }}>
                    {transactionMode === 'ISSUE' 
                        ? 'Register material distribution to specialized fields and operational workgroups.' 
                        : 'Capitalize new inventory inflows and update global stock ledger.'}
                </p>
            </header>

            {/* Mode Switcher */}
            <div className="mode-switcher" style={{ 
                display: 'flex', 
                gap: '8px', 
                marginBottom: '40px', 
                background: 'rgba(255,255,255,0.03)', 
                padding: '8px', 
                borderRadius: '20px', 
                width: 'fit-content',
                border: '1px solid var(--glass-border)',
                backdropFilter: 'blur(10px)'
            }}>
                <button 
                    onClick={() => { setTransactionMode('ISSUE'); setStatus({type:null, message:''}); }}
                    style={{ 
                        background: transactionMode === 'ISSUE' ? 'hsl(var(--danger))' : 'transparent', 
                        color: transactionMode === 'ISSUE' ? 'white' : 'hsl(var(--text-muted))',
                        border: 'none', borderRadius: '14px', 
                        padding: '12px 28px', fontWeight: 700, 
                        transition: 'var(--transition)',
                        cursor: 'pointer',
                        fontSize: '0.95rem'
                    }}
                >
                    Issuance
                </button>
                <button 
                    onClick={() => { setTransactionMode('RECEIVE'); setStatus({type:null, message:''}); }}
                    style={{ 
                        background: transactionMode === 'RECEIVE' ? 'hsl(var(--success))' : 'transparent', 
                        color: transactionMode === 'RECEIVE' ? 'white' : 'hsl(var(--text-muted))',
                        border: 'none', borderRadius: '14px', 
                        padding: '12px 28px', fontWeight: 700, 
                        transition: 'var(--transition)',
                        cursor: 'pointer',
                        fontSize: '0.95rem'
                    }}
                >
                    Receiving
                </button>
            </div>

            {status.message && (
                <div style={{
                    padding: '20px 24px', borderRadius: 'var(--radius-md)', marginBottom: '32px',
                    display: 'flex', alignItems: 'center', gap: '16px',
                    background: status.type === 'error' ? 'hsla(var(--danger), 0.1)' : 'hsla(var(--success), 0.1)',
                    border: `1px solid ${status.type === 'error' ? 'hsla(var(--danger), 0.2)' : 'hsla(var(--success), 0.2)'}`,
                    color: status.type === 'error' ? 'hsl(var(--danger))' : 'hsl(var(--success))',
                    fontWeight: 600,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                }}>
                    {status.type === 'error' ? <AlertCircle size={24} /> : <CheckCircle2 size={24} />}
                    <span style={{ fontSize: '1.05rem' }}>{status.message}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="glass-panel issue-form" style={{ padding: '48px' }}>
                <div className="flex-mobile-column" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', gap: '16px' }}>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>Line Items</h3>
                    <button type="button" onClick={addMaterialRow} className="btn btn-secondary" style={{ padding: '8px 24px', borderRadius: '12px' }}>
                        <Plus size={18} /> New Item
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '48px' }}>
                    {formData.selectedMaterials.length === 0 ? (
                        <div 
                            onClick={addMaterialRow}
                            style={{ 
                                padding: '60px', textAlign: 'center', border: '2px dashed var(--glass-border)', 
                                borderRadius: 'var(--radius-lg)', color: 'hsl(var(--text-muted))',
                                cursor: 'pointer', transition: 'var(--transition)'
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = 'hsl(var(--primary))'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                        >
                            No resources staged. Click to add a material and begin transaction.
                        </div>
                    ) : (
                        formData.selectedMaterials.map((item, index) => {
                            const selectedMat = materials.find(m => String(m.id) === String(item.materialId));
                            const activeLogs = materialLogs.filter(l => String(l.material_id) === String(item.materialId)).sort((a,b) => new Date(b.changed_at) - new Date(a.changed_at));

                            return (
                                <div key={index} className="animate-slide-up material-row" style={{ 
                                    display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) 1fr 1fr auto', gap: '16px', 
                                    background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: 'var(--radius-md)', alignItems: 'center',
                                    border: '1px solid var(--glass-border)',
                                    position: 'relative'
                                }}>
                                    <SearchableSelect 
                                        options={materials.map(m => ({ value: m.id, label: m.name }))}
                                        value={item.materialId} 
                                        onChange={e => updateMaterialRow(index, 'materialId', e.target.value)} 
                                        placeholder="-- Select Material --"
                                        required
                                    />

                                    <div style={{ position: 'relative' }}>
                                        <input type="number" step="0.01" min="0" placeholder="Qty" className="input-field" value={item.amount} onChange={e => updateMaterialRow(index, 'amount', e.target.value)} required />
                                        <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontWeight: 700 }}>{selectedMat?.unit}</span>
                                    </div>

                                    <div style={{ position: 'relative' }}>
                                        <SearchableSelect 
                                            options={selectedMat ? [
                                                { value: selectedMat.price, label: `$${selectedMat.price} (Current)` },
                                                ...activeLogs.map(log => ({ value: log.price, label: `$${log.price} (${new Date(log.changed_at).toLocaleDateString()})` }))
                                            ] : []}
                                            value={item.unitPrice || ''} 
                                            onChange={e => updateMaterialRow(index, 'unitPrice', e.target.value)} 
                                            placeholder="$"
                                        />
                                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))', fontSize: '0.9rem' }}>$</span>
                                    </div>

                                    <button 
                                        type="button" 
                                        onClick={() => removeMaterialRow(index)} 
                                        style={{ 
                                            background: 'transparent', 
                                            border: 'none', 
                                            color: 'hsl(var(--danger))', 
                                            cursor: 'pointer', 
                                            padding: '12px', 
                                            transition: 'var(--transition)' 
                                        }} 
                                        className="mobile-remove-btn"
                                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'} 
                                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        <Trash2 size={24} />
                                    </button>
                                    <style>{`
                                        @media (max-width: 768px) {
                                            .mobile-remove-btn {
                                                position: absolute;
                                                top: 10px;
                                                right: 10px;
                                                padding: 8px !important;
                                            }
                                        }
                                    `}</style>
                                </div>
                            );
                        })
                    )}
                </div>

                {(() => {
                    const hasSomeSelection = formData.selectedMaterials.some(m => m.materialId);
                    if (!hasSomeSelection) return null;

                    const selectedCats = formData.selectedMaterials.map(sm => {
                        const mat = materials.find(m => String(m.id) === String(sm.materialId));
                        return (mat?.category || '').toLowerCase();
                    });
                    const hasAgronomical = selectedCats.some(cat => cat.includes('herbicide') || cat.includes('fertilizer') || cat.includes('lcc'));
                    const hasAssets = selectedCats.some(cat => cat.includes('tools') || cat.includes('ppe'));
                    const hasWorkshop = selectedCats.some(cat => 
                        cat.includes('workshop') || cat.includes('tyre') || cat.includes('tube') || 
                        cat.includes('fuel') || cat.includes('lubricant') || cat.includes('spare part')
                    );

                    return (
                        <div className="animate-slide-up">
                            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '4px', height: '24px', background: 'hsl(var(--primary))', borderRadius: '2px' }}></div>
                                Transaction Metadata
                            </h3>
                            
                            <div className="metadata-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
                                <div>
                                    <label className="input-label">Ledger Date</label>
                                    <input type="date" name="date" className="input-field" value={formData.date} onChange={handleChange} required />
                                </div>
                                
                                {transactionMode === 'ISSUE' && hasAgronomical && (
                                    <div>
                                        <label className="input-label">Operational Workgroup *</label>
                                        <SearchableSelect 
                                            options={workgroups.map(w => ({ value: w.id, label: w.name }))}
                                            value={formData.workgroupId} 
                                            onChange={(e) => handleChange({ target: { name: 'workgroupId', value: e.target.value } })}
                                            placeholder="-- Choose Workgroup --"
                                            required
                                        />
                                    </div>
                                )}
                            </div>

                            {transactionMode === 'ISSUE' && (hasAssets || hasWorkshop) && (
                                <div className="metadata-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
                                    {hasAssets && (
                                        <div>
                                            <label className="input-label">Responsible Worker (Tools/PPE) *</label>
                                            <SearchableSelect 
                                                options={workers.filter(w => w.status === 'Active').map(w => ({ value: w.id, label: w.name }))}
                                                value={formData.workerId} 
                                                onChange={(e) => handleChange({ target: { name: 'workerId', value: e.target.value } })}
                                                placeholder="-- Choose Worker --"
                                                required
                                            />
                                        </div>
                                    )}
                                    {hasWorkshop && (
                                        <div>
                                            <label className="input-label">Assigned Vehicle *</label>
                                            <SearchableSelect 
                                                options={vehicles.map(v => ({ value: v.id, label: `${v.name} (${v.registration_no || 'No Reg'})` }))}
                                                value={formData.vehicleId} 
                                                onChange={(e) => handleChange({ target: { name: 'vehicleId', value: e.target.value } })}
                                                placeholder="-- Choose Vehicle --"
                                                required
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {transactionMode === 'ISSUE' && hasAgronomical && (
                                <div className="metadata-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '48px' }}>
                                    <div>
                                        <label className="input-label">Target Field / Block *</label>
                                        <SearchableSelect 
                                            options={fields.filter(f => !f.name.startsWith('[SYSTEM]')).map(f => ({ value: f.id, label: f.name }))}
                                            value={formData.fieldId} 
                                            onChange={(e) => handleChange({ target: { name: 'fieldId', value: e.target.value } })}
                                            placeholder="-- Choose Field --"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="input-label">Assigned Activity *</label>
                                        <SearchableSelect 
                                            options={activities
                                                .filter(a => !a.name.startsWith('[SYSTEM]'))
                                                .filter(a => {
                                                    if (!formData.workgroupId) return true;
                                                    const selectedWorkgroup = workgroups.find(w => w.id === formData.workgroupId);
                                                    return selectedWorkgroup && (a.category || '').trim().toLowerCase() === (selectedWorkgroup.name || '').trim().toLowerCase();
                                                })
                                                .map(a => ({ value: a.id, label: a.name }))
                                            }
                                            value={formData.activityId} 
                                            onChange={(e) => handleChange({ target: { name: 'activityId', value: e.target.value } })}
                                            placeholder="-- Choose Activity --"
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '20px' }}>
                                <button type="button" onClick={() => setFormData(p => ({ ...p, selectedMaterials: [] }))} className="btn btn-secondary" disabled={loading} style={{ padding: '14px 32px' }}>Discard Draft</button>
                                <button type="submit" className="btn btn-primary" style={{ background: transactionMode === 'RECEIVE' ? 'hsl(var(--success))' : 'hsl(var(--primary))', padding: '14px 48px' }} disabled={loading}>
                                    {loading ? 'Processing...' : transactionMode === 'ISSUE' ? 'Confirm Issuance' : 'Fulfill Receipt'}
                                </button>
                            </div>
                        </div>
                    );
                })()}

                {formData.selectedMaterials.length > 0 && !formData.selectedMaterials.some(m => m.materialId) && (
                     <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '20px' }}>
                        <button type="button" onClick={() => setFormData(p => ({ ...p, selectedMaterials: [] }))} className="btn btn-secondary" style={{ padding: '14px 32px' }}>Cancel</button>
                    </div>
                )}
            </form>
        </div>
    );
}
