import { NextResponse } from "next/server";
import { hasSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase";
import { administrationIsoForShift } from "@/lib/shift-time";
import type { ShiftType } from "@/lib/types";

export async function PATCH(request: Request) {
  if (!(await hasSession())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const body = await request.json();
    const id = String(body?.id || "");
    const status = String(body?.status || "");
    const notes = body?.notes == null ? undefined : String(body.notes).trim() || null;
    const administeredTime = body?.administeredTime == null ? null : String(body.administeredTime).trim();

    if (!id || !["pending", "administered", "not_administered"].includes(status)) {
      return NextResponse.json({ error: "Registro inválido." }, { status: 400 });
    }
    if (status === "administered" && !/^\d{2}:\d{2}$/.test(administeredTime || "")) {
      return NextResponse.json({ error: "Informe o horário em que o medicamento foi administrado." }, { status: 400 });
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
      .select("finished_at, shift_date, shift_type")
      .eq("id", item.shift_id)
      .single();
    if (shiftError) throw shiftError;
    if (shift.finished_at) return NextResponse.json({ error: "Este turno já foi finalizado. Faça a correção pelo Histórico." }, { status: 409 });

    let administeredAt: string | null = null;
    if (status === "administered") {
      try {
        administeredAt = administrationIsoForShift(shift.shift_date, shift.shift_type as ShiftType, administeredTime!);
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Horário inválido." }, { status: 400 });
      }
    }

    const patch: Record<string, unknown> = {
      status,
      administered_at: administeredAt,
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
