"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Save, X } from "lucide-react";
import type { ItemStatus, ShiftType, ShiftWithItems } from "@/lib/types";

function formatShiftDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}


function diaryEntries(value: string | null) {
  if (!value?.trim()) return [];
  return value.split(/\n\n---\n\n/g).map((entry) => entry.trim()).filter(Boolean);
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Belem",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function localInput(value: string | null) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Belem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function shiftLabel(type: ShiftType) {
  return type === "day" ? "DIA" : "NOITE";
}

type EditableItem = {
  id: string;
  name: string;
  status: ItemStatus;
  notes: string;
  administeredAtLocal: string;
};

type EditState = {
  caregiverName: string;
  shiftDate: string;
  shiftType: ShiftType;
  notes: string;
  items: EditableItem[];
};

function createEditState(shift: ShiftWithItems): EditState {
  return {
    caregiverName: shift.caregiver_name,
    shiftDate: shift.shift_date,
    shiftType: shift.shift_type,
    notes: shift.notes || "",
    items: shift.items.map((item) => ({
      id: item.id,
      name: item.name,
      status: item.status,
      notes: item.notes || "",
      administeredAtLocal: localInput(item.administered_at),
    })),
  };
}

export default function HistoryClient({ shifts }: { shifts: ShiftWithItems[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function startEdit(shift: ShiftWithItems) {
    setEditingId(shift.id);
    setEdit(createEditState(shift));
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEdit(null);
    setError("");
  }

  function patchItem(itemId: string, patch: Partial<EditableItem>) {
    setEdit((current) => current ? ({
      ...current,
      items: current.items.map((item) => item.id === itemId ? { ...item, ...patch } : item),
    }) : current);
  }

  async function save(shiftId: string) {
    if (!edit) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/history/${shiftId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(edit),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Não foi possível salvar as alterações.");
      return;
    }
    cancelEdit();
    router.refresh();
  }

  if (shifts.length === 0) return <div className="card empty">Ainda não existem turnos registrados.</div>;

  return (
    <div className="stack">
      {shifts.map((shift) => {
        const done = shift.items.filter((i) => i.status === "administered").length;
        const no = shift.items.filter((i) => i.status === "not_administered").length;
        const pending = shift.items.filter((i) => i.status === "pending").length;
        const editingState = editingId === shift.id ? edit : null;
        const isDemo = shift.caregiver_name.startsWith("[DEMO]");

        return (
          <details className="card history-row" key={shift.id} {...(editingState ? { open: true } : {})}>
            <summary style={{ cursor: "pointer" }}>
              <div className="row history-summary">
                <div>
                  <strong>{formatShiftDate(shift.shift_date)} — {shiftLabel(shift.shift_type)}</strong>
                  <div className="small">{shift.caregiver_name} {isDemo ? <span className="badge badge-demo">DEMO</span> : null}</div>
                </div>
                <span className={`badge ${pending ? "badge-pending" : no ? "badge-danger" : "badge-success"}`}>
                  {done}/{shift.items.length} administrados
                </span>
              </div>
            </summary>

            <div className="details stack">
              {editingState ? (
                <>
                  <div className="edit-panel stack">
                    <div className="grid2">
                      <label className="label">Responsável
                        <input className="input" value={editingState.caregiverName} onChange={(e) => setEdit({ ...editingState, caregiverName: e.target.value })} />
                      </label>
                      <label className="label">Data do turno
                        <input className="input" type="date" value={editingState.shiftDate} onChange={(e) => setEdit({ ...editingState, shiftDate: e.target.value })} />
                      </label>
                    </div>
                    <label className="label">Turno
                      <select className="select" value={editingState.shiftType} onChange={(e) => setEdit({ ...editingState, shiftType: e.target.value as ShiftType })}>
                        <option value="day">Dia</option>
                        <option value="night">Noite</option>
                      </select>
                    </label>
                    <label className="label">Diário / observações do turno
                      <textarea className="textarea" value={editingState.notes} onChange={(e) => setEdit({ ...editingState, notes: e.target.value })} />
                    </label>
                  </div>

                  <div className="section-title compact-title">Itens do turno</div>
                  {editingState.items.map((item) => (
                    <div className="history-edit-item stack" key={item.id}>
                      <strong>{item.name}</strong>
                      <div className="grid2">
                        <label className="label">Situação
                          <select className="select" value={item.status} onChange={(e) => patchItem(item.id, { status: e.target.value as ItemStatus })}>
                            <option value="pending">Pendente</option>
                            <option value="administered">Administrado</option>
                            <option value="not_administered">Não administrado</option>
                          </select>
                        </label>
                        <label className="label">Data e hora da administração
                          <input
                            className="input"
                            type="datetime-local"
                            disabled={item.status !== "administered"}
                            value={item.administeredAtLocal}
                            onChange={(e) => patchItem(item.id, { administeredAtLocal: e.target.value })}
                          />
                        </label>
                      </div>
                      <label className="label">Observação do item
                        <input className="input" value={item.notes} onChange={(e) => patchItem(item.id, { notes: e.target.value })} placeholder="Opcional" />
                      </label>
                    </div>
                  ))}

                  {error ? <div className="error">{error}</div> : null}
                  <div className="actions">
                    <button className="button" disabled={busy} onClick={() => save(shift.id)}><Save size={17} /> {busy ? "Salvando..." : "Salvar alterações"}</button>
                    <button className="button button-outline" disabled={busy} onClick={cancelEdit}><X size={17} /> Cancelar</button>
                  </div>
                  <div className="small">As correções alteram somente este registro histórico. O cadastro atual dos medicamentos não é modificado.</div>
                </>
              ) : (
                <>
                  {shift.items.map((item) => (
                    <div className="row history-item-row" key={item.id}>
                      <div>
                        <strong>{item.scheduled_time ? item.scheduled_time.slice(0,5) : item.schedule_label || "Turno"} — {item.name}</strong>
                        <div className="small">{item.dose}</div>
                        {item.notes ? <div className="small">Obs.: {item.notes}</div> : null}
                      </div>
                      <span className={`badge ${item.status === "administered" ? "badge-success" : item.status === "not_administered" ? "badge-danger" : "badge-pending"}`}>
                        {item.status === "administered" ? `Administrado ${item.administered_at ? formatDateTime(item.administered_at) : ""}` : item.status === "not_administered" ? "Não administrado" : "Pendente"}
                      </span>
                    </div>
                  ))}
                  {shift.notes ? (
                    <div className="history-diary stack">
                      <strong>Diário / observações do turno</strong>
                      {diaryEntries(shift.notes).map((entry, index) => (
                        <div className="diary-entry" key={`${shift.id}-note-${index}`}>{entry}</div>
                      ))}
                    </div>
                  ) : null}
                  <div className="small">Registro do turno criado em {formatDateTime(shift.started_at)}</div>
                  <button className="button button-outline" onClick={() => startEdit(shift)}><Pencil size={17} /> Editar histórico</button>
                </>
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}
