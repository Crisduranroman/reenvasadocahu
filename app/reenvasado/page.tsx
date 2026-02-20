'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  Pill, ClipboardList, LogOut, Search, 
  Beaker, ListChecks, PlayCircle, AlertCircle, SendHorizontal, BarChart3,
  FlaskConical, User, ArrowLeft 
} from 'lucide-react';

// Asocia cada método de reenvasado a un icono de Lucide
const metodoIcono = (metodo) => {
  if (!metodo) return <FlaskConical size={12} />;
  const t = metodo.toLowerCase();
  if (t.includes('sin blister')) return <Pill size={16} style={{verticalAlign:'middle', marginRight:4}}/>;
  if (t.includes('blister')) return <Tablets size={16} style={{verticalAlign:'middle', marginRight:4}}/>;
  if (t.includes('3 meses') || t.includes('tres meses')) return <CalendarClock size={16} style={{verticalAlign:'middle', marginRight:4}}/>;
  return <FlaskConical size={14} style={{verticalAlign:'middle', marginRight:4}}/>;
};

type Medicamento = {
  codigo_sap: number;
  nombre_medicamento: string;
  principio_activo: string | null;
  medicamento_metodo: {
    metodo_id: number;
    metodo_reenvasado: { tipo_reenvasado: string } | null;
  }[];
};

