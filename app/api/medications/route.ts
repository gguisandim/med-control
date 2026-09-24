import { NextResponse } from "next/server";
import { hasSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase";

const validShifts = new Set(["day", "night", "both"]);

export async function POST(request: Request) {
  if (!(await hasSession())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const body = await request.json();
    const name = String(body?.name || "").trim();
    const dose = String(body?.dose || "").trim();
    const route = String(body?.route || "").trim();
    const instructions = String(body?.instructions || "").trim() || null;
    const shift = String(body?.shift || "");
    const scheduledTime = String(body?.scheduledTime || "").trim() || null;
    const scheduleLabel = String(body?.scheduleLabel || "").trim() || null;
    const sortOrder = Number.isFinite(Number(body?.sortOrder)) ? Number(body.sortOrder) : 100;

    if (!name || !dose || !route || !validShifts.has(shift)) {
      return NextResponse.json({ error: "Preencha nome, dose, via e turno." }, { status: 400 });
    }
    if (!scheduledTime && !scheduleLabel) {
      return NextResponse.json({ error: "Informe um horário ou uma descrição do horário." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("medications").insert({
      name,
      dose,
      route,
      instructions,
      shift,
      scheduled_time: scheduledTime,
      schedule_label: scheduleLabel,
      sort_order: sortOrder,
      active: true,
    });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao cadastrar o item." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await hasSession())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const body = await request.json();
    const id = String(body?.id || "");
    if (!id || typeof body?.active !== "boolean") {
      return NextResponse.json({ error: "Alteração inválida." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("medications").update({ active: body.active }).eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao atualizar o item." }, { status: 500 });
  }
}
