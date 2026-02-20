'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Pill, Plus, Save, ArrowLeft, Search, FlaskConical, Hash, Edit3, X, Trash2, Power, CalendarClock, Tablets } from 'lucide-react';
// Devuelve el icono adecuado según el tipo de reenvasado
function iconoMetodo(tipo: string | undefined) {
  if (!tipo) return <FlaskConical size={14} style={{verticalAlign:'middle', marginRight:4}}/>;
  const t = tipo.toLowerCase();
  if (t.includes('sin blister')) return <Pill size={16} style={{verticalAlign:'middle', marginRight:4}}/>;
  if (t.includes('blister')) return <Tablets size={16} style={{verticalAlign:'middle', marginRight:4}}/>;
  if (t.includes('3 meses') || t.includes('tres meses')) return <CalendarClock size={16} style={{verticalAlign:'middle', marginRight:4}}/>;
  return <FlaskConical size={14} style={{verticalAlign:'middle', marginRight:4}}/>;
}
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
    principio_activo: '',
    excipientes: '',
    codigo_nacional: '',
    codigo_agrup: '',
    ubicacion: '',
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
    // Validación robusta: siempre debe haber un código válido, incluso al editar
    // Blindaje total: nunca permitir guardar si el código SAP no es un número válido mayor que 0
    if (!form.codigo_sap || String(form.codigo_sap).trim() === '' || isNaN(Number(form.codigo_sap)) || Number(form.codigo_sap) <= 0) {
      alert('El campo CÓDIGO es obligatorio y debe ser un número mayor que 0.');
      return;
    }
    const codigoSapNum = Number(form.codigo_sap);
    if (!form.nombre_medicamento || !form.metodo_id) {
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

      // 1. Upsert medicamento (incluyendo el estado activo y nuevos campos)
      const payload = {
        codigo_sap: codigoSapNum,
        nombre_medicamento: form.nombre_medicamento,
        principio_activo: form.principio_activo?.trim() ? form.principio_activo : null,
        excipientes: form.excipientes?.trim() ? form.excipientes : null,
        codigo_nacional: form.codigo_nacional?.trim() ? form.codigo_nacional : null,
        codigo_agrup: form.codigo_agrup?.trim() ? form.codigo_agrup : null,
        ubicacion: form.ubicacion?.trim() ? form.ubicacion : null,
        activo: form.activo,
      };

      const { error: err1 } = await supabase
        .from('medicamentos')
        .upsert(payload);

      if (err1) throw err1;

      // 2. Vincular método
      const { error: delErr } = await supabase
        .from('medicamento_metodo')
        .delete()
        .eq('codigo_sap', codigoSapNum);

      if (delErr) throw delErr;

      const { error: err2 } = await supabase.from('medicamento_metodo').insert({
        codigo_sap: codigoSapNum,
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
      const codigoSapNum = Number(med.codigo_sap);
      if (!codigoSapNum || isNaN(codigoSapNum)) {
        alert('Error: código SAP inválido.');
        return;
      }
      const { error } = await supabase
        .from('medicamentos')
        .update({ activo: nuevoEstado })
        .eq('codigo_sap', codigoSapNum);
      if (!error) fetchData();
    }
  };

  const medsFiltrados = medicamentos.filter(m => 
    m.nombre_medicamento.toLowerCase().includes(filtro.toLowerCase()) || 
    String(m.codigo_sap).includes(filtro)
  );

  return (
    <main style={{ padding: '2rem', fontFamily: 'Inter, system-ui, sans-serif', maxWidth: '1000px', margin: '0 auto', background: '#f8fafc', minHeight: '100vh', position: 'relative' }}>
            {/* Botón flotante para añadir nuevo medicamento */}
            <button
              onClick={() => {
                setIsEditing(false);
                setForm({
                  codigo_sap: '',
                  nombre_medicamento: '',
                  principio_activo: '',
                  excipientes: '',
                  codigo_nacional: '',
                  codigo_agrup: '',
                  ubicacion: '',
                  metodo_id: '',
                  activo: true
                });
                setModalOpen(true);
              }}
              title="Añadir nuevo medicamento"
              style={{
                position: 'fixed',
                bottom: 36,
                right: 36,
                zIndex: 200,
                background: '#0ea5e9',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: 64,
                height: 64,
                boxShadow: '0 4px 16px #0ea5e93a',
                fontSize: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
            >
              <Plus size={36} />
            </button>
      
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', borderRadius: '18px', boxShadow: '0 2px 8px #e2e8f0', padding: '1.5rem 2.5rem', marginBottom: '2.5rem', minHeight: 80 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ background: '#0ea5e9', borderRadius: '14px', width: 54, height: 54, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Pill size={30} color='white' />
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: '1.35rem', color: '#0f172a', marginBottom: 2 }}>Catálogo de Medicamentos</div>
            <div style={{ fontSize: '1rem', color: '#64748b', fontWeight: 500, marginBottom: 2 }}>Servicio de Farmacia. Hospital Universitario de Cabueñes</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span style={{ color: '#0ea5e9', fontWeight: 900, fontSize: '0.93rem', letterSpacing: 0.2, display: 'flex', alignItems: 'center' }}>
                <svg width="16" height="16" fill="none" stroke="#0ea5e9" strokeWidth="2" style={{marginRight:3}} viewBox="0 0 24 24"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a7.5 7.5 0 0 1 13 0"/></svg>
                ADMIN:
              </span>
              <span style={{ color: '#334155', fontWeight: 700, fontSize: '0.93rem', letterSpacing: 0.1 }}>CRISTINA DURÁN ROMÁN</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1.5px solid #e2e8f0', background: 'white', color: '#334155', fontWeight: 700, borderRadius: 12, padding: '10px 18px', fontSize: '1rem', cursor: 'pointer' }}>
            <ArrowLeft size={18} style={{ marginRight: 4 }} /> Volver al Panel
          </button>
        </div>
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
          <div key={med.codigo_sap} style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', opacity: med.activo ? 1 : 0.6 }}>
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 15, flex: 1 }}>
              <div style={{ background: med.activo ? '#f0f9ff' : '#f1f5f9', padding: '12px', borderRadius: '14px', height: 'fit-content', marginRight: 12 }}>
                <Pill size={24} color={med.activo ? '#0ea5e9' : '#94a3b8'}/>
              </div>
              {/* 1ª columna: Nombre comercial y principio activo */}
              <div style={{ flex: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 180 }}>
                <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '1.05rem' }}>
                  {med.nombre_medicamento} {!med.activo && <span style={{fontSize:'0.7rem', color:'#ef4444', background:'#fee2e2', padding:'2px 8px', borderRadius:10, marginLeft:8}}>DESACTIVADO</span>}
                </div>
                {med.principio_activo && (
                  <div style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 600, marginTop: 2 }}>{med.principio_activo}</div>
                )}
              </div>
              {/* 2ª columna: Cód. Nacional y Cód. Agrup */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 120 }}>
                {med.codigo_nacional && (
                  <div style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 600, marginBottom: 4 }}>CN: {med.codigo_nacional}</div>
                )}
                {med.codigo_agrup && (
                  <div style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 600 }}>Cód. Agrup: {med.codigo_agrup}</div>
                )}
              </div>
              {/* 3ª columna: Ubicación y excipientes */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 120 }}>
                {med.ubicacion && (
                  <div style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 600, marginBottom: 4 }}>Ubicación: {med.ubicacion}</div>
                )}
                {med.excipientes && (
                  <div style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 600 }}>Excipientes: {med.excipientes}</div>
                )}
              </div>
              {/* 4ª columna: Método de reenvasado */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end', minWidth: 120 }}>
                <div style={{ fontSize: '0.8rem', color: '#0ea5e9', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                  {iconoMetodo(med.medicamento_metodo?.[0]?.metodo_reenvasado?.tipo_reenvasado)}
                  {med.medicamento_metodo?.[0]?.metodo_reenvasado?.tipo_reenvasado || 'Sin asignar'}
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
                  if (!med.codigo_sap || isNaN(Number(med.codigo_sap)) || Number(med.codigo_sap) <= 0) {
                    alert('Error: el medicamento no tiene un código SAP válido. No se puede editar.');
                    return;
                  }
                  setIsEditing(true);
                  setForm({
                    codigo_sap: String(Number(med.codigo_sap)),
                    nombre_medicamento: med.nombre_medicamento,
                    principio_activo: med.principio_activo || '',
                    excipientes: med.excipientes || '',
                    codigo_nacional: med.codigo_nacional !== undefined && med.codigo_nacional !== null ? String(med.codigo_nacional) : '',
                    codigo_agrup: med.codigo_agrup !== undefined && med.codigo_agrup !== null ? String(med.codigo_agrup) : '',
                    ubicacion: med.ubicacion !== undefined && med.ubicacion !== null ? String(med.ubicacion) : '',
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
          <div style={{ background: 'white', padding: '2.5rem', borderRadius: '32px', width: '100%', maxWidth: '480px', position: 'relative', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ margin: '0 0 2rem 0', fontWeight: 900 }}>{isEditing ? 'Editar Fármaco' : 'Nuevo Fármaco'}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', flex: 1, minHeight: 0 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 8 }}>CÓDIGO</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.codigo_sap}
                  disabled={isEditing} // No editable en modo edición
                  onChange={e => {
                    // Solo permitir números enteros positivos, nunca vacío ni 0
                    let val = e.target.value.replace(/[^0-9]/g, '');
                    if (val === '' || val === '0') val = '1';
                    setForm({ ...form, codigo_sap: val });
                  }}
                  style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '2px solid #f1f5f9', fontWeight: 600 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 8 }}>NOMBRE COMERCIAL</label>
                <input value={form.nombre_medicamento} onChange={e => setForm({...form, nombre_medicamento: e.target.value})} style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '2px solid #f1f5f9' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 8 }}>PRINCIPIO ACTIVO</label>
                <input value={form.principio_activo} onChange={e => setForm({...form, principio_activo: e.target.value})} style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '2px solid #f1f5f9' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 8 }}>EXCIPIENTES</label>
                <input value={form.excipientes} onChange={e => setForm({...form, excipientes: e.target.value})} style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '2px solid #f1f5f9' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 8 }}>CÓDIGO NACIONAL</label>
                <input value={form.codigo_nacional} onChange={e => setForm({...form, codigo_nacional: e.target.value})} style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '2px solid #f1f5f9' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 8 }}>CÓDIGO AGRUP</label>
                <input value={form.codigo_agrup} onChange={e => setForm({...form, codigo_agrup: e.target.value})} style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '2px solid #f1f5f9' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 8 }}>UBICACIÓN</label>
                <input value={form.ubicacion} onChange={e => setForm({...form, ubicacion: e.target.value})} style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '2px solid #f1f5f9' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 8 }}>MÉTODO DE REENVASADO</label>
                <select value={form.metodo_id} onChange={e => setForm({...form, metodo_id: e.target.value})} style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '2px solid #f1f5f9', background: 'white' }}>
                  <option value="">-- Seleccionar --</option>
                  {metodosDisponibles.map(met => (
                    <option key={met.id} value={met.id}>{met.tipo_reenvasado}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="activo" checked={form.activo} onChange={e => setForm({...form, activo: e.target.checked})} />
                <label htmlFor="activo" style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Activo</label>
              </div>
            </div>
            <div style={{ marginTop: '2rem', display: 'flex', gap: '12px', position: 'sticky', bottom: 0, background: 'white', paddingTop: 16 }}>
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