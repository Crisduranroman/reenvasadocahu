import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function CambiarPassword({ userId, email, onSuccess }: { userId: string, email: string, onSuccess?: () => void }) {
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
    // Solo admin puede cambiar contraseñas
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;
    if (!session) {
      alert('Sesión no válida.');
      setLoading(false);
      return;
    }
    const { data: perfil } = await supabase.from('perfiles').select('rol').eq('user_id', session.user.id).single();
    if (!perfil || perfil.rol !== 'admin') {
      alert('Solo el administrador puede cambiar contraseñas.');
      setLoading(false);
      return;
    }
    // Cambiar contraseña usando la API Route segura
    try {
      const response = await fetch('/api/admin-change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          new_password: password,
          admin_user_id: session.user.id
        })
      });
      const result = await response.json();
      if (!response.ok) {
        alert('❌ Error al cambiar contraseña: ' + (result.error || 'Error desconocido'));
        setLoading(false);
        return;
      }
      alert('✅ Contraseña cambiada correctamente.');
      setPassword('');
      setLoading(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      alert('❌ Error de red al cambiar contraseña.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginTop: 24 }}>
      <label style={{ fontWeight: 600 }}>Nueva contraseña para <span style={{ color: '#0284c7' }}>{email}</span></label>
      <input
        type="password"
        placeholder="Nueva contraseña"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
        minLength={6}
        style={{ padding: '12px', borderRadius: '10px', border: '2px solid #e2e8f0', fontSize: '1rem' }}
      />
      <button
        type="submit"
        disabled={loading}
        style={{ background: '#0f172a', color: 'white', padding: '12px', borderRadius: '10px', border: 'none', fontWeight: 700, fontSize: '1rem', cursor: loading ? 'wait' : 'pointer' }}
      >
        {loading ? 'Cambiando...' : 'Cambiar Contraseña'}
      </button>
    </form>
  );
}
