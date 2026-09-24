import { NextResponse } from "next/server";
import { hasSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function PATCH(request: Request) {
  if (!(await hasSession())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const body = await request.json();
    const id = String(body?.id || "");
    const status = String(body?.status || "");
    const notes = body?.notes == null ? undefined : String(body.notes).trim() || null;

    if (!id || !["pending", "administered", "not_administered"].includes(status)) {
      return NextResponse.json({ error: "Registro inválido." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: item, error: itemError } = await supabase
      .from("shift_items")
      .select("shift_id")
      .eq("id", id)
      .single();
    if (itemError) throw itemError;

    const { data: shift, error: shiftError } = await supabase
      .from("shifts")
      .select("finished_at")
      .eq("id", item.shift_id)
      .single();
    if (shiftError) throw shiftError;
    if (shift.finished_at) return NextResponse.json({ error: "Este turno já foi finalizado." }, { status: 409 });

    const patch: Record<string, unknown> = {
      status,
      administered_at: status === "administered" ? new Date().toISOString() : null,
    };
    if (status === "pending") patch.notes = null;
    else if (notes !== undefined) patch.notes = notes;

    const { error } = await supabase.from("shift_items").update(patch).eq("id", id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao atualizar o registro." }, { status: 500 });
  }
}
