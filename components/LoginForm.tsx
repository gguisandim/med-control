"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Não foi possível entrar.");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <form className="stack" onSubmit={submit}>
      <label className="label">
        Senha
        <input
          className="input"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Digite a senha da família"
          required
          autoFocus
        />
      </label>
      {error ? <div className="error">{error}</div> : null}
      <button className="button" disabled={loading} type="submit">
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
