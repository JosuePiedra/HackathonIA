"use client";

import { ArrowRight, Pencil } from "lucide-react";
import {
  SUGGESTED_QUESTIONS,
  COMPLEX_QUESTIONS_EXAMPLES,
  PREFILL_QUESTION,
} from "@/lib/constants";

interface Props {
  onSelect: (question: string) => void;
  onPrefill: (text: string) => void;
}

export function SuggestedQuestions({ onSelect, onPrefill }: Props) {
  return (
    <>
      <h3
        style={{
          fontFamily: "var(--font-dm-mono)",
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--text-tertiary)",
          marginBottom: 10,
        }}
      >
        Consultas frecuentes
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {SUGGESTED_QUESTIONS.map((q) => (
          <button key={q} className="suggestion-chip" onClick={() => onSelect(q)}>
            <span>{q}</span>
            <ArrowRight className="arrow" style={{ width: 12, height: 12 }} />
          </button>
        ))}
        <button
          className="suggestion-chip"
          onClick={() => onPrefill(PREFILL_QUESTION.text)}
          title="Escribe el prefijo y completá el ID del siniestro"
        >
          <span>{PREFILL_QUESTION.label}</span>
          <Pencil className="arrow" style={{ width: 12, height: 12 }} />
        </button>
      </div>

      <h4
        style={{
          fontFamily: "var(--font-dm-mono)",
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--text-tertiary)",
          marginTop: 22,
          marginBottom: 10,
        }}
      >
        Ejemplos de consultas complejas
      </h4>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {COMPLEX_QUESTIONS_EXAMPLES.map((q) => (
          <button
            key={q}
            className="suggestion-chip complex"
            onClick={() => onSelect(q)}
          >
            <span>{q}</span>
            <ArrowRight className="arrow" style={{ width: 12, height: 12, color: "var(--purple)" }} />
          </button>
        ))}
      </div>
    </>
  );
}
