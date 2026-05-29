import { NextResponse } from "next/server";
import {
  selectByType,
  claimsToCSV,
  claimsToHTML,
  type ExportType,
} from "@/lib/exportUtils";
import type { SiniestroCompleto } from "@/lib/types";

interface ExportBody {
  type: ExportType;
  claims: SiniestroCompleto[];
}

const FILE_NAMES: Record<ExportType, string> = {
  red: "casos_rojos.csv",
  top10: "top10_riesgo.csv",
  executive: "reporte_ejecutivo.html",
};

export async function POST(req: Request) {
  let body: ExportBody;
  try {
    body = (await req.json()) as ExportBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { type, claims } = body;
  if (!type || !Array.isArray(claims)) {
    return NextResponse.json(
      { error: "Se requiere { type, claims }." },
      { status: 400 },
    );
  }
  if (type !== "red" && type !== "top10" && type !== "executive") {
    return NextResponse.json({ error: "type inválido." }, { status: 400 });
  }

  const selected = selectByType(claims, type);
  const isHtml = type === "executive";
  const content = isHtml ? claimsToHTML(selected) : claimsToCSV(selected);

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": isHtml
        ? "text/html; charset=utf-8"
        : "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${FILE_NAMES[type]}"`,
    },
  });
}
