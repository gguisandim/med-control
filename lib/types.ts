export type ShiftType = "day" | "night";
export type MedicationShift = ShiftType | "both";
export type ItemStatus = "pending" | "administered" | "not_administered";

export type Medication = {
  id: string;
  name: string;
  dose: string;
  instructions: string | null;
  route: string;
  scheduled_time: string | null;
  schedule_label: string | null;
  shift: MedicationShift;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Shift = {
  id: string;
  shift_date: string;
  shift_type: ShiftType;
  caregiver_name: string;
  started_at: string;
  finished_at: string | null;
  notes: string | null;
  created_at: string;
};

export type ShiftItem = {
  id: string;
  shift_id: string;
  medication_id: string | null;
  name: string;
  dose: string;
  instructions: string | null;
  route: string;
  scheduled_time: string | null;
  schedule_label: string | null;
  sort_order: number;
  status: ItemStatus;
  administered_at: string | null;
  notes: string | null;
  updated_at: string;
};

export type ShiftWithItems = Shift & { items: ShiftItem[] };
