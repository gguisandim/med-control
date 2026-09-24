import { NextResponse } from "next/server";
import { hasSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase";

const validShifts = new Set(["day", "night", "both"]);

function normalizeMedication(body: Record<string, unknown>) {
  const name = String(body?.name || "").trim();
  const dose = String(body?.dose || "").trim();
  const route = String(body?.route || "").trim();
  const instructions = String(body?.instructions || "").trim() || null;
  const shift = String(body?.shift || "");
  const scheduledTime = String(body?.scheduledTime || "").trim() || null;
  const scheduleLabel = String(body?.scheduleLabel || "").trim() || null;
  const sortOrder = Number.isFinite(Number(body?.sortOrder)) ? Number(body.sortOrder) : 100;

  if (!name || !dose || !route || !validShifts.has(shift)) {
    throw new Error("Preencha nome, dose, via e turno.");
  }
  if (!scheduledTime && !scheduleLabel) {
    throw new Error("Informe um horário ou uma descrição do horário.");
  }
  if (scheduledTime && !/^\d{2}:\d{2}$/.test(scheduledTime)) {
    throw new Error("Horário inválido.");
  }

  return {
    name,
    dose,
    route,
    instructions,
    shift,
    scheduled_time: scheduledTime,
    schedule_label: scheduleLabel,
    sort_order: sortOrder,
  };
}

export async function POST(request: Request) {
  if (!(await hasSession())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const body = await request.json();
    const medication = normalizeMedication(body);
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("medications").insert({ ...medication, active: true });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && !error.message.toLowerCase().includes("supabase")) {
      if (["Preencha nome, dose, via e turno.", "Informe um horário ou uma descrição do horário.", "Horário inválido."].includes(error.message)) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    console.error(error);
    return NextResponse.json({ error: "Erro ao cadastrar o item." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await hasSession())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const body = await request.json();
    const id = String(body?.id || "");
    if (!id) return NextResponse.json({ error: "Alteração inválida." }, { status: 400 });

    const supabase = getSupabaseAdmin();

    if (typeof body?.active === "boolean" && body?.name == null) {
      const { error } = await supabase.from("medications").update({ active: body.active }).eq("id", id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    const medication = normalizeMedication(body);
    const { error } = await supabase.from("medications").update(medication).eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && ["Preencha nome, dose, via e turno.", "Informe um horário ou uma descrição do horário.", "Horário inválido."].includes(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Erro ao atualizar o item." }, { status: 500 });
  }
}
