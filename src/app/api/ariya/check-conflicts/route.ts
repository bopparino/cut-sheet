import { loadSheets, ariyaAuthError } from "@/lib/ariya";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SalesforceLot = {
  name: string; // prop number
  builder?: string;
  maxPhase?: string;
  lotNumber?: string;
  address?: string;
  // Phase dates — present means that phase has been reached
  riDateRequested?: string | null;
  riDateOrdered?: string | null;
  riDateDelivered?: string | null;
  idDateRequested?: string | null;
  idDateOrdered?: string | null;
  idDateDelivered?: string | null;
  odDateRequested?: string | null;
  odDateOrdered?: string | null;
  odDateDelivered?: string | null;
  ttDateCompleted?: string | null;
  fiDateDelivered?: string | null;
};

type ConflictAlert = {
  lotName: string;
  builder?: string;
  lotNumber?: string;
  address?: string;
  alertType: "missing_sheets" | "phase_mismatch" | "early_sheets";
  severity: "high" | "medium" | "low";
  message: string;
  sheetCount: number;
  expectedSheets?: string[];
};

// POST { lots: SalesforceLot[], builderFilter? }
// Returns conflict alerts between Salesforce phase data and cut sheet presence.
export async function POST(req: Request) {
  const denied = ariyaAuthError(req);
  if (denied) return denied;

  let body: { lots: SalesforceLot[]; builderFilter?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.lots) || body.lots.length === 0) {
    return Response.json({ error: "lots array is required" }, { status: 400 });
  }

  // Load all sheets for the builders mentioned
  const builders = new Set(body.lots.map((l) => l.builder).filter(Boolean));
  const sheets = loadSheets({
    builder: body.builderFilter ?? [...builders].join("|"),
    excludeArchived: true,
  });

  // Index sheets by prop number (header.propNumber)
  const sheetsByProp = new Map<string, typeof sheets>();
  for (const sheet of sheets) {
    const prop = sheet.data.header.propNumber?.trim();
    if (!prop) continue;
    const existing = sheetsByProp.get(prop);
    if (existing) {
      existing.push(sheet);
    } else {
      sheetsByProp.set(prop, [sheet]);
    }
  }

  const alerts: ConflictAlert[] = [];

  // Phase → expected sheet zone mapping (simplified)
  // RI = Rough-In sheets (zone 1 typically)
  // ID = Indoor unit sheets
  // OD = Outdoor unit sheets
  // TT = Tubing ticket
  // FI = Final / finishing
  const phaseToExpected: Record<string, string[]> = {
    RI: ["Zone 1", "Rough-In"],
    ID: ["Zone 2", "Indoor"],
    OD: ["Zone 3", "Outdoor"],
    TT: ["Tubing"],
    FI: ["Final"],
  };

  for (const lot of body.lots) {
    const propSheets = sheetsByProp.get(lot.name) ?? [];
    const sheetCount = propSheets.length;

    // Determine max phase from dates
    let maxPhase: string | null = null;
    const phases = ["FI", "TT", "OD", "ID", "RI"];
    for (const phase of phases) {
      const dateField = phase === "TT"
        ? lot.ttDateCompleted
        : phase === "FI"
          ? lot.fiDateDelivered
          : (lot as Record<string, string | null | undefined>)[`${phase.toLowerCase()}DateDelivered`] ??
            (lot as Record<string, string | null | undefined>)[`${phase.toLowerCase()}DateOrdered`] ??
            (lot as Record<string, string | null | undefined>)[`${phase.toLowerCase()}DateRequested`];
      if (dateField) {
        maxPhase = phase;
        break;
      }
    }

    // Missing sheets: phase reached but no corresponding cut sheets
    if (maxPhase && sheetCount === 0) {
      alerts.push({
        lotName: lot.name,
        builder: lot.builder,
        lotNumber: lot.lotNumber,
        address: lot.address,
        alertType: "missing_sheets",
        severity: "high",
        message: `Lot is in ${maxPhase} phase but has zero cut sheets. Expected at least ${phaseToExpected[maxPhase]?.join(" or ") ?? "zone sheets"}.`,
        sheetCount: 0,
        expectedSheets: phaseToExpected[maxPhase],
      });
    }

    // Phase mismatch: sheets exist but lot hasn't reached that phase yet
    if (sheetCount > 0 && !maxPhase) {
      // Sheets exist but Salesforce shows no phase dates at all
      // This might mean the lot is brand new, but worth flagging
      alerts.push({
        lotName: lot.name,
        builder: lot.builder,
        lotNumber: lot.lotNumber,
        address: lot.address,
        alertType: "early_sheets",
        severity: "low",
        message: `${sheetCount} cut sheet(s) exist but Salesforce shows no phase activity. Lot may be new or data may be stale.`,
        sheetCount,
      });
    }
  }

  // Sort by severity
  alerts.sort((a, b) => {
    const sevOrder = { high: 0, medium: 1, low: 2 };
    return sevOrder[a.severity] - sevOrder[b.severity];
  });

  return Response.json({
    totalLotsChecked: body.lots.length,
    lotsWithAlerts: alerts.length,
    alerts,
  });
}
