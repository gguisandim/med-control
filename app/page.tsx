import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import TodayClient from "@/components/TodayClient";
import { getCurrentShiftRecord } from "@/lib/data";
import { hasSession } from "@/lib/session";
import { formatShiftDate, getCurrentShift, shiftLabel } from "@/lib/shift-time";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!(await hasSession())) redirect("/login");

  const current = getCurrentShift();
  const shift = await getCurrentShiftRecord();

  return (
    <AppShell>
      <div className="stack">
        <div className="row">
          <div>
            <h1 className="h1">Turno atual</h1>
            <div className="subtle">{formatShiftDate(current.shiftDate)}</div>
          </div>
          <span className={`badge ${current.shiftType === "day" ? "badge-day" : "badge-night"}`}>
            {shiftLabel(current.shiftType)}
          </span>
        </div>

        <div className="alert alert-info">
          O aplicativo troca automaticamente de turno às 07:30 e às 19:30. Quando o turno muda, um novo registro é iniciado; tudo o que já foi salvo permanece disponível no Histórico.
        </div>

        <TodayClient current={current} initialShift={shift} />
      </div>
    </AppShell>
  );
}
