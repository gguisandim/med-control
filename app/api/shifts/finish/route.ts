import { NextResponse } from "next/server";
import { hasSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  if (!(await hasSession())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const body = await request.json();
    const shiftId = String(body?.shiftId || "");
    const notes = String(body?.notes || "").trim() || null;
    if (!shiftId) return NextResponse.json({ error: "Turno inválido." }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("shifts")
      .update({ finished_at: new Date().toISOString(), notes })
      .eq("id", shiftId)
      .is("finished_at", null);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao finalizar o turno." }, { status: 500 });
  }
}
