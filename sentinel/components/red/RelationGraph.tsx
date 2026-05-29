"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { AlertTriangle } from "lucide-react";
import type { GraphData, GraphNode } from "@/lib/types";

type SimNode = GraphNode & d3.SimulationNodeDatum;
interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  nivel_riesgo?: string;
}

const W = 1400;
const H = 820;

// Color (var() vía .style() para seguir el tema activo).
const riskVar = (nivel?: string) =>
  nivel === "ROJO" ? "var(--risk-red)" : nivel === "AMARILLO" ? "var(--risk-yellow)" : "var(--risk-green)";

const provIsRed = (n: GraphNode) =>
  Boolean(n.en_lista_restrictiva) || (n.casos_rojos ?? 0) > 0;
const provColor = (n: GraphNode) => (provIsRed(n) ? "var(--risk-red)" : "var(--purple)");

const shortId = (id: string) => id.split("-").pop() ?? id;

interface Props {
  data: GraphData;
  onNodeClick?: (node: GraphNode) => void;
}

export function RelationGraph({ data, onNodeClick }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [isolate, setIsolate] = useState(false);
  const [tip, setTip] = useState<{ node: GraphNode; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    let nodes = data.nodes.map((n) => ({ ...n })) as SimNode[];
    let links = data.links.map((l) => ({ ...l })) as SimLink[];

    if (isolate) {
      const redIds = new Set(
        nodes.filter((n) => n.type === "siniestro" && n.nivel_riesgo === "ROJO").map((n) => n.id),
      );
      const keep = new Set<string>(redIds);
      for (const l of data.links) {
        if (redIds.has(l.source) || redIds.has(l.target)) {
          keep.add(l.source);
          keep.add(l.target);
        }
      }
      nodes = nodes.filter((n) => keep.has(n.id));
      links = links.filter((l) => keep.has(l.source as string) && keep.has(l.target as string));
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    const container = svg.append("g");

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 3])
      .on("zoom", (event) => container.attr("transform", event.transform.toString()));
    svg.call(zoom);
    // Zoom inicial para ver todo el grafo (los nodos son grandes).
    const k = 0.55;
    svg.call(zoom.transform, d3.zoomIdentity.translate((W * (1 - k)) / 2, (H * (1 - k)) / 2).scale(k));

    // ── Enlaces ──
    const link = container
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .style("stroke", (l) => (l.nivel_riesgo === "ROJO" ? "var(--risk-red)" : "var(--border)"))
      .style("stroke-width", (l) => (l.nivel_riesgo === "ROJO" ? 1.6 : 1.2))
      .style("stroke-dasharray", (l) => (l.nivel_riesgo === "ROJO" ? "5 4" : ""))
      .style("opacity", 0.7);

    // ── Nodos ──
    const node = container
      .append("g")
      .selectAll<SVGGElement, SimNode>("g")
      .data(nodes)
      .join("g")
      .style("cursor", "pointer")
      .on("click", (_e, d) => onNodeClick?.(d))
      .on("mouseover", (event, d) =>
        setTip({ node: d, x: event.offsetX, y: event.offsetY }),
      )
      .on("mousemove", (event, d) =>
        setTip({ node: d, x: event.offsetX, y: event.offsetY }),
      )
      .on("mouseout", () => setTip(null));

    node.each(function (d) {
      const g = d3.select(this);
      if (d.type === "asegurado") {
        g.append("circle")
          .attr("r", 28)
          .style("fill", "var(--primary)")
          .style("fill-opacity", 0.16)
          .style("stroke", "var(--primary)")
          .style("stroke-width", 1.6);
      } else if (d.type === "proveedor") {
        const color = provColor(d);
        g.append("polygon")
          .attr("points", "0,-40 -36,24 36,24")
          .style("fill", color)
          .style("fill-opacity", 0.16)
          .style("stroke", color)
          .style("stroke-width", provIsRed(d) ? 2 : 1.6);
      } else {
        const color = riskVar(d.nivel_riesgo);
        g.append("rect")
          .attr("x", -26)
          .attr("y", -26)
          .attr("width", 52)
          .attr("height", 52)
          .attr("rx", 6)
          .style("fill", color)
          .style("fill-opacity", 0.22)
          .style("stroke", color)
          .style("stroke-width", 1.6);
      }

      // Etiqueta dentro de la figura.
      g.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", d.type === "proveedor" ? 12 : 4)
        .style("font-family", "var(--font-dm-mono), monospace")
        .style("font-size", d.type === "siniestro" ? "13px" : "9px")
        .style("font-weight", "600")
        .style("fill", "var(--text-primary)")
        .style("pointer-events", "none")
        .text(d.type === "siniestro" ? shortId(d.id) : d.label);
    });

    const simulation = d3
      .forceSimulation<SimNode>(nodes)
      .force(
        "link",
        d3.forceLink<SimNode, SimLink>(links).id((d) => d.id).distance(170).strength(0.12),
      )
      .force("charge", d3.forceManyBody().strength(-650))
      .force("center", d3.forceCenter(W / 2, H / 2))
      .force("collide", d3.forceCollide(46));

    simulation.on("tick", () => {
      link
        .attr("x1", (l) => (l.source as SimNode).x ?? 0)
        .attr("y1", (l) => (l.source as SimNode).y ?? 0)
        .attr("x2", (l) => (l.target as SimNode).x ?? 0)
        .attr("y2", (l) => (l.target as SimNode).y ?? 0);
      node.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    // Cuando el layout inicial se asienta, quitamos las fuerzas globales para que
    // el grafo quede ESTÁTICO: nada se mueve salvo lo que el usuario arrastre.
    simulation.on("end", () => {
      simulation.force("charge", null);
      simulation.force("center", null);
    });

    const drag = d3
      .drag<SVGGElement, SimNode>()
      .clickDistance(6)
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.15).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        // Queda fijado donde se suelta (no vuelve a flotar).
        d.fx = d.x;
        d.fy = d.y;
      });
    node.call(drag);

    return () => {
      simulation.stop();
    };
  }, [data, isolate, onNodeClick]);

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-syne)", fontSize: 22, fontWeight: 600 }}>
            Red de relaciones
          </h2>
          <div style={{ fontFamily: "var(--font-dm-mono)", fontSize: 12, color: "var(--text-tertiary)" }}>
            {data.nodes.length} nodos · {data.links.length} aristas · arrastrá para reacomodar · scroll para zoom
          </div>
        </div>
        <button className={`btn ${isolate ? "btn-primary" : "btn-ghost"}`} onClick={() => setIsolate((v) => !v)}>
          <AlertTriangle size={14} /> {isolate ? "Vista completa" : "Aislar críticos"}
        </button>
      </div>

      <div
        style={{
          position: "relative",
          flex: 1,
          minHeight: 520,
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: "100%", height: "100%" }}
        />

        {tip ? <GraphTooltip node={tip.node} x={tip.x} y={tip.y} /> : null}

        <GraphLegend />
      </div>
    </div>
  );
}

