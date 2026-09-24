"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleAlert, Moon, Sun } from "lucide-react";
import type { ItemStatus, ShiftType, ShiftWithItems } from "@/lib/types";

function fmtTime(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Belem",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function TodayClient({
  current,
  initialShift,
}: {
  current: { shiftType: ShiftType; shiftDate: string };
  initialShift: ShiftWithItems | null;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState(initialShift?.notes || "");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const counts = useMemo(() => {
    const items = initialShift?.items || [];
    return {
      total: items.length,
      administered: items.filter((x) => x.status === "administered").length,
      notAdministered: items.filter((x) => x.status === "not_administered").length,
      pending: items.filter((x) => x.status === "pending").length,
    };
  }, [initialShift]);

  async function startShift(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy("start");
    setError("");
    const res = await fetch("/api/shifts/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caregiverName: name.trim() }),
    });
    setBusy(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Não foi possível iniciar o turno.");
      return;
    }
    router.refresh();
  }

  async function updateItem(id: string, status: ItemStatus) {
    let itemNotes: string | undefined;
    if (status === "not_administered") {
      itemNotes = window.prompt("Motivo (opcional):") || "";
    }

    setBusy(id);
    setError("");
    const res = await fetch("/api/administrations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, notes: itemNotes }),
    });
    setBusy(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Não foi possível atualizar o registro.");
      return;
    }
    router.refresh();
  }

  async function finishShift() {
    if (!initialShift) return;
    if (counts.pending > 0 && !window.confirm(`Ainda existem ${counts.pending} item(ns) pendente(s). Finalizar mesmo assim?`)) {
      return;
    }
    setBusy("finish");
    setError("");
    const res = await fetch("/api/shifts/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shiftId: initialShift.id, notes }),
    });
    setBusy(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Não foi possível finalizar o turno.");
      return;
    }
    router.refresh();
  }

  if (!initialShift) {
    return (
      <section className="card stack">
        <div className="row">
          <div>
            <h2 className="h2">Iniciar turno</h2>
            <p className="subtle">Informe quem está assumindo os cuidados neste turno.</p>
          </div>
          {current.shiftType === "day" ? <Sun size={30} /> : <Moon size={30} />}
        </div>
        <form className="stack" onSubmit={startShift}>
          <label className="label">
            Nome do responsável
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Maria" required />
          </label>
          {error ? <div className="error">{error}</div> : null}
          <button className="button" disabled={busy === "start"} type="submit">
            {busy === "start" ? "Iniciando..." : "Iniciar turno"}
          </button>
        </form>
      </section>
    );
  }

  const locked = Boolean(initialShift.finished_at);

  return (
    <>
      <section className="card stack">
        <div className="row">
          <div>
            <div className="small">Responsável</div>
            <div className="h2">{initialShift.caregiver_name}</div>
          </div>
          {locked ? <span className="badge badge-success">Turno finalizado</span> : <span className="badge badge-pending">Em andamento</span>}
        </div>
        <div className="grid2">
          <div className="kpi"><div className="kpi-value">{counts.administered}</div><div className="kpi-label">Administrados</div></div>
          <div className="kpi"><div className="kpi-value">{counts.pending}</div><div className="kpi-label">Pendentes</div></div>
        </div>
      </section>

      <div className="section-title">Itens do turno</div>
      <div className="stack">
        {initialShift.items.length === 0 ? (
          <div className="card empty">Nenhum medicamento cadastrado para este turno.</div>
        ) : (
          initialShift.items.map((item) => (
            <article className="card med-card" key={item.id}>
              <div className="row">
                <div className="med-time">{item.scheduled_time ? item.scheduled_time.slice(0, 5) : item.schedule_label || "Durante o turno"}</div>
                {item.status === "administered" ? (
                  <span className="badge badge-success"><CheckCircle2 size={14} /> Administrado</span>
                ) : item.status === "not_administered" ? (
                  <span className="badge badge-danger"><CircleAlert size={14} /> Não administrado</span>
                ) : (
                  <span className="badge badge-pending">Pendente</span>
                )}
              </div>
              <div>
                <div className="med-name">{item.name}</div>
                <div className="med-meta">
                  <strong>{item.dose}</strong><br />
                  {item.instructions ? <>{item.instructions}<br /></> : null}
                  Via: {item.route}
                </div>
              </div>

              {item.status !== "pending" ? (
                <div className="med-admin-row small">
                  {item.status === "administered" && item.administered_at ? `Registrado às ${fmtTime(item.administered_at)}.` : "Registrado como não administrado."}
                  {item.notes ? ` Observação: ${item.notes}` : ""}
                </div>
              ) : null}

              {!locked ? (
                item.status === "pending" ? (
                  <div className="actions">
                    <button className="button" disabled={busy === item.id} onClick={() => updateItem(item.id, "administered")}>Administrado</button>
                    <button className="button button-danger" disabled={busy === item.id} onClick={() => updateItem(item.id, "not_administered")}>Não administrado</button>
                  </div>
                ) : (
                  <button className="button button-outline" disabled={busy === item.id} onClick={() => updateItem(item.id, "pending")}>Corrigir registro</button>
                )
              ) : null}
            </article>
          ))
        )}
      </div>

      {!locked ? (
        <section className="card stack" style={{ marginTop: 16 }}>
          <label className="label">
            Observações do turno
            <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
          </label>
          {error ? <div className="error">{error}</div> : null}
          <button className="button button-secondary" disabled={busy === "finish"} onClick={finishShift}>
            {busy === "finish" ? "Finalizando..." : "Finalizar turno"}
          </button>
        </section>
      ) : null}
    </>
  );
}
