import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import MedicationSettings from "@/components/MedicationSettings";
import { getMedications } from "@/lib/data";
import { hasSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  if (!(await hasSession())) redirect("/login");
  const meds = await getMedications();

  return (
    <AppShell>
      <div className="stack">
        <div>
          <h1 className="h1">Medicamentos</h1>
          <p className="subtle">Cadastre horários e suspenda itens sem apagar o histórico.</p>
        </div>
        <div className="alert alert-warn">
          Esta tela apenas registra a orientação recebida. Alterações de dose, horário, via ou suspensão devem seguir orientação do profissional de saúde responsável.
        </div>
        <MedicationSettings initialMedications={meds} />
      </div>
    </AppShell>
  );
}
