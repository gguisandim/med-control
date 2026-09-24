import { NextResponse } from "next/server";
import { hasSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase";
import { addDays, administrationIsoForShift, getCurrentShift } from "@/lib/shift-time";
import type { Medication, ShiftType } from "@/lib/types";

const demoNames = ["[DEMO] Carla", "[DEMO] Tamires", "[DEMO] Leuziane", "[DEMO] Lúcia"];

function plusMinutes(time: string, minutesToAdd: number) {
  const [hour, minute] = time.slice(0, 5).split(":").map(Number);
  const total = (hour * 60 + minute + minutesToAdd + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export async function POST() {
  if (!(await hasSession())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const supabase = getSupabaseAdmin();
  try {
    const { data: existingDemo, error: demoError } = await supabase
      .from("shifts")
      .select("id")
      .like("caregiver_name", "[DEMO]%");
    if (demoError) throw demoError;
    if (existingDemo?.length) {
      return NextResponse.json({ ok: true, created: 0, message: "Os dados de demonstração já estão no histórico." });
    }

    const { data: medicationsRaw, error: medsError } = await supabase
      .from("medications")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true });
    if (medsError) throw medsError;
    const medications = (medicationsRaw || []) as Medication[];
    if (!medications.length) return NextResponse.json({ error: "Cadastre pelo menos um medicamento antes de criar a demonstração." }, { status: 400 });

    const base = getCurrentShift().shiftDate;
    const candidates: { date: string; type: ShiftType }[] = [];
    for (let offset = 1; offset <= 12; offset++) {
      const date = addDays(base, -offset);
      candidates.push({ date, type: "night" }, { date, type: "day" });
    }

    const { data: occupied, error: occupiedError } = await supabase
      .from("shifts")
      .select("shift_date, shift_type")
      .in("shift_date", candidates.map((x: { date: string; type: ShiftType }) => x.date));
    if (occupiedError) throw occupiedError;
    const occupiedKeys = new Set((occupied || []).map((x: { shift_date: string; shift_type: ShiftType }) => `${x.shift_date}:${x.shift_type}`));
    const slots = candidates.filter((x) => !occupiedKeys.has(`${x.date}:${x.type}`)).slice(0, 8);

    if (slots.length < 4) {
      return NextResponse.json({ error: "Não encontrei turnos livres suficientes para inserir dados de demonstração sem sobrescrever registros existentes." }, { status: 409 });
    }

    let created = 0;
    for (let s = 0; s < slots.length; s++) {
      const slot = slots[s];
      const startTime = slot.type === "day" ? "07:32" : "19:32";
      const startedAt = administrationIsoForShift(slot.date, slot.type, startTime);

      const { data: shift, error: shiftError } = await supabase
        .from("shifts")
        .insert({
          shift_date: slot.date,
          shift_type: slot.type,
          caregiver_name: demoNames[s % demoNames.length],
          started_at: startedAt,
          notes: s === 2 ? "Registro de demonstração com uma observação geral do turno." : "Dados fictícios para visualização do aplicativo.",
        })
        .select("id")
        .single();
      if (shiftError) throw shiftError;

      try {
        const medsForShift = medications.filter((med: Medication) => med.shift === slot.type || med.shift === "both");
        const snapshots = medsForShift.map((med: Medication, index: number) => {
          const specialNotAdmin = s === 1 && index === 1;
          const specialPending = s === 0 && index === medsForShift.length - 1;
          const status = specialNotAdmin ? "not_administered" : specialPending ? "pending" : "administered";

          let actualTime = med.scheduled_time ? plusMinutes(med.scheduled_time, ((s + index) % 4) * 3 + 2) : slot.type === "day" ? "09:05" : "23:15";
          // Evita que um pequeno acréscimo empurre 07:29/19:29 para fora do turno em dados customizados.
          if (slot.type === "day" && actualTime >= "19:30") actualTime = "19:20";
          if (slot.type === "night" && actualTime >= "07:30" && actualTime < "19:30") actualTime = "06:55";

          return {
            shift_id: shift.id,
            medication_id: med.id,
            name: med.name,
            dose: med.dose,
            instructions: med.instructions,
            route: med.route,
            scheduled_time: med.scheduled_time,
            schedule_label: med.schedule_label,
            sort_order: med.sort_order,
            status,
            administered_at: status === "administered" ? administrationIsoForShift(slot.date, slot.type, actualTime) : null,
            notes: specialNotAdmin ? "Demonstração: item não administrado para testar os alertas." : null,
          };
        });

        if (snapshots.length) {
          const { error: itemError } = await supabase.from("shift_items").insert(snapshots);
          if (itemError) throw itemError;
        }
        created++;
      } catch (error) {
        await supabase.from("shifts").delete().eq("id", shift.id);
        throw error;
      }
    }

    return NextResponse.json({ ok: true, created });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Não foi possível criar os dados de demonstração." }, { status: 500 });
  }
}

export async function DELETE() {
  if (!(await hasSession())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("shifts").delete().like("caregiver_name", "[DEMO]%");
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Não foi possível remover os dados de demonstração." }, { status: 500 });
  }
}
