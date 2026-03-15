import React, { useState } from 'react';
import { useProfile } from '../contexts/ProfileContext';
import { PlusCircle, Zap, ShieldCheck, Copy, CheckCircle2, LayoutGrid, Key, Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
    const { session, currentProfile, profilesList, switchProfile, createProfile, joinEstate } = useProfile();
    const [newProfileName, setNewProfileName] = useState('');
    const [copied, setCopied] = useState(false);
    
    // Category Management State
    const { materialCategories, addMaterialCategory, deleteMaterialCategory, updateMaterialCategory, materials } = useProfile();
    const [categoryForm, setCategoryForm] = useState({ name: '' });
    const [editingCategoryId, setEditingCategoryId] = useState(null);
    const [importKey, setImportKey] = useState('');

    const isOwner = session && currentProfile && session.user.id === currentProfile.user_id;

    const handleCreate = async (e) => {
        e.preventDefault();
        if (newProfileName.trim()) {
            await createProfile(newProfileName.trim());
            setNewProfileName('');
        }
    };

    const handleImport = async (e) => {
        e.preventDefault();
        if (importKey.trim()) {
            await joinEstate(importKey.trim());
            setImportKey('');
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleAddCategory = async (e) => {
        e.preventDefault();
        if (!categoryForm.name.trim()) return;
        if (editingCategoryId) {
            const oldName = materialCategories.find(c => c.id === editingCategoryId)?.name;
            await updateMaterialCategory(editingCategoryId, categoryForm.name.trim(), oldName);
            setEditingCategoryId(null);
        } else {
            await addMaterialCategory(categoryForm.name.trim());
        }
        setCategoryForm({ name: '' });
    };

    const startEditCategory = (cat) => {
        setCategoryForm({ name: cat.name });
        setEditingCategoryId(cat.id);
    };

    return (
        <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '60px' }}>
            <header style={{ marginBottom: '56px' }}>
                <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '12px', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <SettingsIcon size={40} color="hsl(var(--primary))" />
                    Infrastructure
                </h1>
                <p style={{ color: 'hsl(var(--text-muted))', fontSize: '1.1rem' }}>Manage estate identities, access tokens, and organizational hierarchies.</p>
            </header>

            {/* Active Estate Hero */}
            <div className="glass-panel animate-slide-up" style={{ padding: '48px', marginBottom: '40px', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: 'linear-gradient(90deg, transparent, hsl(var(--success)), transparent)' }}></div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'hsla(var(--success), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShieldCheck size={26} color="hsl(var(--success))" />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Operational Workspace</h2>
                        <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.9rem', margin: 0 }}>Current active environment profile</p>
                    </div>
                </div>
                
                {currentProfile ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '48px', alignItems: 'center' }}>
                        <div>
                            <h3 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 16px 0', letterSpacing: '-0.03em' }}>{currentProfile.name}</h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                                <span style={{ 
                                    background: isOwner ? 'hsla(var(--primary), 0.15)' : 'rgba(255,255,255,0.05)', 
                                    color: isOwner ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))',
                                    padding: '6px 14px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', border: '1px solid var(--glass-border)'
                                }}>
                                    {isOwner ? 'Architect' : 'Member'}
                                </span>
                                <span style={{ color: 'hsl(var(--text-muted))', fontSize: '0.9rem', fontWeight: 500 }}>
                                    Initialization: {new Date(currentProfile.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                </span>
                            </div>
                        </div>

                        <div style={{ padding: '28px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(10px)' }}>
                            <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'hsl(var(--text-muted))', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Key size={12} /> Access Token
                            </p>
                            <div style={{ position: 'relative', marginBottom: '12px' }}>
                                <code style={{ 
                                    display: 'block', width: '100%', padding: '14px 40px 14px 14px', background: 'rgba(0,0,0,0.4)', 
                                    borderRadius: '10px', color: 'hsl(var(--success))', fontSize: '0.75rem', 
                                    fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', border: '1px solid rgba(16, 185, 129, 0.2)'
                                }}>
                                    {currentProfile.id}
                                </code>
                                <button onClick={() => copyToClipboard(currentProfile.id)} style={{ position: 'absolute', right: '4px', top: '4px', bottom: '4px', padding: '0 10px', background: 'transparent', border: 'none', color: copied ? 'hsl(var(--success))' : 'hsl(var(--text-muted))', cursor: 'pointer', transition: 'var(--transition)' }}>
                                    {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                                </button>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', margin: 0, lineHeight: 1.5 }}>
                                Use this token to delegate access to other authorized operators.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: '60px', textAlign: 'center', border: '2px dashed var(--glass-border)', borderRadius: 'var(--radius-lg)', color: 'hsl(var(--text-muted))' }}>
                        <ShieldCheck size={48} opacity={0.3} style={{ margin: '0 auto 20px' }} />
                        <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>Primary infrastructure offline. Please initialize or switch to an active estate.</p>
                    </div>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) 1fr', gap: '40px' }}>
                {/* Switch Profiles */}
                <div className="glass-panel animate-slide-up" style={{ padding: '40px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '32px' }}>
                        <LayoutGrid size={22} color="hsl(var(--text-muted))" />
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Available Environments</h3>
                    </div>
                    
                    {profilesList.length === 0 ? (
                        <p style={{ color: 'hsl(var(--text-muted))', fontSize: '1rem', fontStyle: 'italic' }}>No registered estates found in your authority list.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {profilesList.map(p => {
                                const active = currentProfile?.id === p.id;
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => switchProfile(p)}
                                        className="btn"
                                        style={{
                                            justifyContent: 'space-between',
                                            padding: '18px 20px', 
                                            background: active ? 'hsla(var(--primary), 0.1)' : 'rgba(255,255,255,0.02)',
                                            border: active ? '1px solid hsla(var(--primary), 0.3)' : '1px solid var(--glass-border)',
                                            borderRadius: '16px', color: active ? 'white' : 'hsl(var(--text-muted))', 
                                            cursor: 'pointer', textAlign: 'left', transition: 'var(--transition)',
                                            transform: active ? 'scale(1.02)' : 'scale(1)'
                                        }}
                                        onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'white'; }}}
                                        onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.color = 'hsl(var(--text-muted))'; }}}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: active ? 'hsl(var(--success))' : 'hsl(var(--text-muted))', opacity: active ? 1 : 0.3 }}></div>
                                            <span style={{ fontWeight: 600, fontSize: '1.05rem' }}>{p.name}</span>
                                        </div>
                                        {active && <CheckCircle2 size={18} color="hsl(var(--success))" />}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Provisioning */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                    <div className="glass-panel animate-slide-up" style={{ padding: '32px' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <PlusCircle size={18} color="hsl(var(--primary))" />
                            Provision Estate
                        </h3>
                        <form onSubmit={handleCreate} style={{ display: 'flex', gap: '12px' }}>
                            <input type="text" className="input-field" value={newProfileName} onChange={e => setNewProfileName(e.target.value)} placeholder="Estate Name..." required />
                            <button type="submit" className="btn btn-primary" style={{ padding: '0 20px', borderRadius: '12px' }}>
                                <PlusCircle size={20} />
                            </button>
                        </form>
                    </div>

                    <div className="glass-panel animate-slide-up" style={{ padding: '32px' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Zap size={18} color="hsl(var(--success))" />
                            Synchronize Profile
                        </h3>
                        <form onSubmit={handleImport} style={{ display: 'flex', gap: '12px' }}>
                            <input type="text" className="input-field" value={importKey} onChange={e => setImportKey(e.target.value)} placeholder="Invitation Key..." required />
                            <button type="submit" className="btn btn-primary" style={{ padding: '0 20px', background: 'hsl(var(--success))', borderRadius: '12px' }}>
                                <Zap size={20} />
                            </button>
                        </form>
                        <p style={{ marginTop: '16px', fontSize: '0.8rem', color: 'hsl(var(--text-muted))', lineHeight: 1.4 }}>
                            Enter a valid estate token to establish a connection with an existing operational database.
                        </p>
                    </div>
                </div>
            </div>

            {/* Category Management - Requested by User */}
            <div className="glass-panel animate-slide-up" style={{ padding: '40px', marginTop: '40px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '32px' }}>
                    <LayoutGrid size={22} color="hsl(var(--primary))" />
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Material Resource Categories</h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) 1fr', gap: '40px' }}>
                    <div>
                        {materialCategories.length === 0 ? (
                            <p style={{ color: 'hsl(var(--text-muted))', fontSize: '1rem', fontStyle: 'italic' }}>No custom categories defined. Categories help organize your material ledger.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {materialCategories.map(cat => (
                                    <div 
                                        key={cat.id} 
                                        style={{ 
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '16px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)',
                                            borderRadius: '16px'
                                        }}
                                    >
                                        <div>
                                            <span style={{ fontWeight: 600, fontSize: '1rem' }}>{cat.name}</span>
                                            <span style={{ marginLeft: '12px', fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
                                                {materials.filter(m => m.category === cat.name).length} items
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <button 
                                                onClick={() => startEditCategory(cat)}
                                                style={{ background: 'transparent', border: 'none', color: 'hsl(var(--primary))', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}
                                            >
                                                Edit
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    if(window.confirm(`Delete "${cat.name}"? Materials in this category will become uncategorized.`)) {
                                                        deleteMaterialCategory(cat.id);
                                                    }
                                                }}
                                                style={{ background: 'transparent', border: 'none', color: 'hsl(var(--danger))', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ padding: '32px', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid var(--glass-border)' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '20px' }}>
                            {editingCategoryId ? 'Modify Category' : 'Create Category'}
                        </h4>
                        <form onSubmit={handleAddCategory} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <input 
                                type="text" 
                                className="input-field" 
                                value={categoryForm.name} 
                                onChange={e => setCategoryForm({ name: e.target.value })} 
                                placeholder="Category Label... (e.g. Fertilizer)" 
                                required 
                            />
                            <div style={{ display: 'flex', gap: '12px' }}>
                                {editingCategoryId && (
                                    <button 
                                        type="button" 
                                        onClick={() => { setEditingCategoryId(null); setCategoryForm({ name: '' }); }}
                                        className="btn btn-secondary" 
                                        style={{ flex: 1, height: '48px' }}
                                    >
                                        Cancel
                                    </button>
                                )}
                                <button type="submit" className="btn btn-primary" style={{ flex: 2, height: '48px' }}>
                                    {editingCategoryId ? 'Update' : 'Define Category'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
