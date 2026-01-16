'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Pill, Plus, Save, ArrowLeft, Search, FlaskConical, Hash, Edit3, X, Trash2, Power } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function GestionMedicamentos() {
  const router = useRouter();
  const [medicamentos, setMedicamentos] = useState<any[]>([]);
  const [metodosDisponibles, setMetodosDisponibles] = useState<any[]>([]);
  const [filtro, setFiltro] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ 
    codigo_sap: '', 
    nombre_medicamento: '', 
    metodo_id: '',
    activo: true 
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: meds } = await supabase.from('medicamentos').select(`
      *,
      medicamento_metodo (
        metodo_id,
        metodo_reenvasado ( tipo_reenvasado )
      )
    `).order('nombre_medicamento', { ascending: true });
    
    const { data: mets } = await supabase.from('metodo_reenvasado').select('*');
    
    if (meds) setMedicamentos(meds);
    if (mets) setMetodosDisponibles(mets);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.codigo_sap || !form.nombre_medicamento || !form.metodo_id) {
      return alert("⚠️ Por favor, rellena los campos obligatorios.");
    }

    setSaving(true);
    try {
      if (!isEditing) {
        const { data: existe } = await supabase.from('medicamentos').select('codigo_sap').eq('codigo_sap', Number(form.codigo_sap)).single();
        if (existe) {
          setSaving(false);
          return alert(`❌ El SAP ${form.codigo_sap} ya existe.`);
        }
      }

      // 1. Upsert medicamento (incluyendo el estado activo)
      const { error: err1 } = await supabase.from('medicamentos').upsert({
        codigo_sap: Number(form.codigo_sap),
        nombre_medicamento: form.nombre_medicamento,
        activo: form.activo 
      });

      if (err1) throw err1;

      // 2. Vincular método
      await supabase.from('medicamento_metodo').delete().eq('codigo_sap', Number(form.codigo_sap));
      const { error: err2 } = await supabase.from('medicamento_metodo').insert({
        codigo_sap: Number(form.codigo_sap),
        metodo_id: Number(form.metodo_id)
      });

      if (err2) throw err2;

      alert("✅ Cambios guardados.");
      setModalOpen(false);
      fetchData();
    } catch (error: any) {
      alert("❌ Error: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Función para desactivar/activar rápido desde la lista
  const toggleEstado = async (med: any) => {
    const nuevoEstado = !med.activo;
    const confirmacion = confirm(`¿Seguro que quieres ${nuevoEstado ? 'activar' : 'desactivar'} este fármaco? Los datos históricos no se borrarán.`);
    
    if (confirmacion) {
      const { error } = await supabase
        .from('medicamentos')
        .update({ activo: nuevoEstado })
        .eq('codigo_sap', med.codigo_sap);
      
      if (!error) fetchData();
    }
  };

  const medsFiltrados = medicamentos.filter(m => 
    m.nombre_medicamento.toLowerCase().includes(filtro.toLowerCase()) || 
    String(m.codigo_sap).includes(filtro)
  );

  return (
    <main style={{ padding: '2rem', fontFamily: 'Inter, system-ui, sans-serif', maxWidth: '1000px', margin: '0 auto', background: '#f8fafc', minHeight: '100vh' }}>
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <button onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', marginBottom: 8 }}>
            <ArrowLeft size={16}/> Volver al Panel
          </button>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>Gestión del Catálogo</h1>
        </div>
        <button 
          onClick={() => { 
            setIsEditing(false);
            setForm({codigo_sap:'', nombre_medicamento:'', metodo_id:'', activo: true}); 
            setModalOpen(true); 
          }}
          style={{ background: '#0ea5e9', color: 'white', padding: '14px 24px', borderRadius: '16px', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Plus size={20}/> Nuevo Medicamento
        </button>
      </header>

      <div style={{ position: 'relative', marginBottom: '2rem' }}>
        <Search size={20} style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}/>
        <input 
          placeholder="Buscar medicamento activo o inactivo..." 
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          style={{ width: '100%', padding: '18px 18px 18px 52px', borderRadius: '20px', border: '2px solid #e2e8f0', fontSize: '1rem', outline: 'none' }}
        />
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>Cargando...</div>
        ) : medsFiltrados.map(med => (
          <div key={med.codigo_sap} style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: med.activo ? 1 : 0.6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
              <div style={{ background: med.activo ? '#f0f9ff' : '#f1f5f9', padding: '12px', borderRadius: '14px' }}>
                <Pill size={24} color={med.activo ? '#0ea5e9' : '#94a3b8'}/>
              </div>
              <div>
                <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '1.05rem' }}>
                    {med.nombre_medicamento} {!med.activo && <span style={{fontSize:'0.7rem', color:'#ef4444', background:'#fee2e2', padding:'2px 8px', borderRadius:10, marginLeft:8}}>DESACTIVADO</span>}
                </div>
                <div style={{ display: 'flex', gap: 15, alignItems: 'center', marginTop: 4 }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>SAP: {med.codigo_sap}</span>
                  <span style={{ fontSize: '0.8rem', color: '#0ea5e9', fontWeight: 700 }}>
                    <FlaskConical size={14} style={{verticalAlign:'middle', marginRight:4}}/> 
                    {med.medicamento_metodo?.[0]?.metodo_reenvasado?.tipo_reenvasado || 'Sin asignar'}
                  </span>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 10 }}>
                <button 
                onClick={() => toggleEstado(med)}
                title={med.activo ? "Desactivar" : "Activar"}
                style={{ padding: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', color: med.activo ? '#ef4444' : '#10b981' }}
                >
                <Power size={18}/>
                </button>
                <button 
                onClick={() => {
                    setIsEditing(true);
                    setForm({
                    codigo_sap: String(med.codigo_sap),
                    nombre_medicamento: med.nombre_medicamento,
                    metodo_id: String(med.medicamento_metodo?.[0]?.metodo_id || ''),
                    activo: med.activo
                    });
                    setModalOpen(true);
                }}
                style={{ padding: '10px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                >
                <Edit3 size={16} style={{verticalAlign:'middle', marginRight:6}}/> Editar
                </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', padding: '2.5rem', borderRadius: '32px', width: '100%', maxWidth: '480px', position: 'relative' }}>
            <h2 style={{ margin: '0 0 2rem 0', fontWeight: 900 }}>{isEditing ? 'Editar Fármaco' : 'Nuevo Fármaco'}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 8 }}>CÓDIGO SAP</label>
                <input type="number" disabled={isEditing} value={form.codigo_sap} onChange={e => setForm({...form, codigo_sap: e.target.value})} style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '2px solid #f1f5f9', fontWeight: 600 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 8 }}>NOMBRE COMERCIAL</label>
                <input value={form.nombre_medicamento} onChange={e => setForm({...form, nombre_medicamento: e.target.value})} style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '2px solid #f1f5f9' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 8 }}>MÉTODO PROTOCOLADO</label>
                <select value={form.metodo_id} onChange={e => setForm({...form, metodo_id: e.target.value})} style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '2px solid #f1f5f9', background: 'white' }}>
                  <option value="">-- Seleccionar --</option>
                  {metodosDisponibles.map(met => (
                    <option key={met.id} value={met.id}>{met.tipo_reenvasado}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ marginTop: '3rem', display: 'flex', gap: '12px' }}>
              <button onClick={handleSave} disabled={saving} style={{ flex: 1.5, background: '#0f172a', color: 'white', padding: '16px', borderRadius: '16px', border: 'none', fontWeight: 800, cursor: 'pointer' }}>
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
              <button onClick={() => setModalOpen(false)} style={{ flex: 1, background: '#f1f5f9', color: '#64748b', padding: '16px', borderRadius: '16px', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}