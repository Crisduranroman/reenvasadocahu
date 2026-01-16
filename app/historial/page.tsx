'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  ClipboardList, LogOut, CheckCircle2, RefreshCw, 
  Search, Package, User, Calendar, Filter, ArrowRight, Clock, 
  FileSpreadsheet, FlaskConical, ArrowLeft 
} from 'lucide-react';

export default function HistorialPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [registros, setRegistros] = useState<any[]>([]);
  const [registrosFiltrados, setRegistrosFiltrados] = useState<any[]>([]);
  const [userRol, setUserRol] = useState<string>('');
  const [nombreUsuario, setNombreUsuario] = useState<string>(''); // Para mostrar nombre activo
  const [editando, setEditando] = useState<any>(null);
  
  const [listaMetodos, setListaMetodos] = useState<any[]>([]);

  const [fMed, setFMed] = useState('');
  const [fEst, setFEst] = useState('todos');
  const [fMetodo, setFMetodo] = useState('');
  const [fDesde, setFDesde] = useState('');
  const [fHasta, setFHasta] = useState('');

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.replace('/login');

      // 1. Obtener Perfil Activo
      const { data: perfilActivo } = await supabase.from('perfiles').select('rol, nombre').eq('user_id', session.user.id).single();
      setUserRol(perfilActivo?.rol || 'tecnico');
      setNombreUsuario(perfilActivo?.nombre || 'Usuario');

      // 2. Carga de Datos
      const [respAct, respMeds, respPerf, respMetodos] = await Promise.all([
        supabase.from('actividad_reenvasado').select('*').order('fecha', { ascending: false }),
        supabase.from('medicamentos').select('codigo_sap, nombre_medicamento'),
        supabase.from('perfiles').select('user_id, nombre'),
        supabase.from('metodo_reenvasado').select('id, tipo_reenvasado')
      ]);

      if (respAct.error) throw respAct.error;
      setListaMetodos(respMetodos.data || []);

      const procesados = (respAct.data || []).map(reg => {
        const med = respMeds.data?.find(m => Number(m.codigo_sap) === Number(reg.codigo_sap));
        const tec = respPerf.data?.find(p => p.user_id === reg.user_id);
        const farma = respPerf.data?.find(p => p.user_id === reg.validado_por);
        const metodo = respMetodos.data?.find(m => m.id === reg.metodo_id);

        return {
          ...reg,
          nombre_med: med ? med.nombre_medicamento : `SAP: ${reg.codigo_sap}`,
          nombre_tecnico: tec ? tec.nombre : 'Usuario desconocido',
          nombre_validador: farma ? farma.nombre : null,
          nombre_metodo: metodo ? metodo.tipo_reenvasado : 'Estándar'
        };
      });

      setRegistros(procesados);
      setRegistrosFiltrados(procesados);
    } catch (e: any) {
      console.error("Error:", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/login');
    } catch (error) {
      window.location.href = '/login';
    }
  };

  useEffect(() => {
    let temp = [...registros];
    if (fEst !== 'todos') temp = temp.filter(r => r.estado === fEst);
    if (fMetodo) temp = temp.filter(r => Number(r.metodo_id) === Number(fMetodo));
    if (fMed) {
      const q = fMed.toLowerCase();
      temp = temp.filter(r => r.nombre_med.toLowerCase().includes(q) || String(r.codigo_sap).includes(q) || (r.incidencias && r.incidencias.toLowerCase().includes(q)));
    }
    if (fDesde) temp = temp.filter(r => new Date(r.fecha) >= new Date(fDesde));
    if (fHasta) {
      const fin = new Date(fHasta);
      fin.setHours(23, 59, 59);
      temp = temp.filter(r => new Date(r.fecha) <= fin);
    }
    setRegistrosFiltrados(temp);
  }, [fMed, fEst, fMetodo, fDesde, fHasta, registros]);

  const exportarExcel = () => {
    if (registrosFiltrados.length === 0) return alert("No hay datos para exportar.");
    const cabeceras = ["ID", "Fecha", "Hora", "SAP", "Medicamento", "Método", "Técnico", "Lote", "Cad. Original", "Cad. Reenvasado", "Cant. Inicial", "Cant. Final", "Estado", "MARCA/CN/OBSERVACIONES", "Validado Por"];
    const filas = registrosFiltrados.map(reg => {
      const fecha = new Date(reg.fecha);
      return [
        reg.id, fecha.toLocaleDateString(), fecha.toLocaleTimeString(), 
        reg.codigo_sap, reg.nombre_med?.replace(/,/g, ' '), reg.nombre_metodo, reg.nombre_tecnico,
        reg.lote_original, reg.caducidad_original, reg.caducidad_reenvasado, 
        reg.cantidad, reg.cantidad_final, reg.estado, reg.incidencias?.replace(/,/g, ' ') || '', reg.nombre_validador || 'Pendiente'
      ].join(",");
    });
    const csvContent = "\uFEFF" + [cabeceras.join(","), ...filas].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Reporte_HUCA_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const guardarValidacion = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from('actividad_reenvasado').update({
      cantidad_final: Number(editando.cantidad_final),
      lote_original: editando.lote_original.toUpperCase(),
      caducidad_original: editando.caducidad_original,
      caducidad_reenvasado: editando.caducidad_reenvasado,
      incidencias: editando.incidencias,
      estado: 'validado',
      validado_por: session?.user.id,
      fecha_validacion: new Date().toISOString()
    }).eq('id', editando.id);
    if (!error) { setEditando(null); cargarDatos(); } 
    else { alert("Error: " + error.message); }
  };

  const fmtFecha = (f: string) => f ? new Date(f).toLocaleDateString('es-ES') : '-';

  if (loading) return <div style={{ padding: 50, textAlign: 'center', color: '#10b981', fontWeight: 700 }}>Cargando Historial...</div>;

  return (
    <main style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto', background: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: 'white', padding: '1rem 1.5rem', borderRadius: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: '#10b981', padding: '10px', borderRadius: '12px' }}><ClipboardList color="white" size={26} /></div>
          <div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>Historial Farmacia</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <User size={12} color="#10b981" />
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>
                {userRol}: <span style={{ color: '#64748b' }}>{nombreUsuario}</span>
              </span>
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => router.push('/reenvasado')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'white', color: '#0f172a', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}><ArrowLeft size={16}/> Volver a Producción</button>
          <button onClick={exportarExcel} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#dcfce7', color: '#166534', border: '1px solid #86efac', padding: '8px 12px', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}><FileSpreadsheet size={16}/> Excel</button>
          <button onClick={cargarDatos} style={{ padding: '10px', borderRadius: '12px', background: 'white', border: '1px solid #e2e8f0', cursor: 'pointer' }}><RefreshCw size={18} /></button>
          <button onClick={handleLogout} style={{ padding: '10px', borderRadius: '12px', background: '#fee2e2', border: 'none', cursor: 'pointer' }}><LogOut size={18} color="#ef4444" /></button>
        </div>
      </header>

      {/* FILTROS */}
      <div style={{ background: 'white', padding: '1.2rem', borderRadius: '15px', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, border: '1px solid #e2e8f0' }}>
        <div style={{gridColumn: 'span 2'}}>
            <label style={{fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: 4, display: 'block' }}>Buscar Fármaco o Marca</label>
            <div style={{position:'relative'}}>
               <Search size={16} style={{position:'absolute', left:10, top:10, color:'#94a3b8'}}/>
               <input placeholder="Nombre, SAP o Marca..." value={fMed} onChange={e => setFMed(e.target.value)} style={{width:'100%', padding:'8px 8px 8px 32px', borderRadius:8, border:'1px solid #cbd5e1'}} />
            </div>
        </div>
        <div>
            <label style={{fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: 4, display: 'block'}}>Estado</label>
            <select value={fEst} onChange={e => setFEst(e.target.value)} style={{width:'100%', padding:8, borderRadius:8, border:'1px solid #cbd5e1', background:'white'}}>
              <option value="todos">Todos</option>
              <option value="pendiente">Pendientes</option>
              <option value="validado">Validados</option>
            </select>
        </div>
        <div>
            <label style={{fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: 4, display: 'block'}}>Método Reenv.</label>
            <select value={fMetodo} onChange={e => setFMetodo(e.target.value)} style={{width:'100%', padding:8, borderRadius:8, border:'1px solid #cbd5e1', background:'white'}}>
              <option value="">Todos los métodos</option>
              {listaMetodos.map(m => (
                <option key={m.id} value={m.id}>{m.tipo_reenvasado}</option>
              ))}
            </select>
        </div>
        <div><label style={{fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: 4, display: 'block'}}>Fecha Desde</label><input type="date" value={fDesde} onChange={e => setFDesde(e.target.value)} style={{width:'100%', padding:8, borderRadius:8, border:'1px solid #cbd5e1'}} /></div>
        <div><label style={{fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: 4, display: 'block'}}>Fecha Hasta</label><input type="date" value={fHasta} onChange={e => setFHasta(e.target.value)} style={{width:'100%', padding:8, borderRadius:8, border:'1px solid #cbd5e1'}} /></div>
      </div>

      <div style={{ background: 'white', borderRadius: '15px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: '#f8fafc', fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>
            <tr>
              <th style={{ padding: '1rem' }}>MEDICAMENTO / MARCA / CN</th>
              <th style={{ padding: '1rem' }}>DETALLES TÉCNICOS</th>
              <th style={{ padding: '1rem' }}>TÉCNICO / FECHA</th>
              <th style={{ padding: '1rem', textAlign: 'center' }}>ACCIÓN</th>
            </tr>
          </thead>
          <tbody style={{ fontSize: '0.8rem' }}>
            {registrosFiltrados.map((reg) => (
              <tr key={reg.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                  <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.9rem' }}>{reg.nombre_med}</div>
                  <div style={{ fontSize: '0.7rem', color: '#0ea5e9', fontWeight: 600 }}>SAP: {reg.codigo_sap}</div>
                  <div style={{ marginTop: 6, fontSize: '0.75rem', color: '#475569', fontStyle: 'normal', maxWidth: '300px', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px' }}>
                    {reg.incidencias || 'Sin Marca/CN especificado'}
                  </div>
                </td>
                <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto', gap: '8px 12px', alignItems: 'center', fontSize: '0.75rem' }}>
                    <span style={{color: '#64748b'}}>Cantidades:</span>
                    <div style={{display:'flex', alignItems:'center', gap:4}}>{reg.cantidad} <ArrowRight size={12} color="#94a3b8"/> <strong>{reg.cantidad_final}</strong></div>
                    <span style={{color:'#94a3b8', fontSize:'0.7rem'}}>uds</span>
                    <span style={{color: '#64748b'}}>Método:</span>
                    <span style={{fontWeight: 700, color: '#475569'}}>{reg.nombre_metodo}</span>
                  </div>
                </td>
                <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#334155' }}><User size={14}/> {reg.nombre_tecnico}</div>
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: '0.75rem' }}><Calendar size={12} /> {fmtFecha(reg.fecha)}</div>
                </td>
                <td style={{ padding: '1rem', textAlign: 'center', verticalAlign: 'middle' }}>
                  {userRol === 'farmaceutico' && reg.estado === 'pendiente' ? (
                    <button onClick={() => setEditando({...reg})} style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem' }}>VALIDAR</button>
                  ) : reg.estado === 'validado' ? (
                    <div style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
                        <div style={{display:'flex', alignItems:'center', gap:4, color:'#10b981', fontWeight:700}}><CheckCircle2 size={18} /> OK</div>
                        <span style={{fontSize:'0.6rem', color:'#64748b', marginTop:3}}>Por: {reg.nombre_validador}</span>
                    </div>
                  ) : <span style={{fontSize:'0.7rem', color:'#cbd5e1'}}>--</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editando && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, padding: 10 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '20px', width: '100%', maxWidth: '500px' }}>
            <h3 style={{ marginTop: 0, display:'flex', alignItems:'center', gap:10 }}><Package color="#f59e0b"/> Supervisión Farmacéutica</h3>
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', marginBottom: 20 }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>MEDICAMENTO:</div>
                <div style={{ fontWeight: 800, color: '#0f172a' }}>{editando.nombre_med}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Cant. Final <input type="number" value={editando.cantidad_final} onChange={e => setEditando({...editando, cantidad_final: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: 4 }}/></label>
              <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Lote <input value={editando.lote_original} onChange={e => setEditando({...editando, lote_original: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: 4 }}/></label>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>MARCA, CN Y OBSERVACIONES 
                <textarea value={editando.incidencias || ''} onChange={e => setEditando({...editando, incidencias: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: 4, resize: 'none' }} rows={3}/></label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 25 }}>
              <button onClick={guardarValidacion} style={{ flex: 1, background: '#10b981', color: 'white', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 800, cursor: 'pointer' }}>AUTORIZAR LOTE</button>
              <button onClick={() => setEditando(null)} style={{ flex: 0.5, background: '#f1f5f9', color: '#64748b', padding: '14px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}