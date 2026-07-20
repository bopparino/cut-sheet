import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { scanDuplicates } from "@/lib/dupes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Recomputes duplicate flags across all live cutsheets. Run after imports.
export async function POST() {
  const me = await getCurrentUser();
  if (!me || me.role !== "admin") return new NextResponse("admin only", { status: 403 });
  return NextResponse.json(scanDuplicates());
}
