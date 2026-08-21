import { ariyaAuthError, buildCatalog } from "@/lib/ariya";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET the aggregatable-path catalog, derived from the cut sheet schema.
// Ariya fetches this once at boot and folds it into its system prompt, so
// the agent always knows the exact item vocabulary of the current form.
export async function GET(req: Request) {
  const denied = ariyaAuthError(req);
  if (denied) return denied;
  return Response.json(buildCatalog());
}
