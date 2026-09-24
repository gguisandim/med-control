"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
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

export default function MedicationSettings({ initialMedications }: { initialMedications: Medication[] }) {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
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

  return (
    <>
      <section className="card stack">
        <h2 className="h2">Adicionar item</h2>
        <form className="stack" onSubmit={add}>
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
          <div className="small">Use horário exato ou uma descrição. Para o soro, por exemplo, pode usar “Durante o turno”.</div>
          {error ? <div className="error">{error}</div> : null}
          <button className="button" disabled={busy === "add"}>{busy === "add" ? "Salvando..." : "Adicionar"}</button>
        </form>
      </section>

      <div className="section-title">Itens cadastrados</div>
      <div className="stack">
        {initialMedications.map((med) => (
          <div className="card row" key={med.id} style={{ opacity: med.active ? 1 : .62 }}>
            <div>
              <strong>{med.scheduled_time ? med.scheduled_time.slice(0,5) : med.schedule_label || "Turno"} — {med.name}</strong>
              <div className="small">{med.dose} · {med.shift === "day" ? "Dia" : med.shift === "night" ? "Noite" : "Dia e noite"}</div>
              <div className="small">{med.instructions || "Sem instruções adicionais"} · Via {med.route}</div>
            </div>
            <button className={`button ${med.active ? "button-danger" : "button-secondary"}`} disabled={busy === med.id} onClick={() => toggle(med)}>
              {med.active ? "Suspender" : "Reativar"}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
