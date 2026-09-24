import "server-only";
import { getSupabaseAdmin } from "./supabase";
import { getCurrentShift } from "./shift-time";
import type { Medication, Shift, ShiftItem, ShiftWithItems } from "./types";

export async function getCurrentShiftRecord(): Promise<ShiftWithItems | null> {
  const supabase = getSupabaseAdmin();
  const current = getCurrentShift();

  const { data: shift, error } = await supabase
    .from("shifts")
    .select("*")
    .eq("shift_date", current.shiftDate)
    .eq("shift_type", current.shiftType)
    .maybeSingle();

  if (error) throw error;
  if (!shift) return null;

  const { data: items, error: itemsError } = await supabase
    .from("shift_items")
    .select("*")
    .eq("shift_id", shift.id)
    .order("sort_order", { ascending: true })
    .order("scheduled_time", { ascending: true, nullsFirst: true });

  if (itemsError) throw itemsError;
  return { ...(shift as Shift), items: (items || []) as ShiftItem[] };
}

export async function getMedications(): Promise<Medication[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("medications")
    .select("*")
    .order("active", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("scheduled_time", { ascending: true, nullsFirst: true });

  if (error) throw error;
  return (data || []) as Medication[];
}

export async function getRecentShifts(limit = 30): Promise<ShiftWithItems[]> {
  const supabase = getSupabaseAdmin();
  const { data: shifts, error } = await supabase
    .from("shifts")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  if (!shifts?.length) return [];

  const ids = (shifts as Shift[]).map((s: Shift) => s.id);
  const { data: items, error: itemsError } = await supabase
    .from("shift_items")
    .select("*")
    .in("shift_id", ids)
    .order("sort_order", { ascending: true });

  if (itemsError) throw itemsError;
  const allItems = (items || []) as ShiftItem[];

  return (shifts as Shift[]).map((shift) => ({
    ...shift,
    items: allItems.filter((item) => item.shift_id === shift.id),
  }));
}
