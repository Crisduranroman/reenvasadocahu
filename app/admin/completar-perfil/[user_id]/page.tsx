"use client";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import CompletarPerfil from '../../../../components/CompletarPerfil';
import CambiarPassword from '../../../../components/CambiarPassword';
import { supabase } from '@/lib/supabaseClient';
import { ArrowLeft } from 'lucide-react';

export default function CompletarPerfilPage({ params }: { params: { user_id: string } }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const resp = await fetch('/api/admin-get-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: params.user_id }),
      });
      const json = await resp.json();
      if (!resp.ok || !json?.user) {
        alert('No se pudo encontrar el usuario.');
        router.replace('/admin');
        return;
      }
      setEmail(json.user.email || '');
      // Comprobar si el usuario actual es admin
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (session) {
        const { data: perfil } = await supabase.from('perfiles').select('rol').eq('user_id', session.user.id).single();
        setIsAdmin(perfil?.rol === 'admin');
      }
      setLoading(false);
    };
    fetchUser();
  }, [params.user_id, router]);

  if (loading) return <div style={{ padding: 32 }}>Cargando...</div>;

  return (
    <div style={{ padding: 32 }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 24 }}>Completar Perfil</h2>
      {isAdmin && (
        <button
          onClick={() => router.push('/admin')}
          style={{
            marginBottom: 24,
            padding: '10px 15px',
            borderRadius: '10px',
            border: '1.5px solid #0ea5e9',
            background: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 700,
            fontSize: '0.9rem',
            color: '#0ea5e9'
          }}
        >
          <ArrowLeft size={18} style={{ marginRight: 4 }} /> Volver al Panel
        </button>
      )}
      <CompletarPerfil userId={params.user_id} email={email} onSuccess={() => router.replace('/admin')} />
      {isAdmin && (
        <div style={{ marginTop: 40 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 12 }}>Cambiar contraseña</h3>
          <CambiarPassword userId={params.user_id} email={email} onSuccess={() => alert('Contraseña cambiada')} />
        </div>
      )}
    </div>
  );
}
