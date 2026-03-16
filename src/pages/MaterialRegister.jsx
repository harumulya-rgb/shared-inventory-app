import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useProfile } from '../contexts/ProfileContext';
import { ClipboardList, AlertCircle, CheckCircle2, Download, Upload, PackagePlus } from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect';
import * as XLSX from 'xlsx';

export default function MaterialRegister() {
  const { currentProfile, systemDestinations, materialCategories, addMaterialCategory } = useProfile();
  const [formData, setFormData] = useState({ name: '', unit: '', price: '', material_no: '', initial_stock: '', category: '' });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: null, message: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentProfile) {
      setStatus({ type: 'error', message: 'No active Estate Profile selected.' });
      return;
    }
    setLoading(true);
    setStatus({ type: null, message: '' });

    const priceVal = Math.ceil((parseFloat(formData.price) || 0) * 100) / 100;
    const { data: insertedMaterial, error: materialError } = await supabase
      .from('materials')
      .insert([{ 
          profile_id: currentProfile.id,
          name: formData.name,
          unit: formData.unit,
          price: priceVal,
          category: formData.category || null,
          material_no: formData.material_no || null
      }])
      .select('id').single();

    if (materialError) {
      setStatus({ type: 'error', message: materialError.message });
      setLoading(false);
      return;
    }

    const initialAmt = parseFloat(formData.initial_stock || 0);
    if (initialAmt > 0 && insertedMaterial?.id) {
      const payload = {
          profile_id: currentProfile.id,
          date: new Date().toISOString().split('T')[0],
          field_id: systemDestinations?.fieldId,
          activity_id: systemDestinations?.activityId,
          materials_used: [{ materialId: insertedMaterial.id, amount: initialAmt, unitPrice: priceVal, transaction_type: 'RECEIVE' }],
          labor_days: 0, overtime: 0, hectare_achieve: 0, is_complete: false
      };
      const { error: entryError } = await supabase.from('entries').insert([payload]);
      if (entryError) {
          setStatus({ type: 'error', message: `Material registered, but check stock logs: ${entryError.message}` });
          setLoading(false);
          return;
      }
    }

    setStatus({ type: 'success', message: `Registered: ${formData.name} is now in the ledger.` });
    setFormData({ name: '', unit: '', price: '', material_no: '', initial_stock: '', category: '' });
    setTimeout(() => setStatus({ type: null, message: '' }), 5000);
    setLoading(false);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{ NAME: "", UNIT: "KG", CATEGORY: "Fertilizer", PRICE: 0.00, MATERIAL_NO: "", INITIAL_STOCK: 0 }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Materials");
    XLSX.writeFile(wb, "Material_Import_Template.xlsx");
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !currentProfile) return;
    setLoading(true);
    setStatus({ type: null, message: 'Processing ledger import...' });
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        if (data.length === 0) throw new Error('Empty dataset.');
        let successCount = 0;
        let localCategories = [...materialCategories]; // Track added categories locally during the loop

        const { data: existingMaterials } = await supabase
          .from('materials')
          .select('id, name, material_no, unit, price, category')
          .eq('profile_id', currentProfile.id);

        let updateCount = 0;
        const updatesList = [];
        const insertsList = [];

        for (const row of data) {
          if (!row.NAME || !row.UNIT) continue;
          const nameTrimmed = row.NAME.toString().trim();
          const noTrimmed = row.MATERIAL_NO?.toString().trim() || null;
          const priceVal = Math.ceil((parseFloat(row.PRICE) || 0) * 100) / 100;

          const existing = existingMaterials?.find(m => 
            m.name.toLowerCase() === nameTrimmed.toLowerCase() || 
            (noTrimmed && m.material_no?.toLowerCase() === noTrimmed.toLowerCase())
          );

          if (existing) {
            const hasChanges = existing.unit !== row.UNIT.toString() || 
                               parseFloat(existing.price) !== priceVal ||
                               (row.CATEGORY && existing.category !== row.CATEGORY.toString().trim());
            
            if (hasChanges) {
              updateCount++;
              updatesList.push({ row, existing, priceVal });
            }
          } else {
            insertsList.push({ row, nameTrimmed, noTrimmed, priceVal });
          }
        }

        let performUpdates = false;
        if (updateCount > 0) {
          performUpdates = window.confirm(`Found ${updateCount} existing materials with different data. Would you like to update their prices and units?`);
        }

        successCount = 0;

        // Process Updates if confirmed
        if (performUpdates) {
          for (const item of updatesList) {
            const { row, existing, priceVal } = item;
            const { error: updateError } = await supabase
              .from('materials')
              .update({ 
                unit: row.UNIT.toString(), 
                price: priceVal, 
                category: row.CATEGORY?.toString().trim() || existing.category,
                material_no: row.MATERIAL_NO?.toString().trim() || null
              })
              .eq('id', existing.id);
            if (!updateError) successCount++;
          }
        }

        // Process Inserts
        for (const item of insertsList) {
          const { row, nameTrimmed, noTrimmed, priceVal } = item;
          let categoryName = row.CATEGORY?.toString().trim() || null;
          if (categoryName) {
            const exists = localCategories.some(mc => mc.name.toLowerCase() === categoryName.toLowerCase());
            if (!exists) {
              const newCat = await addMaterialCategory(categoryName);
              if (newCat) {
                categoryName = newCat.name;
                localCategories.push(newCat);
              }
            } else {
              categoryName = localCategories.find(mc => mc.name.toLowerCase() === categoryName.toLowerCase())?.name || categoryName;
            }
          }

          const { data: ins, error } = await supabase.from('materials').insert([{ 
              profile_id: currentProfile.id, 
              name: nameTrimmed, 
              unit: row.UNIT.toString(), 
              price: priceVal, 
              category: categoryName,
              material_no: noTrimmed
          }]).select('id').single();

          if (!error) {
            if (parseFloat(row.INITIAL_STOCK) > 0) {
              await supabase.from('entries').insert([{
                  profile_id: currentProfile.id, date: new Date().toISOString().split('T')[0],
                  field_id: systemDestinations.fieldId, activity_id: systemDestinations.activityId,
                  materials_used: [{ materialId: ins.id, amount: parseFloat(row.INITIAL_STOCK), unitPrice: priceVal, transaction_type: 'RECEIVE' }],
                  labor_days: 0, overtime: 0, hectare_achieve: 0, is_complete: false
              }]);
            }
            successCount++;
          }
        }

        setStatus({ type: 'success', message: `${successCount} materials successfully imported to ledger.` });
      } catch (err) {
        setStatus({ type: 'error', message: 'Import failed: Format mismatch.' });
      }
      setLoading(false);
      e.target.value = null;
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '60px' }}>
      <header style={{ marginBottom: '56px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '12px', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <PackagePlus size={40} color="hsl(var(--primary))" />
            Registry
          </h1>
          <p style={{ color: 'hsl(var(--text-muted))', fontSize: '1.1rem' }}>Define new material resources and establish initial stock balances.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
          <button onClick={downloadTemplate} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '10px', borderRadius: '12px', padding: '10px 20px' }}>
            <Download size={18} /> Get Template
          </button>
          
          <label className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', borderRadius: '12px', padding: '10px 20px' }}>
            <Upload size={18} /> Bulk Import
            <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} style={{ display: 'none' }} disabled={loading} />
          </label>
        </div>
      </header>

      <div className="glass-panel animate-slide-up" style={{ padding: '48px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: 'linear-gradient(90deg, transparent, hsl(var(--primary)), transparent)' }}></div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'hsla(var(--primary), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ClipboardList size={26} color="hsl(var(--primary))" />
            </div>
            <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Resource Profile</h2>
                <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.9rem', margin: 0 }}>Basic specifications and valuation</p>
            </div>
        </div>

        {status.message && (
          <div className="animate-fade-in" style={{ 
            backgroundColor: status.type === 'error' ? 'hsla(var(--danger), 0.1)' : 'hsla(var(--success), 0.1)', 
            border: `1px solid ${status.type === 'error' ? 'hsla(var(--danger), 0.2)' : 'hsla(var(--success), 0.2)'}`,
            color: status.type === 'error' ? 'hsl(var(--danger))' : 'hsl(var(--success))', 
            padding: '20px 24px', borderRadius: 'var(--radius-md)', marginBottom: '40px', 
            display: 'flex', alignItems: 'center', gap: '16px', fontWeight: 600, fontSize: '1.05rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
          }}>
            {status.type === 'error' ? <AlertCircle size={24} /> : <CheckCircle2 size={24} />}
            {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '32px' }}>
            <label className="input-label">Commercial Name</label>
            <input type="text" name="name" className="input-field" placeholder="e.g. NPK Premium Fertilizer 15-15-15" value={formData.name} onChange={handleChange} maxLength={128} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
            <div>
              <label className="input-label">Unit of Measure</label>
              <input type="text" name="unit" className="input-field" placeholder="e.g. KG, Litre, Bag" value={formData.unit} onChange={handleChange} maxLength={32} required />
            </div>
            <div>
              <label className="input-label">Classification Category</label>
              <SearchableSelect
                options={materialCategories.map(c => ({ value: c.name, label: c.name }))}
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                placeholder="Select or add Category..."
                isClearable={true}
                onCreate={async (name) => {
                    const newCat = await addMaterialCategory(name);
                    return newCat;
                }}
              />
            </div>
            <div>
              <label className="input-label">Base Valuation ($)</label>
              <input type="number" name="price" step="0.01" min="0" className="input-field" placeholder="0.00" value={formData.price} onChange={handleChange} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '56px' }}>
            <div>
              <label className="input-label">Resource ID (Optional)</label>
              <input type="text" name="material_no" className="input-field" placeholder="e.g. SKU-1002" value={formData.material_no} onChange={handleChange} />
            </div>
            <div>
              <label className="input-label">Opening Balance</label>
              <input type="number" name="initial_stock" step="0.01" min="0" className="input-field" placeholder="0.0" value={formData.initial_stock} onChange={handleChange} />
              <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginTop: '10px' }}>Instantly logs as 'Receiving' transaction.</p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '20px', borderTop: '1px solid var(--glass-border)', paddingTop: '40px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setFormData({ name: '', unit: '', price: '', material_no: '', initial_stock: '' })} disabled={loading} style={{ padding: '14px 32px' }}>
              Clear Entries
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !currentProfile} style={{ padding: '14px 48px' }}>
              {loading ? 'Committing...' : 'Finalize Registration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
