import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface NuevoUsuarioFormProps {
  onSuccess?: () => void;
}

const roles = [
  { value: 'admin', label: 'Administrador' },
  { value: 'farmaceutico', label: 'Farmacéutico' },
  { value: 'tecnico', label: 'Técnico' },
];

export default function NuevoUsuarioForm({ onSuccess }: NuevoUsuarioFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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

    const email = username.includes('@') ? username : `${username}@sespa.es`;

    // 1. Crear usuario en Auth
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      alert('❌ Error al crear usuario: ' + signUpError.message);
      setLoading(false);
      return;
    }

    const userId = signUpData?.user?.id;
    if (!userId) {
      alert('No se pudo obtener el ID del usuario creado.');
      setLoading(false);
      return;
    }

    // 2. Insertar en perfiles
    const { error: perfilError } = await supabase.from('perfiles').insert([
      {
        user_id: userId,
        nombre,
        rol,
        activo: true,
      },
    ]);

    if (perfilError) {
      alert('❌ Error al guardar perfil: ' + perfilError.message);
      setLoading(false);
      return;
    }

    alert('✅ Usuario creado correctamente.');
    setUsername('');
    setPassword('');
    setNombre('');
    setRol(roles[0].value);
    setLoading(false);
    if (onSuccess) onSuccess();
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
        {loading ? 'Creando...' : 'Confirmar Alta'}
      </button>
    </form>
  );
}
