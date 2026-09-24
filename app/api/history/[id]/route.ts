import { NextResponse } from "next/server";
import { hasSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getCurrentShift, localDateTimeToIso } from "@/lib/shift-time";

const validStatuses = new Set(["pending", "administered", "not_administered"]);
const validShifts = new Set(["day", "night"]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await hasSession())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();
    const caregiverName = String(body?.caregiverName || "").trim();
    const shiftDate = String(body?.shiftDate || "").trim();
    const shiftType = String(body?.shiftType || "").trim();
    const notes = String(body?.notes || "").trim() || null;
    const items = Array.isArray(body?.items) ? body.items : [];

    if (!id || caregiverName.length < 2 || !/^\d{4}-\d{2}-\d{2}$/.test(shiftDate) || !validShifts.has(shiftType)) {
      return NextResponse.json({ error: "Confira o responsável, a data e o turno." }, { status: 400 });
    }
    if (caregiverName.length > 120 || (notes?.length || 0) > 20000) {
      return NextResponse.json({ error: "Um dos campos de texto ficou grande demais." }, { status: 400 });
    }

    const normalizedItems = items.map((raw: Record<string, unknown>) => {
      const itemId = String(raw?.id || "");
      const status = String(raw?.status || "");
      const itemNotes = String(raw?.notes || "").trim() || null;
      const administeredAtLocal = String(raw?.administeredAtLocal || "").trim();
      if (!itemId || !validStatuses.has(status)) throw new Error("ITEM_INVALID");
      if ((itemNotes?.length || 0) > 2000) throw new Error("ITEM_INVALID");
      if (status === "administered" && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(administeredAtLocal)) {
        throw new Error("TIME_REQUIRED");
      }
      return {
        id: itemId,
        status,
        notes: itemNotes,
        administered_at: status === "administered"
          ? localDateTimeToIso(administeredAtLocal.slice(0, 10), administeredAtLocal.slice(11, 16))
          : null,
      };
    });

    const supabase = getSupabaseAdmin();
    const { data: shift, error: shiftError } = await supabase
      .from("shifts")
      .select("id, shift_date, shift_type")
      .eq("id", id)
      .single();
    if (shiftError || !shift) return NextResponse.json({ error: "Turno não encontrado." }, { status: 404 });
    const current = getCurrentShift();
    const isCurrentShift = shift.shift_date === current.shiftDate && shift.shift_type === current.shiftType;
    if (isCurrentShift && (shift.shift_date !== shiftDate || shift.shift_type !== shiftType)) {
      return NextResponse.json({ error: "A data ou o tipo do turno atual não pode ser alterado enquanto ele está em andamento. Os demais campos podem ser corrigidos normalmente." }, { status: 409 });
    }

    const { data: conflict, error: conflictError } = await supabase
      .from("shifts")
      .select("id")
      .eq("shift_date", shiftDate)
      .eq("shift_type", shiftType)
      .neq("id", id)
      .maybeSingle();
    if (conflictError) throw conflictError;
    if (conflict) {
      return NextResponse.json({ error: "Já existe outro registro para essa data e esse turno." }, { status: 409 });
    }

    const { data: dbItems, error: dbItemsError } = await supabase
      .from("shift_items")
      .select("id")
      .eq("shift_id", id);
    if (dbItemsError) throw dbItemsError;
    const allowedIds = new Set((dbItems || []).map((item: { id: string }) => item.id));
    if (normalizedItems.some((item: { id: string }) => !allowedIds.has(item.id))) {
      return NextResponse.json({ error: "Um dos itens não pertence a este turno." }, { status: 400 });
    }

    const { error: updateShiftError } = await supabase
      .from("shifts")
      .update({ caregiver_name: caregiverName, shift_date: shiftDate, shift_type: shiftType, notes })
      .eq("id", id);
    if (updateShiftError) throw updateShiftError;

    for (const item of normalizedItems) {
      const { error: itemError } = await supabase
        .from("shift_items")
        .update({ status: item.status, notes: item.notes, administered_at: item.administered_at })
        .eq("id", item.id)
        .eq("shift_id", id);
      if (itemError) throw itemError;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "TIME_REQUIRED") {
      return NextResponse.json({ error: "Todo item administrado precisa ter data e horário da administração." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "ITEM_INVALID") {
      return NextResponse.json({ error: "Há um item do histórico com dados inválidos." }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Não foi possível salvar as alterações do histórico." }, { status: 500 });
  }
}
