import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const roles = [
  { value: 'admin', label: 'Administrador' },
  { value: 'farmaceutico', label: 'Farmacéutico' },
  { value: 'tecnico', label: 'Técnico' },
];

export default function CompletarPerfil({ userId, email, onSuccess }: { userId: string, email: string, onSuccess?: () => void }) {
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState(roles[0].value);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (!supabase) {
      alert('Error interno: conexión a Supabase no disponible.');
      setLoading(false);
      return;
    }
    const { error } = await supabase.from('perfiles').insert([
      {
        user_id: userId,
        nombre,
        rol,
        activo: true,
        email: email, // Guardar el email de Auth
      },
    ]);
    if (error) {
      alert('❌ Error al guardar perfil: ' + error.message);
      setLoading(false);
      return;
    }
    alert('✅ Perfil completado correctamente.');
    setNombre('');
    setRol(roles[0].value);
    setLoading(false);
    if (onSuccess) onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 300 }}>
      <div style={{ marginBottom: 8 }}>
        <strong>Email:</strong> {email}
      </div>
      <label>
        Nombre completo
        <input
          type="text"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          required
          style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #e2e8f0', marginTop: 4 }}
        />
      </label>
      <label>
        Rol
        <select
          value={rol}
          onChange={e => setRol(e.target.value)}
          style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #e2e8f0', marginTop: 4 }}
        >
          {roles.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
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
        {loading ? 'Guardando...' : 'Guardar Perfil'}
      </button>
    </form>
  );
}
