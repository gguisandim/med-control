"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, Trash2 } from "lucide-react";

export default function DemoDataControls() {
  const router = useRouter();
  const [busy, setBusy] = useState<"add" | "remove" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function addDemo() {
    setBusy("add");
    setMessage("");
    setError("");
    const res = await fetch("/api/demo", { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(body.error || "Não foi possível criar os dados fictícios.");
      return;
    }
    setMessage(body.message || `${body.created || 0} turnos fictícios foram adicionados.`);
    router.refresh();
  }

  async function removeDemo() {
    if (!window.confirm("Remover todos os turnos marcados como DEMO? Os registros reais não serão apagados.")) return;
    setBusy("remove");
    setMessage("");
    setError("");
    const res = await fetch("/api/demo", { method: "DELETE" });
    const body = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(body.error || "Não foi possível remover os dados fictícios.");
      return;
    }
    setMessage("Dados de demonstração removidos.");
    router.refresh();
  }

  return (
    <section className="card stack">
      <div>
        <h2 className="h2">Dados de demonstração</h2>
        <p className="subtle">Cria turnos fictícios para testar o Histórico e o Resumo. Eles aparecem identificados com <strong>DEMO</strong> e podem ser removidos depois.</p>
      </div>
      <div className="actions">
        <button className="button button-secondary" disabled={busy !== null} onClick={addDemo}>
          <FlaskConical size={17} /> {busy === "add" ? "Criando..." : "Adicionar dados fake"}
        </button>
        <button className="button button-outline" disabled={busy !== null} onClick={removeDemo}>
          <Trash2 size={17} /> {busy === "remove" ? "Removendo..." : "Remover dados fake"}
        </button>
      </div>
      {message ? <div className="alert alert-info">{message}</div> : null}
      {error ? <div className="error">{error}</div> : null}
    </section>
  );
}
