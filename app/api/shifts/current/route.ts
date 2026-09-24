import { NextResponse } from "next/server";
import { hasSession } from "@/lib/session";
import { getCurrentShift } from "@/lib/shift-time";
import { getSupabaseAdmin } from "@/lib/supabase";

function diaryTimestamp() {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Belem",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
}

export async function PATCH(request: Request) {
  if (!(await hasSession())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const body = await request.json();
    const id = String(body?.id || "");
    const caregiverName = typeof body?.caregiverName === "string" ? body.caregiverName.trim() : "";
    const diaryEntry = typeof body?.diaryEntry === "string" ? body.diaryEntry.trim() : "";

    if (!id) return NextResponse.json({ error: "Turno inválido." }, { status: 400 });
    if (!caregiverName && !diaryEntry) {
      return NextResponse.json({ error: "Nenhuma alteração foi informada." }, { status: 400 });
    }
    if (caregiverName && (caregiverName.length < 2 || caregiverName.length > 120)) {
      return NextResponse.json({ error: "Informe um nome válido para o responsável." }, { status: 400 });
    }
    if (diaryEntry.length > 1500) {
      return NextResponse.json({ error: "A anotação deve ter no máximo 1500 caracteres." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: shift, error: shiftError } = await supabase
      .from("shifts")
      .select("id, shift_date, shift_type, caregiver_name, notes")
      .eq("id", id)
      .single();

    if (shiftError || !shift) return NextResponse.json({ error: "Turno não encontrado." }, { status: 404 });

    const current = getCurrentShift();
    if (shift.shift_date !== current.shiftDate || shift.shift_type !== current.shiftType) {
      return NextResponse.json({ error: "Esse turno já saiu da janela atual. Faça a correção pelo Histórico." }, { status: 409 });
    }

    if (diaryEntry) {
      const entry = `${diaryTimestamp()} — ${shift.caregiver_name}\n${diaryEntry}`;
      const nextNotes = shift.notes?.trim() ? `${shift.notes.trim()}\n\n---\n\n${entry}` : entry;
      if (nextNotes.length > 20000) {
        return NextResponse.json({ error: "O diário deste turno ficou muito grande. Faça uma correção/compactação pelo Histórico antes de adicionar novas anotações." }, { status: 400 });
      }

      const { error } = await supabase.from("shifts").update({ notes: nextNotes }).eq("id", id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    const { error } = await supabase
      .from("shifts")
      .update({ caregiver_name: caregiverName })
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Não foi possível salvar a alteração do turno." }, { status: 500 });
  }
}