export default function ReenvasadoPage() {
    // ...existing code...
    const eliminarTarea = async (id: string) => {
      if (userRol !== 'admin' && userRol !== 'farmaceutico') {
        alert('Solo el administrador o el farmacéutico pueden eliminar tareas.');
        return;
      }
      if (!window.confirm('¿Seguro que deseas eliminar esta tarea?')) return;
      const { error } = await supabase.from('tareas_reenvasado').delete().eq('id', id);
      if (error) return alert('Error al eliminar: ' + error.message);
      await cargarTareas();
      setTareaActiva(null);
      setSeleccionado(null);
    };
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userRol, setUserRol] = useState<string>('tecnico'); 
  const [nombreUsuario, setNombreUsuario] = useState<string>('');
  
  const [tareasPendientes, setTareasPendientes] = useState<any[]>([]);
  const [tareaActiva, setTareaActiva] = useState<any>(null);
  const [q, setQ] = useState('');
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [loading, setLoading] = useState(false);
  const [seleccionado, setSeleccionado] = useState<Medicamento | null>(null);
  
  const [metodoId, setMetodoId] = useState<number | null>(null);
  const [prioridad, setPrioridad] = useState<string>('');
  
  const [cantidad, setCantidad] = useState<number>(0);
  const [cantidadFinal, setCantidadFinal] = useState<number>(0);
  const [loteOriginal, setLoteOriginal] = useState('');
  const [cadOrig, setCadOrig] = useState('');
  const [cadReenv, setCadReenv] = useState('');
  const [incidencias, setIncidencias] = useState('');

  const queryText = useMemo(() => q.trim(), [q]);

  // --- 1. CÁLCULO DE FECHAS SEFH ---
  useEffect(() => {
    if (!cadOrig || !metodoId) return;
    const hoy = new Date();
    const original = new Date(cadOrig);

    if (metodoId === 1 || metodoId === 4) {
      setCadReenv(cadOrig);
    } 
    else if (metodoId === 2 || metodoId === 3) {
      const diffTiempo = original.getTime() - hoy.getTime();
      const diffMeses = diffTiempo / (1000 * 60 * 60 * 24 * 30.44);
      if (diffMeses > 0) {
        const mesesCalculados = Math.floor(diffMeses * 0.25);
        const mesesFinales = Math.min(mesesCalculados, 6);
        const nuevaFecha = new Date();
        nuevaFecha.setMonth(hoy.getMonth() + mesesFinales);
        setCadReenv(nuevaFecha.toISOString().split('T')[0]);
      }
    }
  }, [cadOrig, metodoId]);

  const alertaCaducidad = useMemo(() => {
    if (!cadOrig || !cadReenv) return false;
    return new Date(cadReenv) > new Date(cadOrig);
  }, [cadOrig, cadReenv]);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.replace('/login');
      
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('rol, nombre')
        .eq('user_id', session.user.id)
        .single();
      
      if (perfil) {
        setUserRol(perfil.rol);
        setNombreUsuario(perfil.nombre || 'Usuario');
      }
      
      setCheckingAuth(false);
      cargarTareas();
    };
    checkSession();
  }, [router]);

  const cargarTareas = async () => {
    const { data } = await supabase
      .from('tareas_reenvasado')
      .select(`
        *, 
        medicamentos!inner(
          codigo_sap, 
          nombre_medicamento, 
          principio_activo, 
          ubicacion,
          codigo_agrup,
          activo,
          medicamento_metodo(
            metodo_id, 
            metodo_reenvasado(tipo_reenvasado)
          )
        )
      `)
      .eq('estado', 'pendiente')
      .eq('medicamentos.activo', true) 
      .order('creado_en', { ascending: true });

    const prioridadValor = (p) => p === 'muy urgente' ? 2 : p === 'urgente' ? 1 : 0;
    const tareasProcesadas = (data || []).map((t: any) => {
      let metodoVisual = 'Estándar'; 
      if (t.medicamentos?.medicamento_metodo?.length > 0) {
        const metodosOrdenados = t.medicamentos.medicamento_metodo.sort(
          (a: any, b: any) => a.metodo_id - b.metodo_id
        );
        metodoVisual = metodosOrdenados[0]?.metodo_reenvasado?.tipo_reenvasado || 'Estándar';
      }
      return { ...t, metodo_visual: metodoVisual };
    })
    .sort((a, b) => prioridadValor(b.prioridad) - prioridadValor(a.prioridad));

    setTareasPendientes(tareasProcesadas);
  };

  const seleccionarTarea = (tarea: any) => {
    setTareaActiva(tarea); 
    setSeleccionado(tarea.medicamentos);
    setCantidad(tarea.cantidad_solicitada);
    setLoteOriginal(''); setCantidadFinal(0); setCadOrig(''); setCadReenv(''); setIncidencias('');
    
    if (tarea.medicamentos.medicamento_metodo?.length > 0) {
       const metodosOrdenados = [...tarea.medicamentos.medicamento_metodo].sort(
          (a: any, b: any) => a.metodo_id - b.metodo_id
       );
       setMetodoId(metodosOrdenados[0].metodo_id);
    }
  };

  useEffect(() => {
    const buscar = async () => {
      if (queryText.length < 2) { setMedicamentos([]); return; }
      setLoading(true);
      const { data } = await supabase.from('medicamentos')
        .select(`codigo_sap, nombre_medicamento, principio_activo, medicamento_metodo (metodo_id, metodo_reenvasado ( tipo_reenvasado ))`)
        .or(`nombre_medicamento.ilike.%${queryText}%,principio_activo.ilike.%${queryText}%`)
        .eq('activo', true) 
        .limit(10);
      setMedicamentos((data as any) ?? []);
      setLoading(false);
    };
    buscar();
  }, [queryText]);

  const asignarTarea = async () => {
    if (!seleccionado || cantidad <= 0) return alert('⚠️ Indica fármaco y cantidad.');
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from('tareas_reenvasado').insert({
      codigo_sap: seleccionado.codigo_sap,
      cantidad_solicitada: cantidad,
      prioridad: prioridad || null,
      estado: 'pendiente',
      creado_por: session?.user.id
    });
    if (error) return alert("Error: " + error.message);
    alert('✅ Tarea enviada al técnico.');
    setSeleccionado(null); setCantidad(0); setQ(''); cargarTareas();
  };

  const guardarRegistro = async () => {
    if (cantidad <= 0) {
        return alert("⚠️ Error: La Cantidad Inicial no puede ser 0.");
    }
    if (!metodoId || !loteOriginal.trim() || cantidadFinal <= 0) {
        return alert('⚠️ Faltan datos (Lote o Cantidad Final).');
    }
    if (alertaCaducidad) {
        return alert('❌ Error: La caducidad de reenvasado no puede superar la original.');
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    const { error: errorInsert } = await supabase.from('actividad_reenvasado').insert({
      codigo_sap: seleccionado!.codigo_sap,
      metodo_id: metodoId,
      cantidad: cantidad,
      cantidad_final: cantidadFinal,
      lote_original: loteOriginal.trim(),
      caducidad_original: cadOrig,
      caducidad_reenvasado: cadReenv,
      incidencias: incidencias.trim() || null,
      user_id: session?.user.id
    });

    if (errorInsert) return alert("Error: " + errorInsert.message);
    
    if (tareaActiva) {
        await supabase.from('tareas_reenvasado').update({ estado: 'completada' }).eq('id', tareaActiva.id);
    }
    
    alert("✅ Registro guardado correctamente.");
    setSeleccionado(null); setTareaActiva(null); setQ(''); cargarTareas();
  };

  if (checkingAuth) return <div style={{textAlign:'center', padding: 50}}>Cargando Reenvasado...</div>;

  return (
    <main style={{ padding: '1rem', fontFamily: 'Inter, sans-serif', maxWidth: '1100px', margin: '0 auto', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', background: 'white', padding: '1rem 1.5rem', borderRadius: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: userRol === 'farmaceutico' ? '#f59e0b' : '#0ea5e9', padding: '10px', borderRadius: '12px' }}>
            <Pill color="white" size={26} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0, color: '#0f172a', lineHeight: 1.2 }}>
              Reenvasado de Medicamentos.
            </h1>
            <div style={{ color: '#64748b', fontSize: '0.95rem', fontWeight: 600, marginTop: 2 }}>
              Servicio de Farmacia. Hospital Universitario de Cabueñes
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <User size={12} color={userRol === 'farmaceutico' ? '#f59e0b' : '#0ea5e9'} />
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: userRol === 'farmaceutico' ? '#f59e0b' : '#0ea5e9', textTransform: 'uppercase' }}>
                {userRol}: <span style={{ color: '#64748b' }}>{nombreUsuario}</span>
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => router.push('/admin')} style={{ padding: '10px 15px', borderRadius: '10px', border: '1.5px solid #0ea5e9', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.9rem', color: '#0ea5e9' }}>
            <ArrowLeft size={18} style={{ marginRight: 4 }} /> Volver al Panel
          </button>
          <button onClick={() => router.push('/estadisticas')} style={{ padding: '10px 15px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.8rem', color: '#475569' }}><BarChart3 size={18}/> Estadísticas</button>
          <button onClick={() => router.push('/historial')} style={{ padding: '10px 15px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.8rem', color: '#475569' }}><ClipboardList size={18}/> Historial</button>
          <button onClick={async () => { await supabase.auth.signOut(); router.replace('/login'); }} style={{ padding: '10px', borderRadius: '10px', background: '#fee2e2', color: '#ef4444', border: 'none', cursor: 'pointer' }}><LogOut size={18}/></button>
        </div>
      </header>

      <section style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '0.95rem', color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800 }}>
          <ListChecks size={20} color="#0ea5e9" /> 
          Planificación de Reenvasado
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {tareasPendientes.map(t => (
            <div key={t.id} style={{ background: 'white', padding: '1.2rem', borderRadius: '15px', border: tareaActiva?.id === t.id ? '2px solid #0ea5e9' : '1px solid #e2e8f0', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', flex: 1 }}>{t.medicamentos.nombre_medicamento}</div>
              </div>
              {(userRol === 'farmaceutico' || userRol === 'admin') && (
                <>
                  <div style={{ fontSize: '0.85rem', color: '#334155', marginBottom: 2 }}>
                    <span style={{ fontWeight: 600 }}>Principio activo:</span> {t.medicamentos.principio_activo || '-'}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#334155', marginBottom: 2 }}>
                    <span style={{ fontWeight: 600 }}>Ubicación:</span> {t.medicamentos.ubicacion || '-'}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#334155', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>Código agrup:</span> {t.medicamentos.codigo_agrup || '-'}
                  </div>
                </>
              )}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#f0f9ff', color: '#0369a1', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, marginBottom: 10 }}>
                {metodoIcono(t.metodo_visual)}
                {t.metodo_visual?.toUpperCase()}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#64748b', marginBottom: 8, gap: 8 }}>
                <span>Solicitado: <strong>{t.cantidad_solicitada} uds.</strong></span>
                {(t.prioridad === 'urgente' || t.prioridad === 'muy urgente') && (
                  <span style={{
                    background: t.prioridad === 'muy urgente' ? '#fee2e2' : '#fef9c3',
                    color: t.prioridad === 'muy urgente' ? '#dc2626' : '#b45309',
                    borderRadius: '8px',
                    padding: '4px 12px',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.07)'
                  }}>
                    {t.prioridad === 'muy urgente' ? '🔥' : '⚡'} {t.prioridad.toUpperCase()}
                  </span>
                )}
              </div>
              <button onClick={() => seleccionarTarea(t)} style={{ marginTop: 12, width: '100%', padding: '10px', borderRadius: '8px', background: '#0ea5e9', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <PlayCircle size={16}/> Cargar Orden
              </button>
              {(userRol === 'farmaceutico' || userRol === 'admin') && (
                <button onClick={() => eliminarTarea(t.id)} style={{ position: 'absolute', top: 10, right: 10, background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', padding: '4px 10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>Eliminar</button>
              )}
            </div>
          ))}
          {tareasPendientes.length === 0 && <div style={{ gridColumn: '1/-1', padding: '3rem', textAlign: 'center', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: '15px' }}>No hay tareas programadas</div>}
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        <section>
          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={18} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar fármaco..." style={{ padding: '12px 12px 12px 40px', width: '100%', border: '1px solid #e2e8f0', borderRadius: '12px', outline: 'none' }} />
          </div>
          {medicamentos.map(m => (
            <button 
              key={m.codigo_sap} 
              onClick={() => { 
                setSeleccionado(m); 
                setTareaActiva(null); 
                setCantidad(0); 
                setCantidadFinal(0);
                setLoteOriginal('');
              }} 
              style={{ width: '100%', textAlign: 'left', padding: '1rem', marginBottom: 8, borderRadius: '12px', border: seleccionado?.codigo_sap === m.codigo_sap ? '2px solid #0ea5e9' : '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}
            >
              <div style={{ fontWeight: 700 }}>{m.nombre_medicamento}</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 400 }}>
                {m.principio_activo || <span style={{ opacity: 0.5 }}>[Sin principio activo]</span>}
              </div>
            </button>
          ))}
        </section>

        <section style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Beaker size={20} color={userRol === 'farmaceutico' ? '#f59e0b' : '#0ea5e9'} /> 
            {tareaActiva ? 'Ejecución de Orden' : userRol === 'farmaceutico' ? 'Panel Farmacia' : 'Registro Técnico'}
          </h3>
          
          {seleccionado ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontWeight: 800, color: '#0ea5e9', fontSize: '1.1rem' }}>{seleccionado.nombre_medicamento}</div>
              
              {(userRol === 'farmaceutico' || userRol === 'admin') && !tareaActiva ? (
                <>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Cantidad a solicitar</label>
                  <input type="number" value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))} style={{ padding: '12px', borderRadius: '10px', border: '2px solid #f59e0b' }} />
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: 8 }}>Prioridad</label>
                  <select value={typeof prioridad !== 'undefined' ? prioridad : ''} onChange={e => setPrioridad(e.target.value)} style={{ padding: '12px', borderRadius: '10px', border: '2px solid #f59e0b', marginBottom: 8 }}>
                    <option value="">-- Rutina ordinaria --</option>
                    <option value="urgente">Urgente</option>
                    <option value="muy urgente">Muy urgente</option>
                  </select>
                  <button onClick={asignarTarea} style={{ background: '#f59e0b', color: 'white', padding: '15px', borderRadius: '10px', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><SendHorizontal size={18}/> ENVIAR AL TÉCNICO</button>
                </>
              ) : (
                <>
                  <select value={metodoId ?? ''} onChange={(e) => setMetodoId(Number(e.target.value))} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                    <option value="">-- Seleccionar Método --</option>
                    {seleccionado.medicamento_metodo.map(rel => <option key={rel.metodo_id} value={rel.metodo_id}>{rel.metodo_reenvasado?.tipo_reenvasado}</option>)}
                  </select>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>Cad. Original</label>
                      <input type="date" value={cadOrig} onChange={(e) => setCadOrig(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#0ea5e9' }}>Cad. Final (Auto)</label>
                      <input type="date" value={cadReenv} onChange={(e) => setCadReenv(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: alertaCaducidad ? '2px solid #ef4444' : '2px solid #0ea5e9', background: '#f0f9ff' }} />
                    </div>
                  </div>
                  {alertaCaducidad && <div style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 700, display: 'flex', gap: 4 }}><AlertCircle size={14}/> Error: Mayor a la original</div>}
                  
                  <input placeholder="Lote Original" value={loteOriginal} onChange={(e) => setLoteOriginal(e.target.value)} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', alignItems: 'end' }}>
                     <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Cant. Inicial (Origen)</label>
                        <input type="number" placeholder="0" value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
                     </div>
                     <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#0ea5e9', display: 'block', marginBottom: 4 }}>Cant. Final (Obtenida)</label>
                        <input type="number" placeholder="0" value={cantidadFinal} onChange={(e) => setCantidadFinal(Number(e.target.value))} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '2px solid #0ea5e9', background: '#f0f9ff' }} />
                     </div>
                  </div>
                  
                  <textarea 
                    placeholder="OBSERVACIONES" 
                    value={incidencias} 
                    onChange={(e) => setIncidencias(e.target.value)} 
                    style={{ 
                      padding: '12px', 
                      borderRadius: '10px', 
                      border: '1px solid #cbd5e1', 
                      resize: 'none', 
                      fontFamily: 'inherit',
                      minHeight: '100px'
                    }} 
                    rows={3} 
                  />
                  
                  <button onClick={guardarRegistro} style={{ background: '#0ea5e9', color: 'white', padding: '15px', borderRadius: '10px', border: 'none', fontWeight: 700, cursor: 'pointer' }}>CONFIRMAR REGISTRO</button>
                </>
              )}
            </div>
          ) : <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Busca un fármaco o carga una orden de la cola</div>}
        </section>
      </div>
    </main>
  );
}