"use client";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import CompletarPerfil from '../../../../components/CompletarPerfil';
import CambiarPassword from '../../../../components/CambiarPassword';
import { supabase } from '@/lib/supabaseClient';

export default function CompletarPerfilPage({ params }: { params: { user_id: string } }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.admin.getUserById(params.user_id);
      if (error || !data?.user) {
        alert('No se pudo encontrar el usuario.');
        router.replace('/admin');
        return;
      }
      setEmail(data.user.email || '');
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
