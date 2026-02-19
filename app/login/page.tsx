'use client';


import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Lock, Mail, Loader2, Pill, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!supabase) {
      alert("Error interno: conexión a Supabase no disponible.");
      setLoading(false);
      return;
    }
    // 1. Intento de inicio de sesión
    const email = username.includes('@') ? username : `${username}@sespa.es`;
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      alert("❌ Error de acceso: " + authError.message);
      setLoading(false);
      return;
    }

    if (authData?.session) {
      // 2. Verificación de estado ACTIVO y rol en la tabla perfiles
      const { data: perfil, error: perfilError } = await supabase
        .from('perfiles')
        .select('rol, activo')
        .eq('user_id', authData.session.user.id)
        .single();

      // Si el usuario está marcado como inactivo (activo === false)
      if (perfil && perfil.activo === false) {
        await supabase.auth.signOut(); // Cerramos la sesión que se acababa de abrir
        alert("⚠️ Acceso denegado: Su cuenta ha sido desactivada por el administrador.");
        setLoading(false);
        return;
      }

      // 3. Redirección según rol si está activo
      if (perfil && perfil.rol === 'admin') {
        router.replace('/');
      } else {
        router.replace('/reenvasado');
      }
    }
  };

  return (
    <main style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      background: '#f8fafc', 
      fontFamily: 'sans-serif',
      padding: '1rem'
    }}>
      <div style={{ position: 'fixed', top: 10, right: 10, zIndex: 9999, background: 'yellow', padding: 6, fontWeight: 900 }}>
        CABUEÑES LOGIN NUEVO ✅
        <div style={{ fontSize: 18, color: 'red', marginTop: 4 }}>
          VERSIÓN ACTUALIZADA - PRUEBA IMPOSIBLE DE CONFUNDIR 🚀
        </div>
      </div>
      <div style={{ 
        width: '100%', 
        maxWidth: '420px', 
        padding: '2.5rem', 
        background: 'white', 
        borderRadius: '24px', 
        boxShadow: '0 20px 40px -5px rgba(0,0,0,0.1)', 
        border: '1px solid #f1f5f9'
      }}>
        
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
            width: 64, height: 64, borderRadius: '20px', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            margin: '0 auto 1.5rem auto',
            boxShadow: '0 10px 15px -3px rgba(14, 165, 233, 0.3)'
          }}>
            <Pill color="white" size={32} />
          </div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.025em', lineHeight: 1.2 }}>
            Reenvasado de Medicamentos
          </h1>
          <div style={{ color: '#64748b', fontSize: '0.95rem', fontWeight: 600, marginTop: 4 }}>
            Servicio de Farmacia. Hospital Universitario de Cabueñes
          </div>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', display:'flex' }}>
              <Mail size={20} color="#94a3b8" />
            </div>
            <input 
              type="text" 
              placeholder="Usuario (sin @sespa.es)" 
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
              required
              style={{ width: '100%', padding: '16px 16px 16px 48px', borderRadius: '16px', border: '2px solid #e2e8f0', outline: 'none', fontSize: '0.95rem', color: '#334155' }} 
            />
          </div>

          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', display:'flex' }}>
              <Lock size={20} color="#94a3b8" />
            </div>
            <input 
              type="password" 
              placeholder="Contraseña de acceso" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '16px 16px 16px 48px', borderRadius: '16px', border: '2px solid #e2e8f0', outline: 'none', fontSize: '0.95rem', color: '#334155' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              marginTop: '1rem', background: '#0f172a', color: 'white', padding: '16px', 
              borderRadius: '16px', border: 'none', fontWeight: 700, fontSize: '1rem',
              cursor: loading ? 'wait' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10
            }}
          >
            {loading ? (
              <Loader2 style={{ animation: 'girar 1s linear infinite' }} size={20} />
            ) : (
              <><span>Iniciar sesión</span><ArrowRight size={20} /></>
            )}
          </button>
        </form>

        <div style={{ marginTop: '2.5rem', textAlign: 'center', borderTop:'1px solid #f1f5f9', paddingTop:'1.5rem' }}>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
            Uso exclusivo de personal autorizado
          </p>
        </div>

        <style jsx global>{`
          @keyframes girar { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </main>
  );
}
// trigger vercel
