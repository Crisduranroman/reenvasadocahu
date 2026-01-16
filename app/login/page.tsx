'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Lock, Mail, Loader2, Pill, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 1. Intento de inicio de sesión
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
      // 2. Verificación de estado ACTIVO en la tabla perfiles
      const { data: perfil, error: perfilError } = await supabase
        .from('perfiles')
        .select('activo')
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
      if (email === 'admin@admin.com') {
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
      justifyContent: 'center', 
      alignItems: 'center', 
      background: '#f8fafc', 
      fontFamily: 'sans-serif',
      padding: '1rem'
    }}>
      
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
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.025em' }}>
            Farmacia HUCA
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: 8, fontWeight: 500 }}>
            Reenvasado de Medicamentos: Programación y Validación
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', display:'flex' }}>
              <Mail size={20} color="#94a3b8" />
            </div>
            <input 
              type="email" 
              placeholder="Correo corporativo" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={20} />
            ) : (
              <><span>Iniciar Sesión</span><ArrowRight size={20} /></>
            )}
          </button>
        </form>

        <div style={{ marginTop: '2.5rem', textAlign: 'center', borderTop:'1px solid #f1f5f9', paddingTop:'1.5rem' }}>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
            Uso exclusivo personal autorizado
          </p>
        </div>

        <style jsx global>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </main>
  );
}