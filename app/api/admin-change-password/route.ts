// /app/api/admin-change-password/route.ts (Next.js 13+ App Router API Route)
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Solo en el backend: nunca expongas esta clave en el frontend
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { user_id, new_password, admin_user_id } = await req.json();
    if (!user_id || !new_password || !admin_user_id) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
    }

    // Verifica que el usuario que hace la petición es admin
    const { data: perfil, error } = await supabaseAdmin
      .from('perfiles')
      .select('rol')
      .eq('user_id', admin_user_id)
      .single();
    if (error || !perfil || perfil.rol !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Cambia la contraseña usando el método admin correcto
    const { error: pwError } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { password: new_password }
    );
    if (pwError) {
      return NextResponse.json({ error: pwError.message }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Error en admin-change-password:', e);
    return NextResponse.json({ error: 'Error interno', detalle: String(e) }, { status: 500 });
  }
}