const money = (n?: number) => "$" + (n ?? 0).toLocaleString("en-US");

function GraphTooltip({ node, x, y }: { node: GraphNode; x: number; y: number }) {
  const rows: [string, string][] = [];
  let title = "";
  let accent = "var(--primary)";

  if (node.type === "siniestro") {
    title = `Siniestro ${node.id}`;
    accent = riskVar(node.nivel_riesgo);
    rows.push(
      ["Nivel", node.nivel_riesgo ?? "—"],
      ["Score final", `${Math.round(node.score ?? 0)}/100`],
      ["Prob. ML", `${Math.round((node.probabilidad_ml ?? 0) * 100)}%`],
      ["Ramo", node.ramo ?? "—"],
      ["Ciudad", node.ciudad ?? "—"],
      ["Monto", money(node.monto)],
    );
  } else if (node.type === "proveedor") {
    title = `Proveedor ${node.id}`;
    accent = provColor(node);
    rows.push(
      ["Casos", String(node.casos ?? 0)],
      ["Casos rojos", String(node.casos_rojos ?? 0)],
      ["Lista restrictiva", node.en_lista_restrictiva ? "Sí" : "No"],
    );
  } else {
    title = `Asegurado ${node.id}`;
    rows.push(
      ["Siniestros", String(node.casos ?? 0)],
      ["En rojo", String(node.casos_rojos ?? 0)],
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        left: Math.min(x + 14, W),
        top: y + 14,
        transform: x > 700 ? "translateX(-100%)" : undefined,
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderLeft: `3px solid ${accent}`,
        borderRadius: 8,
        padding: "10px 12px",
        minWidth: 200,
        boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
        pointerEvents: "none",
        zIndex: 30,
      }}
    >
      <div style={{ fontFamily: "var(--font-dm-mono)", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
        {title}
      </div>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 12, padding: "1px 0" }}>
          <span style={{ color: "var(--text-tertiary)" }}>{k}</span>
          <span style={{ color: "var(--text-primary)", fontFamily: "var(--font-dm-mono)" }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

function GraphLegend() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 14,
        left: 14,
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "12px 14px",
        fontSize: 11.5,
        color: "var(--text-secondary)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        maxWidth: 280,
      }}
    >
      <div style={{ fontFamily: "var(--font-dm-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)" }}>
        Leyenda
      </div>
      <Row>
        <svg width="16" height="16"><circle cx="8" cy="8" r="7" style={{ fill: "var(--primary)", fillOpacity: 0.3, stroke: "var(--primary)" }} /></svg>
        Asegurado
      </Row>
      <Row>
        <svg width="16" height="16"><polygon points="8,1 1,15 15,15" style={{ fill: "var(--purple)", fillOpacity: 0.3, stroke: "var(--purple)" }} /></svg>
        Proveedor — <span style={{ color: "var(--risk-red)" }}>rojo</span> lista restrictiva o casos rojos
      </Row>
      <Row>
        <svg width="16" height="16"><rect x="1" y="1" width="14" height="14" rx="2" style={{ fill: "var(--text-tertiary)", fillOpacity: 0.25, stroke: "var(--text-tertiary)" }} /></svg>
        Siniestro — color por nivel:
      </Row>
      <div style={{ display: "flex", gap: 12, paddingLeft: 24, fontFamily: "var(--font-dm-mono)", fontSize: 11 }}>
        <span style={{ color: "var(--risk-green)" }}>● Verde</span>
        <span style={{ color: "var(--risk-yellow)" }}>● Amarillo</span>
        <span style={{ color: "var(--risk-red)" }}>● Rojo</span>
      </div>
      <Row>
        <svg width="22" height="8"><line x1="0" y1="4" x2="22" y2="4" style={{ stroke: "var(--risk-red)", strokeWidth: 1.6, strokeDasharray: "5 4" }} /></svg>
        Relación con un caso rojo
      </Row>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <span style={{ display: "flex", alignItems: "center", gap: 8 }}>{children}</span>;
}
