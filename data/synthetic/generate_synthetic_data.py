"""
Generate realistic synthetic insurance claims data for fraudia-claims.

Produces 200 rows with ~20% fraud labels and various edge cases:
- Borde de vigencia (siniestro near policy start/end)
- High monto ratio (close to or exceeding suma_asegurada)
- Late reports (>7 days between occurrence and report)
- Recurring providers and high-frequency insureds
- Theft coverage with late reporting

Output: data/synthetic/claims_sinteticos.csv

Usage:
    python data/synthetic/generate_synthetic_data.py
"""

import os
import random
import sys
import uuid
from datetime import date, timedelta

import numpy as np
import pandas as pd

# Seed for reproducibility
RANDOM_SEED = 42
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

# ---- Constants ----
N_ROWS = 200
FRAUD_RATE = 0.20  # ~20% fraud

OUTPUT_DIR = os.path.join(os.path.dirname(__file__))
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "claims_sinteticos.csv")

# ---- Lookup tables ----
RAMOS = ["Autos", "Autos", "Autos", "Hogar", "Salud", "Vida"]

COBERTURAS = {
    "Autos": [
        "Colisión", "Pérdida Total", "Robo Total", "Robo Parcial",
        "Responsabilidad Civil", "Daños a Terceros", "Cristales",
    ],
    "Hogar": [
        "Incendio", "Robo de Contenidos", "Daños por Agua", "Responsabilidad Civil Hogar",
    ],
    "Salud": [
        "Hospitalización", "Cirugía", "Consulta Médica", "Medicamentos",
    ],
    "Vida": [
        "Fallecimiento", "Invalidez Total", "Invalidez Parcial",
    ],
}

ESTADOS = ["Abierto", "En investigación", "Cerrado - Pagado", "Cerrado - Rechazado", "En ajuste"]

CIUDADES = [
    "San José", "Alajuela", "Cartago", "Heredia", "Liberia",
    "Pérez Zeledón", "San Carlos", "Nicoya", "Limón", "Puntarenas",
    "Desamparados", "Escazú", "Santa Ana", "Curridabat", "Tibás",
]

PROVINCIAS = {
    "San José": "San José", "Alajuela": "Alajuela", "Cartago": "Cartago",
    "Heredia": "Heredia", "Liberia": "Guanacaste", "Pérez Zeledón": "San José",
    "San Carlos": "Alajuela", "Nicoya": "Guanacaste", "Limón": "Limón",
    "Puntarenas": "Puntarenas", "Desamparados": "San José", "Escazú": "San José",
    "Santa Ana": "San José", "Curridabat": "San José", "Tibás": "San José",
}

DESCRIPCIONES_LEGIT = [
    "Colisión frontal con otro vehículo en intersección sin semáforo.",
    "Daños por granizo en carrocería del vehículo estacionado.",
    "Robo del vehículo en zona comercial durante horas nocturnas. Se presentó denuncia policial.",
    "Impacto lateral al salir de estacionamiento.",
    "Daño en parabrisas por piedra proyectada desde camión.",
    "Incendio en cocina del hogar con daños menores.",
    "Robo de electrónicos del interior del vehículo con ventana rota.",
    "Accidente en rotonda con daños en parte trasera.",
    "Hospitalización de emergencia por apendicitis.",
    "Caída en escaleras que requirió cirugía de rodilla.",
    "Pérdida total del vehículo por inundación durante tormenta.",
    "Choque con poste de alumbrado al perder el control por aquaplaning.",
    "Robo de moto en estacionamiento público.",
    "Incendio eléctrico en sala con daños estructurales menores.",
    "Accidente a baja velocidad en parqueo de supermercado.",
]

DESCRIPCIONES_SOSPECHOSAS = [
    "Siniestro ocurrido sin testigos en lugar deshabitado. Nadie vio el incidente.",
    "El vehículo fue encontrado abandonado. No hay tercero identificado ni testigos.",
    "El accidente es físicamente imposible según la dinámica descrita por el asegurado.",
    "Colisión sin marcas en la vía. El daño es inexplicable dado lo declarado.",
    "Incendio de origen desconocido. No había nadie en el momento. Solo.",
    "Robo declarado 10 días después de ocurrido. Sin justificación del retraso.",
    "Daños no coinciden con el tipo de accidente descrito. Vehículo en el aire según relato.",
    "El vehículo desapareció sin evidencia forense. Circunstancias confusas.",
]

# ---- Generator helpers ----

def _random_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8].upper()}"


def _random_date(start: date, end: date) -> date:
    delta = (end - start).days
    if delta <= 0:
        return start
    return start + timedelta(days=random.randint(0, delta))


