import { NextResponse } from "next/server";
import { hasSession } from "@/lib/session";
import { getCurrentShift } from "@/lib/shift-time";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function PATCH(request: Request) {
  if (!(await hasSession())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const body = await request.json();
    const id = String(body?.id || "");
    const caregiverName = String(body?.caregiverName || "").trim();

    if (!id || caregiverName.length < 2 || caregiverName.length > 120) {
      return NextResponse.json({ error: "Informe um nome válido para o responsável." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: shift, error: shiftError } = await supabase
      .from("shifts")
      .select("id, shift_date, shift_type")
      .eq("id", id)
      .single();

    if (shiftError || !shift) return NextResponse.json({ error: "Turno não encontrado." }, { status: 404 });

    const current = getCurrentShift();
    if (shift.shift_date !== current.shiftDate || shift.shift_type !== current.shiftType) {
      return NextResponse.json({ error: "Esse turno já saiu da janela atual. Faça a correção pelo Histórico." }, { status: 409 });
    }

    const { error } = await supabase
      .from("shifts")
      .update({ caregiver_name: caregiverName })
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Não foi possível alterar o responsável." }, { status: 500 });
  }
}
