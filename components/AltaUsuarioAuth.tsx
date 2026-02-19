import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AltaUsuarioAuth({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (!supabase) {
      alert('Error interno: conexión a Supabase no disponible.');
      setLoading(false);
      return;
    }
    const email = username.includes('@') ? username : `${username}@sespa.es`;
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      alert('❌ Error al crear usuario: ' + error.message);
      setLoading(false);
      return;
    }
    const userId = data?.user?.id;
    if (userId) {
      router.push(`/admin/completar-perfil/${userId}`);
    } else {
      alert('Usuario creado, pero no se pudo obtener el ID para completar el perfil.');
      setUsername('');
      setPassword('');
      setLoading(false);
      if (onSuccess) onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 300 }}>
      <label>
        Usuario (sin @sespa.es)
        <input
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value.replace(/\s/g, ''))}
          required
          style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #e2e8f0', marginTop: 4 }}
        />
      </label>
      <label>
        Contraseña
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #e2e8f0', marginTop: 4 }}
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        style={{
          marginTop: 12,
          background: '#0f172a',
          color: 'white',
          padding: 12,
          borderRadius: 8,
          border: 'none',
          fontWeight: 700,
          fontSize: '1rem',
          cursor: loading ? 'wait' : 'pointer',
        }}
      >
        {loading ? 'Creando...' : 'Confirmar Alta'}
      </button>
    </form>
  );
}
