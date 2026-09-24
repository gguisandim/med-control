import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getRecentShifts } from "@/lib/data";
import { hasSession } from "@/lib/session";
import { formatShiftDate, shiftLabel } from "@/lib/shift-time";

export const dynamic = "force-dynamic";

export default async function SummaryPage() {
  if (!(await hasSession())) redirect("/login");
  const shifts = await getRecentShifts(14);
  const items = shifts.flatMap((s) => s.items);
  const administered = items.filter((i) => i.status === "administered").length;
  const notAdministered = items.filter((i) => i.status === "not_administered").length;
  const pending = items.filter((i) => i.status === "pending").length;
  const completed = administered + notAdministered;
  const adherence = completed ? Math.round((administered / completed) * 1000) / 10 : 0;

  const exceptions = shifts.flatMap((shift) =>
    shift.items
      .filter((i) => i.status !== "administered")
      .map((item) => ({ shift, item })),
  ).slice(0, 12);

  return (
    <AppShell>
      <div className="stack">
        <div>
          <h1 className="h1">Resumo</h1>
          <p className="subtle">Visão simples dos últimos 14 turnos registrados.</p>
        </div>

        <div className="kpis">
          <div className="kpi"><div className="kpi-value">{administered}</div><div className="kpi-label">Administrados</div></div>
          <div className="kpi"><div className="kpi-value">{notAdministered}</div><div className="kpi-label">Não administrados</div></div>
          <div className="kpi"><div className="kpi-value">{adherence}%</div><div className="kpi-label">Dos itens concluídos foram administrados</div></div>
        </div>

        {pending ? <div className="alert alert-warn">Há {pending} registro(s) ainda pendente(s) nos turnos consultados.</div> : null}

        <div className="section-title">Pendências e não administrações recentes</div>
        <div className="stack">
          {exceptions.length === 0 ? <div className="card empty">Nenhuma pendência ou não administração recente.</div> : null}
          {exceptions.map(({ shift, item }) => (
            <div className="card row" key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <div className="small">{formatShiftDate(shift.shift_date)} · {shiftLabel(shift.shift_type)} · {shift.caregiver_name}</div>
                {item.notes ? <div className="small">{item.notes}</div> : null}
              </div>
              <span className={`badge ${item.status === "not_administered" ? "badge-danger" : "badge-pending"}`}>
                {item.status === "not_administered" ? "Não administrado" : "Pendente"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