def _format_date(d: date) -> str:
    return d.strftime("%Y-%m-%d")


def generate_row(
    is_fraud: bool,
    edge_case: str,
    asegurado_id: str,
    vehiculo_id: str,
    proveedor_id: str,
) -> dict:
    """Generate a single synthetic claim row."""
    ramo = random.choice(RAMOS)
    coberturas_ramo = COBERTURAS.get(ramo, ["General"])
    cobertura = random.choice(coberturas_ramo)

    # Policy dates: policy started 1-3 years ago, 1-2 years duration
    policy_start = _random_date(date(2021, 1, 1), date(2023, 6, 30))
    policy_duration_days = random.randint(365, 730)
    policy_end = policy_start + timedelta(days=policy_duration_days)

    # Occurrence date: normally within policy, edge cases at borders
    if edge_case == "borde_inicio":
        ocurrencia = policy_start + timedelta(days=random.randint(1, 25))
    elif edge_case == "borde_fin":
        ocurrencia = policy_end - timedelta(days=random.randint(1, 25))
    else:
        # Normal occurrence: after start + 30 days, before end - 30 days
        earliest = policy_start + timedelta(days=31)
        latest = policy_end - timedelta(days=31)
        if earliest >= latest:
            latest = earliest + timedelta(days=30)
        ocurrencia = _random_date(earliest, latest)

    # Report date: normal 1-7 days; late if edge_case or fraud
    if is_fraud or edge_case == "reporte_tardio":
        dias_reporte = random.randint(8, 30)
    else:
        dias_reporte = random.randint(0, 6)
    reporte = ocurrencia + timedelta(days=dias_reporte)

    # Financial amounts
    suma_asegurada = round(random.choice([
        5_000_000, 8_000_000, 10_000_000, 12_000_000, 15_000_000,
        20_000_000, 25_000_000, 30_000_000, 50_000_000,
    ]) * random.uniform(0.8, 1.2), -3)

    if edge_case == "monto_alto" or (is_fraud and random.random() < 0.6):
        ratio = random.uniform(0.88, 1.05)
    else:
        ratio = random.uniform(0.05, 0.75)

    monto_reclamado = round(suma_asegurada * ratio, -2)
    monto_estimado = round(monto_reclamado * random.uniform(0.7, 1.15), -2)
    monto_pagado = round(monto_estimado * random.uniform(0.8, 1.0), -2) if random.random() > 0.3 else None
    deducible = round(suma_asegurada * random.uniform(0.02, 0.10), -2)

    # Documents
    if is_fraud and random.random() < 0.55:
        documentos_completos = False
    else:
        documentos_completos = random.random() > 0.15

    # Description
    if is_fraud and random.random() < 0.7:
        descripcion = random.choice(DESCRIPCIONES_SOSPECHOSAS)
    else:
        descripcion = random.choice(DESCRIPCIONES_LEGIT)

    # Estado
    if is_fraud:
        estado = random.choice(["Abierto", "En investigación", "Cerrado - Rechazado"])
    else:
        estado = random.choice(ESTADOS)

    ciudad = random.choice(CIUDADES)

    return {
        "id_siniestro": _random_id("SIN"),
        "id_poliza": _random_id("POL"),
        "id_asegurado": asegurado_id,
        "id_vehiculo": vehiculo_id if ramo == "Autos" else None,
        "id_proveedor": proveedor_id,
        "ramo": ramo,
        "cobertura": cobertura,
        "estado": estado,
        "ciudad": ciudad,
        "provincia": PROVINCIAS.get(ciudad, "San José"),
        "fecha_ocurrencia": _format_date(ocurrencia),
        "fecha_reporte": _format_date(reporte),
        "fecha_inicio_poliza": _format_date(policy_start),
        "fecha_fin_poliza": _format_date(policy_end),
        "monto_reclamado": monto_reclamado,
        "monto_estimado": monto_estimado,
        "monto_pagado": monto_pagado,
        "suma_asegurada": suma_asegurada,
        "deducible": deducible,
        "descripcion": descripcion,
        "documentos_completos": documentos_completos,
        "etiqueta_fraude_simulada": 1 if is_fraud else 0,
    }


