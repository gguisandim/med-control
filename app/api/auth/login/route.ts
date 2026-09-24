import { NextResponse } from "next/server";
import { createSession, verifyPassword } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const password = String(body?.password || "");

    if (!password || !verifyPassword(password)) {
      return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
    }

    await createSession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao autenticar." }, { status: 500 });
  }
}
