import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import HistoryClient from "@/components/HistoryClient";
import { getRecentShifts } from "@/lib/data";
import { hasSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  if (!(await hasSession())) redirect("/login");
  const shifts = await getRecentShifts(40);

  return (
    <AppShell>
      <div className="stack">
        <div>
          <h1 className="h1">Histórico</h1>
          <p className="subtle">Consulte e corrija registros de turnos anteriores sem alterar o cadastro atual dos medicamentos.</p>
        </div>
        <HistoryClient shifts={shifts} />
      </div>
    </AppShell>
  );
}
