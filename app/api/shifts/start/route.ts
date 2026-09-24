import { NextResponse } from "next/server";
import { hasSession } from "@/lib/session";
import { getCurrentShift } from "@/lib/shift-time";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  if (!(await hasSession())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const { caregiverName } = await request.json();
    const name = String(caregiverName || "").trim();
    if (name.length < 2) return NextResponse.json({ error: "Informe o nome do responsável." }, { status: 400 });

    const current = getCurrentShift();
    const supabase = getSupabaseAdmin();

    const { data: existing, error: existingError } = await supabase
      .from("shifts")
      .select("id")
      .eq("shift_date", current.shiftDate)
      .eq("shift_type", current.shiftType)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing) return NextResponse.json({ ok: true, id: existing.id });

    const { data: shift, error: shiftError } = await supabase
      .from("shifts")
      .insert({ shift_date: current.shiftDate, shift_type: current.shiftType, caregiver_name: name })
      .select("*")
      .single();

    if (shiftError) throw shiftError;

    const { data: medications, error: medsError } = await supabase
      .from("medications")
      .select("*")
      .eq("active", true)
      .in("shift", [current.shiftType, "both"])
      .order("sort_order", { ascending: true });

    if (medsError) throw medsError;

    if (medications?.length) {
      const snapshots = medications.map((med) => ({
        shift_id: shift.id,
        medication_id: med.id,
        name: med.name,
        dose: med.dose,
        instructions: med.instructions,
        route: med.route,
        scheduled_time: med.scheduled_time,
        schedule_label: med.schedule_label,
        sort_order: med.sort_order,
        status: "pending",
      }));

      const { error: itemError } = await supabase.from("shift_items").insert(snapshots);
      if (itemError) throw itemError;
    }

    return NextResponse.json({ ok: true, id: shift.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao iniciar o turno." }, { status: 500 });
  }
}
