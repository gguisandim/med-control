"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleAlert, Clock3, Moon, NotebookPen, Pencil, Save, Sun, X } from "lucide-react";
import type { ItemStatus, ShiftType, ShiftWithItems } from "@/lib/types";

type RegisterMode = "administered" | "not_administered";

function fmtTime(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Belem",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}


function diaryEntries(value: string | null) {
  if (!value?.trim()) return [];
  return value.split(/\n\n---\n\n/g).map((entry) => entry.trim()).filter(Boolean);
}

function nowInBelem() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Belem",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: "hour" | "minute") => parts.find((p) => p.type === type)?.value || "00";
  return `${get("hour")}:${get("minute")}`;
}

function addDays(date: string, amount: number) {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  value.setUTCDate(value.getUTCDate() + amount);
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
}

function clientCurrentShift() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Belem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || "";
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  const minutes = Number(get("hour")) * 60 + Number(get("minute"));

  if (minutes >= 19 * 60 + 30) return { shiftType: "night" as ShiftType, shiftDate: date };
  if (minutes < 7 * 60 + 30) return { shiftType: "night" as ShiftType, shiftDate: addDays(date, -1) };
  return { shiftType: "day" as ShiftType, shiftDate: date };
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
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [registerMode, setRegisterMode] = useState<Record<string, RegisterMode | null>>({});
  const [administrationTimes, setAdministrationTimes] = useState<Record<string, string>>({});
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [editingCaregiver, setEditingCaregiver] = useState(false);
  const [caregiverDraft, setCaregiverDraft] = useState(initialShift?.caregiver_name || "");
  const [diaryDraft, setDiaryDraft] = useState("");

  const counts = useMemo(() => {
    const items = initialShift?.items || [];
    return {
      total: items.length,
      administered: items.filter((x) => x.status === "administered").length,
      notAdministered: items.filter((x) => x.status === "not_administered").length,
      pending: items.filter((x) => x.status === "pending").length,
    };
  }, [initialShift]);

  useEffect(() => {
    const expectedKey = `${current.shiftDate}:${current.shiftType}`;
    const checkShift = () => {
      const actual = clientCurrentShift();
      if (`${actual.shiftDate}:${actual.shiftType}` !== expectedKey) router.refresh();
    };
    const timer = window.setInterval(checkShift, 30_000);
    return () => window.clearInterval(timer);
  }, [current.shiftDate, current.shiftType, router]);

  async function startShift(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy("start");
    setError("");
    setSuccess("");
    const res = await fetch("/api/shifts/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caregiverName: name.trim() }),
    });
    setBusy(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Não foi possível criar o registro deste turno.");
      return;
    }
    router.refresh();
  }

  function openRegister(itemId: string, mode: RegisterMode, currentStatus: ItemStatus, currentTime: string | null, notes: string | null) {
    setError("");
    setSuccess("");
    setRegisterMode((old) => ({ ...old, [itemId]: mode }));
    setItemNotes((old) => ({ ...old, [itemId]: notes || "" }));
    if (mode === "administered") {
      setAdministrationTimes((old) => ({
        ...old,
        [itemId]: currentStatus === "administered" && currentTime ? fmtTime(currentTime) : old[itemId] || nowInBelem(),
      }));
    }
  }

  function closeRegister(itemId: string) {
    setRegisterMode((old) => ({ ...old, [itemId]: null }));
  }

  async function updateItem(id: string, status: ItemStatus) {
    const administeredTime = status === "administered" ? administrationTimes[id] : undefined;
    if (status === "administered" && !administeredTime) {
      setError("Informe o horário em que o medicamento foi administrado antes de salvar.");
      return;
    }

    if (status === "pending" && !window.confirm("Limpar este registro e voltar o medicamento para pendente?")) return;

    setBusy(id);
    setError("");
    setSuccess("");
    const res = await fetch("/api/administrations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        status,
        notes: status === "pending" ? null : itemNotes[id] || "",
        administeredTime,
      }),
    });
    setBusy(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Não foi possível salvar o registro.");
      return;
    }

    setRegisterMode((old) => ({ ...old, [id]: null }));
    setSuccess(status === "pending" ? "Registro limpo. O item voltou para pendente." : "Registro salvo no banco. Você já pode fechar o aplicativo.");
    router.refresh();
  }

  async function saveDiaryEntry() {
    if (!initialShift || !diaryDraft.trim()) {
      setError("Escreva uma anotação antes de salvar.");
      return;
    }

    setBusy("diary");
    setError("");
    setSuccess("");
    const res = await fetch("/api/shifts/current", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: initialShift.id, diaryEntry: diaryDraft.trim() }),
    });
    setBusy(null);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Não foi possível salvar a anotação.");
      return;
    }

    setDiaryDraft("");
    setSuccess("Anotação salva no diário do turno.");
    router.refresh();
  }

  async function saveCaregiver() {
    if (!initialShift || caregiverDraft.trim().length < 2) {
      setError("Informe o nome do responsável.");
      return;
    }
    setBusy("caregiver");
    setError("");
    setSuccess("");
    const res = await fetch("/api/shifts/current", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: initialShift.id, caregiverName: caregiverDraft.trim() }),
    });
    setBusy(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Não foi possível alterar o responsável.");
      return;
    }
    setEditingCaregiver(false);
    setSuccess("Responsável atualizado.");
    router.refresh();
  }

  if (!initialShift) {
    return (
      <section className="card stack">
        <div className="row">
          <div>
            <h2 className="h2">Responsável deste turno</h2>
            <p className="subtle">Isso só é solicitado na primeira abertura do turno. Depois, o nome fica salvo.</p>
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
            {busy === "start" ? "Salvando..." : "Começar registros do turno"}
          </button>
        </form>
      </section>
    );
  }

  return (
    <>
      <section className="card stack">
        <div className="row caregiver-row">
          <div className="caregiver-main">
            <div className="small">Responsável pelo turno</div>
            {editingCaregiver ? (
              <div className="inline-edit-caregiver">
                <input className="input" value={caregiverDraft} onChange={(e) => setCaregiverDraft(e.target.value)} autoFocus />
                <button className="icon-button icon-button-primary" aria-label="Salvar responsável" disabled={busy === "caregiver"} onClick={saveCaregiver}><Save size={18} /></button>
                <button className="icon-button" aria-label="Cancelar edição" disabled={busy === "caregiver"} onClick={() => { setCaregiverDraft(initialShift.caregiver_name); setEditingCaregiver(false); }}><X size={18} /></button>
              </div>
            ) : (
              <div className="responsible-display">
                <div className="h2">{initialShift.caregiver_name}</div>
                <button className="icon-button" aria-label="Editar responsável" onClick={() => setEditingCaregiver(true)}><Pencil size={17} /></button>
              </div>
            )}
          </div>
          <span className="badge badge-success">Registro ativo</span>
        </div>

        <div className="kpis">
          <div className="kpi"><div className="kpi-value">{counts.administered}</div><div className="kpi-label">Administrados</div></div>
          <div className="kpi"><div className="kpi-value">{counts.notAdministered}</div><div className="kpi-label">Não administrados</div></div>
          <div className="kpi"><div className="kpi-value">{counts.pending}</div><div className="kpi-label">Pendentes</div></div>
        </div>
      </section>

      <div className="alert alert-info save-info">
        Cada medicamento é salvo separadamente. Depois de tocar em <strong>Salvar registro</strong>, você pode fechar o aplicativo e voltar mais tarde; o que já foi registrado continuará salvo.
      </div>

      {success ? <div className="alert alert-success">{success}</div> : null}
      {error ? <div className="error card">{error}</div> : null}

      <section className="card stack diary-card">
        <div>
          <div className="row">
            <div>
              <h2 className="h2">Diário / observações do turno</h2>
              <p className="subtle">Use este espaço para registrar acontecimentos gerais, cuidados, intercorrências ou qualquer informação que a família precise deixar para o próximo responsável.</p>
            </div>
            <NotebookPen size={24} />
          </div>
        </div>

        {diaryEntries(initialShift.notes).length ? (
          <div className="diary-list">
            {diaryEntries(initialShift.notes).map((entry, index) => (
              <div className="diary-entry" key={`${index}-${entry.slice(0, 20)}`}>
                {entry}
              </div>
            ))}
          </div>
        ) : (
          <div className="small">Ainda não há anotações gerais neste turno.</div>
        )}

        <label className="label">
          Nova anotação
          <textarea
            className="textarea diary-textarea"
            value={diaryDraft}
            onChange={(e) => setDiaryDraft(e.target.value)}
            maxLength={1500}
            placeholder="Ex.: paciente descansou bem; recebeu visita; apresentou desconforto; orientação deixada para o próximo turno..."
          />
        </label>
        <button className="button" disabled={busy === "diary" || !diaryDraft.trim()} onClick={saveDiaryEntry}>
          <Save size={17} /> {busy === "diary" ? "Salvando..." : "Salvar anotação"}
        </button>
        <div className="small">Cada anotação é salva imediatamente com data, hora e o nome do responsável do turno. Você pode fechar o aplicativo depois de salvar.</div>
      </section>

      <div className="section-title">Medicamentos deste turno</div>
      <div className="stack">
        {initialShift.items.length === 0 ? (
          <div className="card empty">Nenhum medicamento cadastrado para este turno.</div>
        ) : (
          initialShift.items.map((item) => {
            const mode = registerMode[item.id] || null;
            return (
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

                {item.status !== "pending" && !mode ? (
                  <div className="saved-record-box">
                    <div className="small">
                      {item.status === "administered" && item.administered_at
                        ? `Administrado às ${fmtTime(item.administered_at)}.`
                        : "Registrado como não administrado."}
                      {item.notes ? ` Observação: ${item.notes}` : ""}
                    </div>
                    <button
                      className="button button-outline button-small"
                      onClick={() => openRegister(item.id, item.status === "administered" ? "administered" : "not_administered", item.status, item.administered_at, item.notes)}
                    >
                      <Pencil size={16} /> Editar registro
                    </button>
                  </div>
                ) : null}

                {!mode && item.status === "pending" ? (
                  <div className="actions">
                    <button className="button" onClick={() => openRegister(item.id, "administered", item.status, item.administered_at, item.notes)}>
                      <CheckCircle2 size={17} /> Administrado
                    </button>
                    <button className="button button-danger" onClick={() => openRegister(item.id, "not_administered", item.status, item.administered_at, item.notes)}>
                      <CircleAlert size={17} /> Não administrado
                    </button>
                  </div>
                ) : null}

                {mode === "administered" ? (
                  <div className="register-panel stack">
                    <div className="time-register">
                      <label className="label time-field">
                        Horário em que foi administrado
                        <input
                          className="input"
                          type="time"
                          value={administrationTimes[item.id] || ""}
                          onChange={(e) => setAdministrationTimes((old) => ({ ...old, [item.id]: e.target.value }))}
                        />
                      </label>
                      <button type="button" className="button button-outline now-button" onClick={() => setAdministrationTimes((old) => ({ ...old, [item.id]: nowInBelem() }))}>
                        <Clock3 size={16} /> Agora
                      </button>
                    </div>
                    <label className="label">
                      Observação (opcional)
                      <input className="input" value={itemNotes[item.id] || ""} onChange={(e) => setItemNotes((old) => ({ ...old, [item.id]: e.target.value }))} placeholder="Ex.: administrado normalmente" />
                    </label>
                    <div className="actions">
                      <button className="button" disabled={busy === item.id} onClick={() => updateItem(item.id, "administered")}>
                        <Save size={17} /> {busy === item.id ? "Salvando..." : "Salvar registro"}
                      </button>
                      <button className="button button-outline" disabled={busy === item.id} onClick={() => closeRegister(item.id)}>Cancelar</button>
                    </div>
                    {item.status !== "pending" ? (
                      <div className="secondary-record-actions">
                        <button className="text-link-button" disabled={busy === item.id} onClick={() => openRegister(item.id, "not_administered", item.status, item.administered_at, item.notes)}>Alterar para não administrado</button>
                        <button className="text-danger-button" disabled={busy === item.id} onClick={() => updateItem(item.id, "pending")}>Limpar este registro e voltar para pendente</button>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {mode === "not_administered" ? (
                  <div className="register-panel stack">
                    <label className="label">
                      Motivo / observação (opcional)
                      <textarea className="textarea" value={itemNotes[item.id] || ""} onChange={(e) => setItemNotes((old) => ({ ...old, [item.id]: e.target.value }))} placeholder="Ex.: não administrado conforme orientação recebida" />
                    </label>
                    <div className="actions">
                      <button className="button button-danger" disabled={busy === item.id} onClick={() => updateItem(item.id, "not_administered")}>
                        <Save size={17} /> {busy === item.id ? "Salvando..." : "Salvar registro"}
                      </button>
                      <button className="button button-outline" disabled={busy === item.id} onClick={() => closeRegister(item.id)}>Cancelar</button>
                    </div>
                    {item.status !== "pending" ? (
                      <div className="secondary-record-actions">
                        <button className="text-link-button" disabled={busy === item.id} onClick={() => openRegister(item.id, "administered", item.status, item.administered_at, item.notes)}>Alterar para administrado</button>
                        <button className="text-danger-button" disabled={busy === item.id} onClick={() => updateItem(item.id, "pending")}>Limpar este registro e voltar para pendente</button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </>
  );
}
