"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Save, X } from "lucide-react";
import type { Medication, MedicationShift } from "@/lib/types";

const emptyForm = {
  name: "",
  dose: "",
  instructions: "Amassar e diluir em água",
  route: "Sonda",
  scheduledTime: "",
  scheduleLabel: "",
  shift: "day" as MedicationShift,
  sortOrder: 100,
};

type MedicationForm = typeof emptyForm;

function formFromMedication(med: Medication): MedicationForm {
  return {
    name: med.name,
    dose: med.dose,
    instructions: med.instructions || "",
    route: med.route,
    scheduledTime: med.scheduled_time ? med.scheduled_time.slice(0, 5) : "",
    scheduleLabel: med.schedule_label || "",
    shift: med.shift,
    sortOrder: med.sort_order,
  };
}

function MedicationFields({ form, setForm }: { form: MedicationForm; setForm: (form: MedicationForm) => void }) {
  return (
    <>
      <div className="grid2">
        <label className="label">Nome<input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label className="label">Dose/quantidade<input className="input" required placeholder="Ex.: 1 comprimido" value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} /></label>
      </div>
      <label className="label">Instruções<input className="input" value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} /></label>
      <div className="grid2">
        <label className="label">Via<input className="input" required value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })} /></label>
        <label className="label">Turno
          <select className="select" value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value as MedicationShift })}>
            <option value="day">Dia</option>
            <option value="night">Noite</option>
            <option value="both">Dia e noite</option>
          </select>
        </label>
      </div>
      <div className="grid2">
        <label className="label">Horário exato<input className="input" type="time" value={form.scheduledTime} onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })} /></label>
        <label className="label">Ou descrição do horário<input className="input" placeholder="Ex.: Após a primeira dieta" value={form.scheduleLabel} onChange={(e) => setForm({ ...form, scheduleLabel: e.target.value })} /></label>
      </div>
    </>
  );
}

export default function MedicationSettings({ initialMedications }: { initialMedications: Medication[] }) {
  const router = useRouter();
  const [form, setForm] = useState<MedicationForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<MedicationForm | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function add(e: FormEvent) {
    e.preventDefault();
    setBusy("add");
    setError("");
    const res = await fetch("/api/medications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Não foi possível cadastrar.");
      return;
    }
    setForm(emptyForm);
    router.refresh();
  }

  async function toggle(med: Medication) {
    setBusy(med.id);
    setError("");
    const res = await fetch("/api/medications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: med.id, active: !med.active }),
    });
    setBusy(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Não foi possível alterar.");
      return;
    }
    router.refresh();
  }

  function beginEdit(med: Medication) {
    setEditingId(med.id);
    setEditForm(formFromMedication(med));
    setError("");
  }

  async function saveEdit() {
    if (!editingId || !editForm) return;
    setBusy(editingId);
    setError("");
    const res = await fetch("/api/medications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingId, ...editForm }),
    });
    setBusy(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Não foi possível salvar as alterações.");
      return;
    }
    setEditingId(null);
    setEditForm(null);
    router.refresh();
  }

  return (
    <>
      <section className="card stack">
        <h2 className="h2">Adicionar item</h2>
        <form className="stack" onSubmit={add}>
          <MedicationFields form={form} setForm={setForm} />
          <div className="small">Use horário exato ou uma descrição. Para o soro, por exemplo, pode usar “Durante o turno”.</div>
          {error && !editingId ? <div className="error">{error}</div> : null}
          <button className="button" disabled={busy === "add"}>{busy === "add" ? "Salvando..." : "Adicionar"}</button>
        </form>
      </section>

      <div className="section-title">Itens cadastrados</div>
      <div className="stack">
        {initialMedications.map((med) => {
          const editingForm = editingId === med.id ? editForm : null;
          return (
            <div className="card stack" key={med.id} style={{ opacity: med.active ? 1 : .68 }}>
              {editingForm ? (
                <>
                  <MedicationFields form={editingForm} setForm={setEditForm} />
                  {error ? <div className="error">{error}</div> : null}
                  <div className="actions">
                    <button className="button" disabled={busy === med.id} onClick={saveEdit}><Save size={17} /> {busy === med.id ? "Salvando..." : "Salvar"}</button>
                    <button className="button button-outline" disabled={busy === med.id} onClick={() => { setEditingId(null); setEditForm(null); setError(""); }}><X size={17} /> Cancelar</button>
                  </div>
                  <div className="small">A alteração vale para novos turnos. Os turnos antigos mantêm o snapshot histórico.</div>
                </>
              ) : (
                <div className="row medication-row">
                  <div>
                    <strong>{med.scheduled_time ? med.scheduled_time.slice(0,5) : med.schedule_label || "Turno"} — {med.name}</strong>
                    <div className="small">{med.dose} · {med.shift === "day" ? "Dia" : med.shift === "night" ? "Noite" : "Dia e noite"}</div>
                    <div className="small">{med.instructions || "Sem instruções adicionais"} · Via {med.route}</div>
                  </div>
                  <div className="settings-actions">
                    <button className="button button-outline" disabled={busy === med.id} onClick={() => beginEdit(med)}><Pencil size={16} /> Editar</button>
                    <button className={`button ${med.active ? "button-danger" : "button-secondary"}`} disabled={busy === med.id} onClick={() => toggle(med)}>
                      {med.active ? "Suspender" : "Reativar"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
