import { redirect } from "next/navigation";
import { hasSession } from "@/lib/session";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage() {
  if (await hasSession()) redirect("/");

  return (
    <main className="login-wrap">
      <section className="card login-card stack">
        <div>
          <h1 className="h1">Controle de medicamentos</h1>
          <p className="subtle">Acesso restrito à família e aos cuidadores.</p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
