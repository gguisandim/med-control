import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getRecentShifts } from "@/lib/data";
import { hasSession } from "@/lib/session";
import { formatDateTime, formatShiftDate, shiftLabel } from "@/lib/shift-time";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  if (!(await hasSession())) redirect("/login");
  const shifts = await getRecentShifts(40);

  return (
    <AppShell>
      <div className="stack">
        <div>
          <h1 className="h1">Histórico</h1>
          <p className="subtle">Turnos anteriores e seus registros.</p>
        </div>

        {shifts.length === 0 ? <div className="card empty">Ainda não existem turnos registrados.</div> : null}

        {shifts.map((shift) => {
          const done = shift.items.filter((i) => i.status === "administered").length;
          const no = shift.items.filter((i) => i.status === "not_administered").length;
          const pending = shift.items.filter((i) => i.status === "pending").length;

          return (
            <details className="card history-row" key={shift.id}>
              <summary style={{ cursor: "pointer" }}>
                <div className="row" style={{ display: "inline-flex", width: "calc(100% - 20px)", marginLeft: 8 }}>
                  <div>
                    <strong>{formatShiftDate(shift.shift_date)} — {shiftLabel(shift.shift_type)}</strong>
                    <div className="small">{shift.caregiver_name}</div>
                  </div>
                  <span className={`badge ${pending ? "badge-pending" : no ? "badge-danger" : "badge-success"}`}>
                    {done}/{shift.items.length} administrados
                  </span>
                </div>
              </summary>

              <div className="details stack">
                {shift.items.map((item) => (
                  <div className="row" key={item.id}>
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
                {shift.notes ? <div className="alert alert-info"><strong>Observações do turno:</strong> {shift.notes}</div> : null}
                <div className="small">Iniciado em {formatDateTime(shift.started_at)} · {shift.finished_at ? `Finalizado em ${formatDateTime(shift.finished_at)}` : "Ainda não finalizado"}</div>
              </div>
            </details>
          );
        })}
      </div>
    </AppShell>
  );
}
