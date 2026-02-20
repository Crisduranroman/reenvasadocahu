import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs"; // importante en Next 13 App Router

type Body = {
  email: string;
  password?: string; // opcional: si no mandas, la generas tú en UI o pides luego cambio
  nombre?: string;
  rol?: "admin" | "farmaceutico" | "tecnico";
  activo?: boolean;
};

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRole) {
      return NextResponse.json(
        { error: "Faltan variables de entorno (SUPABASE URL o SERVICE ROLE)." },
        { status: 500 }
      );
    }

    const admin = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false },
    });

    const body = (await req.json()) as Body;

    const email = String(body.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Email inválido." }, { status: 400 });
    }

    const rol = body.rol ?? "tecnico";
    const activo = body.activo ?? true;
    const nombre = (body.nombre ?? "").trim();

    // 1) Crear usuario en Auth
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: body.password,         // si no mandas password, Supabase puede fallar según config
      email_confirm: true,             // evita que quede “pendiente” si quieres
      user_metadata: { nombre, rol },  // opcional
    });

    if (createErr || !created?.user?.id) {
      return NextResponse.json(
        { error: createErr?.message || "No se pudo crear usuario en Auth." },
        { status: 400 }
      );
    }

    const user_id = created.user.id;

    // 2) Crear/actualizar perfil (con service role -> no le afecta RLS)
    const { error: perfilErr } = await admin.from("perfiles").upsert({
      user_id,
      email,
      nombre: nombre || null,
      rol,
      activo,
    });

    if (perfilErr) {
      return NextResponse.json(
        { error: "Usuario creado, pero falló el perfil: " + perfilErr.message, user_id },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, user_id });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Error inesperado" },
      { status: 500 }
    );
  }
}
