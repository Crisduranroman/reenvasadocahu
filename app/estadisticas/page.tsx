'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area 
} from 'recharts';
import { ArrowLeft, TrendingUp, Users, Package, Calendar, RefreshCw } from 'lucide-react';

export default function EstadisticasPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [registros, setRegistros] = useState<any[]>([]);
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // Leemos directamente de las tablas para evitar fallos de Vistas desactualizadas
      const [respAct, respMeds, respPerf] = await Promise.all([
        supabase.from('actividad_reenvasado').select('*'),
        supabase.from('medicamentos').select('codigo_sap, nombre_medicamento'),
        supabase.from('perfiles').select('user_id, nombre')
      ]);

      if (respAct.data) {
        // Cruzamos los datos igual que en el historial
        const procesados = respAct.data.map(reg => {
          const med = respMeds.data?.find(m => Number(m.codigo_sap) === Number(reg.codigo_sap));
          const tec = respPerf.data?.find(p => p.user_id === reg.user_id);
          return {
            ...reg,
            nombre_med: med ? med.nombre_medicamento : `SAP: ${reg.codigo_sap}`,
            nombre_usuario: tec ? tec.nombre : 'Usuario desconocido'
          };
        });
        setRegistros(procesados);
      }
    } catch (e) {
      console.error("Error cargando estadísticas:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  // Filtrado por fecha
  const datosFiltrados = useMemo(() => {
    let temp = [...registros];
    if (filtroDesde) temp = temp.filter(r => new Date(r.fecha) >= new Date(filtroDesde));
    if (filtroHasta) {
        const hasta = new Date(filtroHasta);
        hasta.setHours(23, 59, 59);
        temp = temp.filter(r => new Date(r.fecha) <= hasta);
    }
    return temp;
  }, [registros, filtroDesde, filtroHasta]);

  // Procesamiento para gráficas
  const stats = useMemo(() => {
    const porFecha: any = {};
    const porUsuario: any = {};

    datosFiltrados.forEach(r => {
      // Usamos cantidad_final que es el dato real de producción
      const cant = Number(r.cantidad_final) || 0;
      
      const f = new Date(r.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
      porFecha[f] = (porFecha[f] || 0) + cant;
      
      const u = r.nombre_usuario || 'S/N';
      porUsuario[u] = (porUsuario[u] || 0) + cant;
    });

    return {
      fecha: Object.keys(porFecha).map(k => ({ nombre: k, unidades: porFecha[k] })),
      usuario: Object.keys(porUsuario).map(k => ({ nombre: k, unidades: porUsuario[k] })),
      total: datosFiltrados.reduce((acc, curr) => acc + (Number(curr.cantidad_final) || 0), 0)
    };
  }, [datosFiltrados]);

  if (loading) return (
    <div style={{display:'flex', height:'100vh', alignItems:'center', justifyContent:'center', background:'#f8fafc'}}>
        <div style={{textAlign:'center'}}>
            <RefreshCw className="animate-spin" style={{margin:'0 auto 10px', animation: 'spin 1s linear infinite'}} />
            <p>Analizando datos de producción...</p>
        </div>
        <style jsx>{`@keyframes spin { from {transform:rotate(0deg)} to {transform:rotate(360deg)} }`}</style>
    </div>
  );

  return (
    <main style={{ padding: '1rem', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      
      {/* CABECERA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', background: 'white', padding: '1.5rem', borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Estadísticas HUCA</h1>
          <p style={{ margin: 0, color: '#64748b' }}>Análisis de carga y producción real</p>
        </div>
        <button onClick={() => router.push('/historial')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 600, cursor: 'pointer' }}>
          <ArrowLeft size={18} /> Volver al Historial
        </button>
      </div>

      {/* TARJETAS DE RESUMEN */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '2rem' }}>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ background: '#e0f2fe', padding: '12px', borderRadius: '12px' }}><Package color="#0ea5e9" /></div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>TOTAL UNIDADES REENVASADAS</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0284c7' }}>{stats.total.toLocaleString()}</div>
          </div>
        </div>
        
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ background: '#fef3c7', padding: '12px', borderRadius: '12px' }}><Calendar color="#f59e0b" /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, marginBottom: '8px' }}>FILTRAR PERIODO</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="date" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)} style={{ width: '100%', padding:'5px', borderRadius:'5px', border:'1px solid #e2e8f0' }} />
              <input type="date" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)} style={{ width: '100%', padding:'5px', borderRadius:'5px', border:'1px solid #e2e8f0' }} />
            </div>
          </div>
        </div>
      </div>

      {/* GRÁFICAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem' }}>
        
        {/* LÍNEA DE TIEMPO */}
        <div style={{ background: 'white', padding: '2rem', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '2rem' }}>
            <TrendingUp size={24} color="#0ea5e9" /> 
            <h3 style={{ margin: 0, fontWeight: 800 }}>Rendimiento Diario</h3>
          </div>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <AreaChart data={stats.fecha}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="nombre" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{borderRadius:'12px', border:'none', boxShadow:'0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                <Area type="monotone" dataKey="unidades" stroke="#0ea5e9" fill="url(#colorUv)" strokeWidth={4} />
                <defs>
                  <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* BARRAS POR USUARIO */}
        <div style={{ background: 'white', padding: '2rem', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '2rem' }}>
            <Users size={24} color="#10b981" /> 
            <h3 style={{ margin: 0, fontWeight: 800 }}>Productividad por Técnico</h3>
          </div>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={stats.usuario}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="nombre" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius:'12px', border:'none', boxShadow:'0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                <Bar dataKey="unidades" fill="#10b981" radius={[10, 10, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </main>
  );
}