def generate_synthetic_data(n_rows: int = N_ROWS) -> pd.DataFrame:
    """
    Generate a synthetic claims dataset.

    ~20% fraudulent, with various edge cases distributed across the dataset.
    """
    n_fraud = int(n_rows * FRAUD_RATE)
    n_legit = n_rows - n_fraud

    # Create a pool of insured IDs (some repeat to simulate high-frequency patterns)
    n_asegurados = max(1, n_rows // 5)
    asegurado_pool = [_random_id("ASG") for _ in range(n_asegurados)]

    # Create vehicle pool
    n_vehiculos = max(1, n_rows // 4)
    vehiculo_pool = [_random_id("VEH") for _ in range(n_vehiculos)]

    # Create provider pool (some providers repeat to simulate recurrent providers)
    n_proveedores = max(1, n_rows // 8)
    proveedor_pool = [_random_id("PROV") for _ in range(n_proveedores)]

    # Edge cases to distribute
    edge_cases_fraud = (
        ["borde_inicio"] * 8
        + ["borde_fin"] * 7
        + ["monto_alto"] * 10
        + ["reporte_tardio"] * 7
        + ["normal"] * (n_fraud - 32)
    )
    # Trim/pad to n_fraud
    random.shuffle(edge_cases_fraud)
    edge_cases_fraud = (edge_cases_fraud * (n_fraud // len(edge_cases_fraud) + 1))[:n_fraud]

    edge_cases_legit = (
        ["borde_inicio"] * 3
        + ["borde_fin"] * 3
        + ["monto_alto"] * 2
        + ["reporte_tardio"] * 2
        + ["normal"] * (n_legit - 10)
    )
    random.shuffle(edge_cases_legit)
    edge_cases_legit = (edge_cases_legit * (n_legit // len(edge_cases_legit) + 1))[:n_legit]

    rows = []

    # Fraud rows
    for i in range(n_fraud):
        ec = edge_cases_fraud[i]
        aseg = random.choice(asegurado_pool[:max(1, n_asegurados // 3)])  # Fraud uses fewer asegurados -> higher frequency
        veh = random.choice(vehiculo_pool[:max(1, n_vehiculos // 3)])
        prov = random.choice(proveedor_pool[:max(1, n_proveedores // 4)])  # Fraud uses fewer providers -> recurrent
        row = generate_row(is_fraud=True, edge_case=ec, asegurado_id=aseg, vehiculo_id=veh, proveedor_id=prov)
        rows.append(row)

    # Legitimate rows
    for i in range(n_legit):
        ec = edge_cases_legit[i]
        aseg = random.choice(asegurado_pool)
        veh = random.choice(vehiculo_pool)
        prov = random.choice(proveedor_pool)
        row = generate_row(is_fraud=False, edge_case=ec, asegurado_id=aseg, vehiculo_id=veh, proveedor_id=prov)
        rows.append(row)

    # Shuffle
    random.shuffle(rows)

    df = pd.DataFrame(rows)
    return df


def main():
    print("[INFO] Generating synthetic insurance claims data...")
    df = generate_synthetic_data(N_ROWS)

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    df.to_csv(OUTPUT_FILE, index=False, encoding="utf-8")

    # Stats
    fraud_count = (df["etiqueta_fraude_simulada"] == 1).sum()
    legit_count = (df["etiqueta_fraude_simulada"] == 0).sum()

    print(f"[INFO] Generated {len(df)} rows:")
    print(f"       - Fraud (etiqueta=1): {fraud_count} ({fraud_count/len(df):.1%})")
    print(f"       - Legit (etiqueta=0): {legit_count} ({legit_count/len(df):.1%})")
    print(f"\nUnique asegurados: {df['id_asegurado'].nunique()}")
    print(f"Unique vehículos:  {df['id_vehiculo'].nunique()}")
    print(f"Unique proveedores:{df['id_proveedor'].nunique()}")

    # Edge case summary
    from datetime import datetime as dt
    df["_ini"] = pd.to_datetime(df["fecha_inicio_poliza"])
    df["_fin"] = pd.to_datetime(df["fecha_fin_poliza"])
    df["_occ"] = pd.to_datetime(df["fecha_ocurrencia"])
    df["_rep"] = pd.to_datetime(df["fecha_reporte"])
    df["_dias_rep"] = (df["_rep"] - df["_occ"]).dt.days
    df["_dias_ini"] = (df["_occ"] - df["_ini"]).dt.days
    df["_dias_fin"] = (df["_fin"] - df["_occ"]).dt.days
    df["_ratio"] = df["monto_reclamado"] / df["suma_asegurada"]

    borde = ((df["_dias_ini"] <= 30) | (df["_dias_fin"] <= 30)).sum()
    tardio = (df["_dias_rep"] > 7).sum()
    monto_alto = (df["_ratio"] >= 0.9).sum()

    print(f"\nEdge cases:")
    print(f"  Borde vigencia (<= 30 dias inicio/fin): {borde}")
    print(f"  Reporte tardio (>7 dias):               {tardio}")
    print(f"  Monto atipico (ratio >= 0.9):           {monto_alto}")
    print(f"\nOutput: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
