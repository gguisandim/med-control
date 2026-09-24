import { NextResponse } from "next/server";
import { hasSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase";
import { administrationIsoForShift, getCurrentShift } from "@/lib/shift-time";
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
    if ((notes?.length || 0) > 2000) {
      return NextResponse.json({ error: "A observação ficou grande demais." }, { status: 400 });
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
    if (itemError || !item) return NextResponse.json({ error: "Item não encontrado." }, { status: 404 });

    const { data: shift, error: shiftError } = await supabase
      .from("shifts")
      .select("shift_date, shift_type")
      .eq("id", item.shift_id)
      .single();
    if (shiftError || !shift) return NextResponse.json({ error: "Turno não encontrado." }, { status: 404 });

    const current = getCurrentShift();
    if (shift.shift_date !== current.shiftDate || shift.shift_type !== current.shiftType) {
      return NextResponse.json({ error: "Esse turno já terminou. Faça a correção pelo Histórico." }, { status: 409 });
    }

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
      notes: status === "pending" ? null : notes ?? null,
    };

    const { error } = await supabase.from("shift_items").update(patch).eq("id", id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao salvar o registro." }, { status: 500 });
  }
}
