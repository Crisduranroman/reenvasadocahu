'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  Pill, ClipboardList, LogOut, Search, 
  Beaker, ListChecks, PlayCircle, XCircle, Bell,
  SendHorizontal
} from 'lucide-react';

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
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userRol, setUserRol] = useState<string>('tecnico');
  
  const [tareasPendientes, setTareasPendientes] = useState<any[]>([]);
  const [tareaActiva, setTareaActiva] = useState<any>(null);
  const [notificacion, setNotificacion] = useState(false);

  const [q, setQ] = useState('');
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [loading, setLoading] = useState(false);
  const [seleccionado, setSeleccionado] = useState<Medicamento | null>(null);
  const [metodoId, setMetodoId] = useState<number | null>(null);
  const [cantidad, setCantidad] = useState<number>(0);
  const [cantidadFinal, setCantidadFinal] = useState<number>(0);
  const [loteOriginal, setLoteOriginal] = useState('');
  const [cadOrig, setCadOrig] = useState('');
  const [cadReenv, setCadReenv] = useState('');

  const queryText = useMemo(() => q.trim(), [q]);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.replace('/login');
      
      const { data: perfil } = await supabase.from('perfiles').select('rol').eq('user_id', session.user.id).single();
      setUserRol(perfil?.rol || 'tecnico');
      setCheckingAuth(false);
      cargarTareas();
    };
    checkSession();

    // ESCUCHAR CIERRE DE SESIÓN (CORRECCIÓN BOTÓN SALIR)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.replace('/login');
    });

    const channel = supabase
      .channel('cambios-tareas')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tareas_reenvasado' }, () => {
        cargarTareas();
        setNotificacion(true);
        setTimeout(() => setNotificacion(false), 5000);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tareas_reenvasado' }, () => {
        cargarTareas();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [router]);

  const cargarTareas = async () => {
    const { data } = await supabase
      .from('tareas_reenvasado')
      .select('*, medicamentos(codigo_sap, nombre_medicamento, principio_activo, medicamento_metodo(metodo_id, metodo_reenvasado(tipo_reenvasado)))')
      .eq('estado', 'pendiente')
      .order('creado_en', { ascending: true });
    setTareasPendientes(data || []);
  };

  const seleccionarTarea = (tarea: any) => {
    setTareaActiva(tarea);
    const med = tarea.medicamentos;
    setSeleccionado(med);
    setCantidad(tarea.cantidad_solicitada);
    setLoteOriginal(tarea.lote_fijado || '');
    setCadOrig(tarea.caducidad_original_fijada || '');
    setCadReenv(tarea.caducidad_reenvasado_fijada || '');
    if (med.medicamento_metodo?.length === 1) setMetodoId(med.medicamento_metodo[0].metodo_id);
    
    setTimeout(() => {
      document.getElementById('formulario-registro')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const cancelarTarea = () => {
    setTareaActiva(null);
    setSeleccionado(null);
    setCantidad(0);
    setCantidadFinal(0);
    setLoteOriginal('');
    setCadOrig('');
    setCadReenv('');
    setMetodoId(null);
  };

  useEffect(() => {
    const buscar = async () => {
      if (queryText.length < 2) { setMedicamentos([]); return; }
      setLoading(true);
      const { data } = await supabase
        .from('medicamentos')
        .select(`codigo_sap, nombre_medicamento, principio_activo, medicamento_metodo (metodo_id, metodo_reenvasado ( tipo_reenvasado ))`)
        .or(`nombre_medicamento.ilike.%${queryText}%,principio_activo.ilike.%${queryText}%`)
        .limit(10);
      setMedicamentos((data as any) ?? []);
      setLoading(false);
    };
    buscar();
  }, [queryText]);

  const asignarTarea = async () => {
    if (!seleccionado || cantidad <= 0) return alert('⚠️ Selecciona medicamento y cantidad.');
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from('tareas_reenvasado').insert({
      codigo_sap: seleccionado.codigo_sap,
      cantidad_solicitada: cantidad,
      estado: 'pendiente',
      creado_por: session?.user.id
    });
    if (error) return alert("Error: " + error.message);
    alert('✅ Tarea enviada al Técnico.');
    cancelarTarea();
    setQ('');
    cargarTareas();
  };

  const guardarRegistro = async () => {
    if (!metodoId || !loteOriginal.trim() || !cadOrig || !cadReenv || cantidadFinal <= 0) {
      return alert('⚠️ Faltan datos obligatorios (Tipo, Lote, Fechas, Cantidad Final).');
    }
    const { data: { session } } = await supabase.auth.getSession();
    const { error: errorInsert } = await supabase.from('actividad_reenvasado').insert({
      codigo_sap: seleccionado!.codigo_sap,
      metodo_id: metodoId,
      cantidad,
      cantidad_final: cantidadFinal,
      lote_original: loteOriginal.trim(),
      caducidad_original: cadOrig,
      caducidad_reenvasado: cadReenv,
      estado: 'pendiente',
      user_id: session?.user.id
    });
    if (errorInsert) return alert("Error: " + errorInsert.message);
    if (tareaActiva) await supabase.from('tareas_reenvasado').update({ estado: 'completada' }).eq('id', tareaActiva.id);
    alert('✅ Registro completado.');
    cancelarTarea();
    setQ('');
    cargarTareas();
  };

  if (checkingAuth) return <div style={{textAlign:'center', padding: 50}}>Accediendo...</div>;

  return (
    <main style={{ padding: '1rem', fontFamily: 'Inter, system-ui', maxWidth: '1100px', margin: '0 auto', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      
      {notificacion && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', background: '#f59e0b', color: 'white', padding: '15px 25px', borderRadius: '12px', boxShadow: '0 10px 15px rgba(0,0,0,0.1)', zIndex: 9999, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Bell size={20} /> <strong>¡Nueva tarea asignada!</strong>
        </div>
      )}

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem', background: 'white', padding: '1.2rem', borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: userRol === 'farmaceutico' ? '#f59e0b' : '#0ea5e9', padding: '8px', borderRadius: '12px' }}><Pill color="white" size={24} /></div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Reenvasado Farmacia HUCA</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => router.push('/historial')} style={{ padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <ClipboardList size={20} color="#64748b" /><span style={{fontSize:'0.8rem', fontWeight:600, color:'#64748b'}}>Historial</span>
          </button>
          <button onClick={() => supabase.auth.signOut()} style={{ padding: '10px', borderRadius: '10px', background: '#fee2e2', color: '#ef4444', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <LogOut size={20}/><span style={{fontSize:'0.8rem', fontWeight:600}}>Salir</span>
          </button>
        </div>
      </header>

      <section style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
          <ListChecks color="#475569" size={20} /> 
          <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#475569', textTransform: 'uppercase' }}>Cola de Producción</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {tareasPendientes.map(t => (
            <div key={t.id} style={{ background: tareaActiva?.id === t.id ? '#fef3c7' : 'white', padding: '1.5rem', borderRadius: '20px', border: tareaActiva?.id === t.id ? '2px solid #f59e0b' : '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700 }}>{t.medicamentos.nombre_medicamento}</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 8 }}>Solicitado: <strong>{t.cantidad_solicitada} uds.</strong></div>
              <button onClick={() => seleccionarTarea(t)} style={{ marginTop: '15px', width: '100%', padding: '10px', borderRadius: '12px', background: '#f59e0b', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <PlayCircle size={18} /> Cargar Orden
              </button>
            </div>
          ))}
          {tareasPendientes.length === 0 && <div style={{ gridColumn: '1/-1', padding: '3rem', textAlign: 'center', background: '#f1f5f9', borderRadius: '20px', color: '#94a3b8' }}>Sin tareas.</div>}
        </div>
      </section>

      <div id="formulario-registro">
        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
          <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={20} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca medicamento para asignar o registrar..." style={{ padding: '16px 16px 16px 48px', width: '100%', border: '2px solid #e2e8f0', borderRadius: '14px', outline: 'none' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          <section>
            {medicamentos.map((m) => (
              <button key={m.codigo_sap} onClick={() => { setSeleccionado(m); setTareaActiva(null); }} style={{ width: '100%', textAlign: 'left', padding: '1rem', marginBottom: '0.5rem', borderRadius: '14px', border: seleccionado?.codigo_sap === m.codigo_sap ? '2px solid #0ea5e9' : '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>
                <div style={{ fontWeight: 700 }}>{m.nombre_medicamento}</div>
              </button>
            ))}
          </section>

          <section style={{ background: 'white', padding: '1.5rem', borderRadius: '25px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Beaker size={20} color={userRol === 'farmaceutico' ? '#f59e0b' : '#0ea5e9'} /> 
              {tareaActiva ? 'Ejecución de Orden' : userRol === 'farmaceutico' ? 'Planificar Nueva Tarea' : 'Registro Manual'}
            </h3>
            
            {seleccionado ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {userRol === 'farmaceutico' && !tareaActiva ? (
                  <>
                    <label style={{fontSize:'0.8rem', fontWeight:700}}>Cantidad a solicitar</label>
                    <input type="number" value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #fef3c7', outline: 'none' }} />
                    <button onClick={asignarTarea} style={{ background: '#f59e0b', color: 'white', padding: '16px', borderRadius: '15px', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <SendHorizontal size={20} /> ENVIAR AL TÉCNICO
                    </button>
                  </>
                ) : (
                  <>
                    <select value={metodoId ?? ''} onChange={(e) => setMetodoId(Number(e.target.value))} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                      <option value="">-- Tipo Reenvasado --</option>
                      {seleccionado.medicamento_metodo.map(rel => <option key={rel.metodo_id} value={rel.metodo_id}>{rel.metodo_reenvasado?.tipo_reenvasado}</option>)}
                    </select>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div style={{display:'flex', flexDirection:'column', gap:5}}>
                        <label style={{fontSize:'0.7rem', fontWeight:700}}>Cant. Inicial</label>
                        <input type="number" value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1' }} />
                      </div>
                      <div style={{display:'flex', flexDirection:'column', gap:5}}>
                        <label style={{fontSize:'0.7rem', fontWeight:700}}>Cant. Final</label>
                        <input type="number" value={cantidadFinal} onChange={(e) => setCantidadFinal(Number(e.target.value))} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1' }} />
                      </div>
                    </div>
                    <label style={{fontSize:'0.7rem', fontWeight:700}}>Lote Original</label>
                    <input placeholder="Lote..." value={loteOriginal} onChange={(e) => setLoteOriginal(e.target.value)} style={{ padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1' }} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{fontSize:'0.7rem', fontWeight:700}}>Cad. Original</label>
                        <input type="date" value={cadOrig} onChange={(e) => setCadOrig(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
                      </div>
                      <div>
                        <label style={{fontSize:'0.7rem', fontWeight:700}}>Cad. Reenvasado</label>
                        <input type="date" value={cadReenv} onChange={(e) => setCadReenv(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
                      </div>
                    </div>
                    <button onClick={guardarRegistro} style={{ background: '#0ea5e9', color: 'white', padding: '16px', borderRadius: '15px', border: 'none', fontWeight: 700, cursor: 'pointer', marginTop: 10 }}>CONFIRMAR REGISTRO FINAL</button>
                    {tareaActiva && <button onClick={cancelarTarea} style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', marginTop: 10, fontSize: '0.8rem' }}>Cancelar carga</button>}
                  </>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>Busca un medicamento arriba.</div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}