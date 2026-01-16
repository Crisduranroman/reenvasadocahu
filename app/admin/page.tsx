'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Shield, Users, ArrowLeft, Power, UserPlus, X, Mail, Lock } from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // Estados para el Modal de Nuevo Usuario
  const [modalOpen, setModalOpen] = useState(false);
  const [nuevoUsuario, setNuevoUsuario] = useState({ email: '', password: '', rol: 'tecnico' });
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    const verificarAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session || session.user.email !== 'admin@admin.com') {
        router.replace('/'); 
        return;
      }

      setIsAdmin(true);
      cargarUsuarios();
    };
    verificarAdmin();
  }, [router]);

  const cargarUsuarios = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('perfiles')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) console.error("Error:", error);
    else setUsuarios(data || []);
    setLoading(false);
  };

  const cambiarRol = async (userId: string, nuevoRol: string) => {
    const { error } = await supabase
      .from('perfiles')
      .update({ rol: nuevoRol })
      .eq('user_id', userId);

    if (error) {
      alert("Error al actualizar: " + error.message);
    } else {
      setUsuarios(usuarios.map(u => u.user_id === userId ? { ...u, rol: nuevoRol } : u));
    }
  };

  const toggleEstadoUsuario = async (userId: string, estadoActual: boolean) => {
    const nuevoEstado = !estadoActual;
    const { error } = await supabase
      .from('perfiles')
      .update({ activo: nuevoEstado })
      .eq('user_id', userId);

    if (error) {
      alert("Error al cambiar estado: " + error.message);
    } else {
      setUsuarios(usuarios.map(u => u.user_id === userId ? { ...u, activo: nuevoEstado } : u));
    }
  };

  // --- FUNCIÓN DE CREACIÓN SIMPLIFICADA (DEJA QUE EL TRIGGER TRABAJE) ---
  const handleCrearUsuario = async () => {
    if (!nuevoUsuario.email || !nuevoUsuario.password) {
      return alert("⚠️ Por favor, introduce email y contraseña.");
    }
    setCreando(true);

    try {
      // 1. Registro únicamente en el sistema de Autenticación de Supabase
      // Importante: No intentamos insertar en la tabla 'perfiles' desde aquí.
      // El Trigger en SQL capturará este evento y creará el perfil automáticamente.
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: nuevoUsuario.email,
        password: nuevoUsuario.password,
      });

      if (authError) throw authError;

      alert("✅ Usuario registrado en el sistema. El perfil se generará automáticamente.");
      setModalOpen(false);
      setNuevoUsuario({ email: '', password: '', rol: 'tecnico' });
      
      // Esperamos 2 segundos para que el proceso de la base de datos termine antes de recargar la lista
      setTimeout(() => cargarUsuarios(), 2000);

    } catch (error: any) {
      alert("❌ Error: " + error.message);
    } finally {
      setCreando(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <main style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif', background: '#f8fafc', minHeight: '100vh' }}>
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', background: '#1e293b', color: 'white', padding: '1.5rem', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: '#f59e0b', padding: '10px', borderRadius: '12px' }}><Shield color="white" /></div>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0 }}>Panel de Administración</h1>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Gestión de Usuarios HUCA</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button 
            onClick={() => setModalOpen(true)} 
            style={{ padding: '10px 16px', borderRadius: '10px', background: '#f59e0b', color: 'white', border: 'none', cursor: 'pointer', display:'flex', gap:8, alignItems:'center', fontWeight: 700 }}
          >
            <UserPlus size={18}/> Nuevo Usuario
          </button>
          <button onClick={() => router.push('/')} style={{ padding: '10px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', cursor: 'pointer', display:'flex', gap:8, alignItems:'center' }}>
            <ArrowLeft size={18}/> Volver
          </button>
        </div>
      </header>

      <div style={{ background: 'white', borderRadius: '15px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', display:'flex', alignItems:'center', gap:10 }}>
            <Users size={20} color="#64748b"/>
            <h3 style={{ margin: 0, color:'#334155' }}>Usuarios Registrados ({usuarios.length})</h3>
        </div>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: '#f8fafc', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>
            <tr>
              <th style={{ padding: '1.2rem' }}>Usuario (Email)</th>
              <th style={{ padding: '1.2rem' }}>Rol Actual</th>
              <th style={{ padding: '1.2rem' }}>Estado</th>
              <th style={{ padding: '1.2rem' }}>Acciones</th>
            </tr>
          </thead>
          <tbody style={{ fontSize: '0.9rem' }}>
            {usuarios.map((u) => (
              <tr key={u.user_id} style={{ borderTop: '1px solid #f1f5f9', opacity: u.activo === false ? 0.6 : 1 }}>
                <td style={{ padding: '1.2rem' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{u.nombre}</div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily:'monospace' }}>ID: {u.user_id.split('-')[0]}...</div>
                </td>
                
                <td style={{ padding: '1.2rem' }}>
                    <select 
                        value={u.rol} 
                        onChange={(e) => cambiarRol(u.user_id, e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer', background: 'white', fontWeight: 600, color: '#475569' }}
                    >
                        <option value="tecnico">Técnico</option>
                        <option value="farmaceutico">Farmacéutico</option>
                    </select>
                </td>

                <td style={{ padding: '1.2rem' }}>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: 800, 
                    color: u.activo !== false ? '#10b981' : '#ef4444' 
                  }}>
                    {u.activo !== false ? '● ACTIVO' : '○ INACTIVO'}
                  </span>
                </td>

                <td style={{ padding: '1.2rem' }}>
                    <button 
                      onClick={() => toggleEstadoUsuario(u.user_id, u.activo !== false)}
                      style={{ 
                        padding: '8px', 
                        borderRadius: '8px', 
                        border: 'none', 
                        cursor: 'pointer',
                        background: u.activo !== false ? '#fee2e2' : '#dcfce7',
                        color: u.activo !== false ? '#ef4444' : '#10b981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title={u.activo !== false ? "Inactivar Usuario" : "Activar Usuario"}
                    >
                      <Power size={18} />
                    </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {loading && <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Cargando usuarios...</div>}
      </div>

      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, padding: '1rem' }}>
          <div style={{ background: 'white', padding: '2.5rem', borderRadius: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>Alta de Usuario</h2>
              <button onClick={() => setModalOpen(false)} style={{ border: 'none', background: '#f1f5f9', padding: '5px', borderRadius: '50%', cursor: 'pointer' }}><X size={20}/></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}/>
                <input 
                  placeholder="Email corporativo" 
                  value={nuevoUsuario.email} 
                  onChange={e => setNuevoUsuario({...nuevoUsuario, email: e.target.value})} 
                  style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }} 
                />
              </div>

              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}/>
                <input 
                  type="password" 
                  placeholder="Contraseña de acceso" 
                  value={nuevoUsuario.password} 
                  onChange={e => setNuevoUsuario({...nuevoUsuario, password: e.target.value})} 
                  style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none' }} 
                />
              </div>
              
              <button 
                onClick={handleCrearUsuario} 
                disabled={creando}
                style={{ background: '#0f172a', color: 'white', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 800, cursor: creando ? 'wait' : 'pointer', marginTop: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, opacity: creando ? 0.7 : 1 }}
              >
                {creando ? 'Registrando...' : 'Confirmar Alta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}