import { redirect } from "next/navigation";
import { hasSession } from "@/lib/session";
import AppShell from "./AppShell";

export default async function ProtectedPage({ children }: { children: React.ReactNode }) {
  if (!(await hasSession())) redirect("/login");
  return <AppShell>{children}</AppShell>;
}
