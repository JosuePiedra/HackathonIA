"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Zap, Code, MessageSquare, RotateCcw } from "lucide-react";
import type { AgentMessage } from "@/lib/types";

// Caché en memoria: el historial sobrevive la navegación (se pierde al recargar).
let CHAT_CACHE: AgentMessage[] = [];

function stageLabel(s: number): string {
  if (s < 1.2) return "Procesando solicitud…";
  if (s < 3.5) return "Analizando los datos…";
  if (s < 7) return "Generando respuesta…";
  return "Casi listo…";
}

interface Props {
  /** Señal externa para enviar una pregunta (desde ?siniestro o chips sugeridos). */
  external?: { question: string; nonce: number } | null;
  /** Señal para escribir texto en el input SIN enviar (chip de prefijo). */
  prefill?: { text: string; nonce: number } | null;
}

export function ChatInterface({ external, prefill }: Props) {
  const [messages, setMessages] = useState<AgentMessage[]>(() => CHAT_CACHE);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastNonce = useRef<number>(-1);
  const lastPrefillNonce = useRef<number>(-1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Persistimos el historial en la caché de módulo.
  useEffect(() => {
    CHAT_CACHE = messages;
  }, [messages]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const send = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || isLoading) return;

    const history = messages.map((m) => ({
      role: m.role,
      content: m.content,
      detalle: m.detalle,
    }));

    setMessages((m) => [...m, { role: "user", content: q, timestamp: new Date() }]);
    setInput("");
    setIsLoading(true);

    const start = Date.now();
    setElapsed(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setElapsed((Date.now() - start) / 1000), 150);

    const finishTimer = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      return (Date.now() - start) / 1000;
    };

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, history }),
      });
      const data = (await res.json()) as {
        answer?: string;
        error?: string;
        debug?: { mode?: AgentMessage["modo"]; detail?: string };
      };
      const tiempo = finishTimer();
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: data.answer ?? data.error ?? "No obtuve respuesta del agente.",
          timestamp: new Date(),
          modo: data.debug?.mode,
          detalle: data.debug?.detail,
          tiempo,
        },
      ]);
    } catch {
      const tiempo = finishTimer();
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "No pude contactar al agente. Verificá la conexión y la API key.",
          timestamp: new Date(),
          tiempo,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (external && external.nonce !== lastNonce.current) {
      lastNonce.current = external.nonce;
      void send(external.question);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [external]);

  useEffect(() => {
    if (prefill && prefill.nonce !== lastPrefillNonce.current) {
      lastPrefillNonce.current = prefill.nonce;
      setInput(prefill.text);
      inputRef.current?.focus();
    }
  }, [prefill]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading, elapsed]);

  const newConversation = () => {
    setMessages([]);
    CHAT_CACHE = [];
  };

  return (
    <div className="chat-main">
      <div className="chat-scroll" ref={scrollRef}>
        {messages.length === 0 && !isLoading ? (
          <div className="chat-empty">
            <MessageSquare size={36} style={{ color: "var(--text-tertiary)" }} />
            <h3 style={{ fontFamily: "var(--font-syne)", fontSize: 18, marginTop: 10 }}>
              ¿En qué puedo ayudarte?
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>
              Preguntá sobre siniestros, scores, proveedores o patrones detectados.
            </p>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`bubble-wrap ${m.role === "user" ? "user" : ""}`}>
              {m.role === "user" ? (
                <div className="bubble user">{m.content}</div>
              ) : (
                <>
                  <div className="bubble">
                    <div className="header">
                      <span>SENTINEL</span>
                      <span className="time">
                        {m.timestamp.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div style={{ whiteSpace: "pre-line" }}>{m.content}</div>
                  </div>
                  {m.modo ? (
                    <div className="meta" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      {m.modo === "conversacional" ? (
                        <>
                          <MessageSquare size={11} /> Conversación
                        </>
                      ) : m.modo === "catalogo" ? (
                        <>
                          <Zap size={11} /> Consulta especializada
                        </>
                      ) : (
                        <>
                          <Code size={11} /> SQL generado dinámicamente
                        </>
                      )}
                      {typeof m.tiempo === "number" ? (
                        <span style={{ color: "var(--text-tertiary)" }}>· {m.tiempo.toFixed(1)}s</span>
                      ) : null}
                      {m.detalle ? (
                        <span
                          style={{
                            fontFamily: "var(--font-dm-mono)",
                            fontSize: 10,
                            color: "var(--text-tertiary)",
                            maxWidth: 320,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={m.detalle}
                        >
                          · {m.detalle}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ))
        )}
        {isLoading ? (
          <div className="bubble-wrap">
            <div className="bubble">
              <div className="header">
                <span>SENTINEL</span>
                <span className="time">{elapsed.toFixed(1)}s</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="thinking-dots">
                  <span />
                  <span />
                  <span />
                </div>
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {stageLabel(elapsed)}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="chat-input-area">
        <div className="chat-input-row">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribí tu pregunta sobre los siniestros..."
            onKeyDown={(e) => {
              if (e.key === "Enter") void send();
            }}
          />
          <button
            className={`chat-send ${input.trim() ? "active" : ""}`}
            onClick={() => void send()}
            aria-label="Enviar"
          >
            <Send size={14} />
          </button>
        </div>
        <div
          className="chat-disclaimer"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <span>Las respuestas son orientativas. Toda decisión la toma un analista humano.</span>
          {messages.length > 0 ? (
            <button
              onClick={newConversation}
              style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-tertiary)", fontSize: 11 }}
            >
              <RotateCcw size={11} /> Nueva conversación
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
