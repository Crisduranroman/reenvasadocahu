import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const user_id = body?.user_id as string;

    if (!user_id) {
      return NextResponse.json({ error: "Falta user_id" }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabaseAdmin.auth.admin.getUserById(user_id);

    if (error || !data?.user) {
      return NextResponse.json({ error: error?.message || "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email ?? "",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error inesperado" }, { status: 500 });
  }
}
