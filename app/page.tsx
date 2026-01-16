'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Shield, LayoutDashboard, Loader2, LogOut, ArrowRight, Package } from 'lucide-react';

export default function RootPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.replace('/login');
        return;
      }

      if (session.user.email === 'admin@admin.com') {
        setIsAdmin(true);
        setLoading(false);
      } else {
        router.replace('/reenvasado');
      }
    };

    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (loading) {
    return (
      <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 15 }}>
          <Loader2 size={40} className="animate-spin" color="#0ea5e9" style={{ animation: 'spin 1s linear infinite' }} />
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Farmacia HUCA</h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 5 }}>Verificando credenciales...</p>
          </div>
        </div>
        <style jsx global>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif', padding: '1rem' }}>
      
      <div style={{ background: 'white', padding: '2.5rem', borderRadius: '24px', boxShadow: '0 20px 40px -5px rgba(0,0,0,0.1)', width: '100%', maxWidth: '500px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ background: '#fef3c7', width: 60, height: 60, borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
            <Shield size={32} color="#d97706" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>Panel de Control</h1>
          <p style={{ color: '#64748b', marginTop: 8 }}>Bienvenido, Administrador</p>
        </div>

        <div style={{ display: 'grid', gap: '1rem' }}>
          
          {/* Opción 1: Gestión de Usuarios */}
          <button 
            onClick={() => router.push('/admin')}
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '1.2rem', background: 'white', border: '2px solid #e2e8f0', 
              borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s',
              textAlign: 'left'
            }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = '#d97706'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ background: '#fffbeb', padding: 8, borderRadius: 10 }}><Shield size={20} color="#d97706"/></div>
              <div>
                <div style={{ fontWeight: 800, color: '#0f172a' }}>Gestión de Usuarios</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Asignar roles de Técnico o Farmacéutico</div>
              </div>
            </div>
            <ArrowRight size={18} color="#cbd5e1" />
          </button>

          {/* NUEVA Opción 2: Gestión de Catálogo */}
          <button 
            onClick={() => router.push('/admin/medicamentos')}
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '1.2rem', background: 'white', border: '2px solid #e2e8f0', 
              borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s',
              textAlign: 'left'
            }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = '#0ea5e9'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ background: '#f0f9ff', padding: 8, borderRadius: 10 }}><Package size={20} color="#0ea5e9"/></div>
              <div>
                <div style={{ fontWeight: 800, color: '#0f172a' }}>Catálogo de Fármacos</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Añadir medicamentos y editar métodos</div>
              </div>
            </div>
            <ArrowRight size={18} color="#cbd5e1" />
          </button>

          {/* Opción 3: Ir a la App */}
          <button 
            onClick={() => router.push('/reenvasado')}
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '1.2rem', background: 'white', border: '2px solid #e2e8f0', 
              borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s',
              textAlign: 'left'
            }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = '#10b981'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ background: '#f0fdf4', padding: 8, borderRadius: 10 }}><LayoutDashboard size={20} color="#10b981"/></div>
              <div>
                <div style={{ fontWeight: 800, color: '#0f172a' }}>Entrar a la Aplicación</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Ir a Reenvasado y Producción</div>
              </div>
            </div>
            <ArrowRight size={18} color="#cbd5e1" />
          </button>

        </div>

        <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
          <button 
            onClick={handleLogout}
            style={{ 
              background: 'transparent', border: 'none', color: '#ef4444', 
              fontWeight: 700, cursor: 'pointer', display: 'flex', 
              alignItems: 'center', justifyContent: 'center', gap: 8, 
              margin: '0 auto', padding: '10px 20px', borderRadius: '10px'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#fef2f2'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <LogOut size={18} /> Cerrar Sesión Segura
          </button>
        </div>

      </div>
    </main>
  );
}