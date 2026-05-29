import { NextResponse } from "next/server";
import { LLM_PROVIDER } from "@/lib/llm";
import { routeAndAnswer, type ChatTurn } from "@/lib/ai/router";

function keyMissing(): string | null {
  if (LLM_PROVIDER === "gemini" && !process.env.GEMINI_API_KEY)
    return "GEMINI_API_KEY no configurada en el servidor.";
  if (LLM_PROVIDER === "anthropic" && !process.env.ANTHROPIC_API_KEY)
    return "ANTHROPIC_API_KEY no configurada en el servidor.";
  return null;
}

export async function POST(req: Request) {
  const missing = keyMissing();
  if (missing) return NextResponse.json({ error: missing }, { status: 500 });

  let question = "";
  let history: ChatTurn[] = [];
  try {
    const body = (await req.json()) as { question?: string; history?: ChatTurn[] };
    question = (body.question ?? "").trim();
    history = Array.isArray(body.history) ? body.history : [];
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  if (!question) {
    return NextResponse.json({ error: "Falta la pregunta." }, { status: 400 });
  }

  try {
    const result = await routeAndAnswer(question, history);
    return NextResponse.json({
      answer: result.answer,
      debug: { mode: result.mode, detail: result.detail },
    });
  } catch (e) {
    // Manejo enterprise: nunca rompemos la UI; respondemos con un mensaje controlado.
    console.error("/api/chat:", e instanceof Error ? e.message : e);
    return NextResponse.json({
      answer:
        "Tuve un problema procesando tu consulta. Intentá de nuevo en un momento o reformulá la pregunta.",
      debug: { mode: "conversacional", detail: "" },
    });
  }
}
