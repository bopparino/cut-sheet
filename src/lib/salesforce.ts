import "server-only";

// Salesforce integration (July 2026): push the whole-house packet PDFs onto
// the matching Lot record in Metcalfe's Salesforce org, which serves as the
// end-to-end job tracker (NOT a CRM — Lot__c/Project__c are custom objects).
//
// DORMANT BY DEFAULT. Everything here is driven by env vars; until
// SALESFORCE_ENABLED=true and the three credential vars are set, the
// integration is invisible: no button renders and the send endpoint answers
// 503. Flipping it on is a Railway env change, not a deploy. See SALESFORCE.md
// for the Connected App setup and the activation checklist.
//
// SCHEMA TRUTH (verified against prod describes + live records, July 2026 —
// the labels lie, same lesson as the Access forms):
//   - The cut sheet "Prop #" is the Lot record's NAME (an auto-number field,
//     e.g. 208484). It is NOT Property_Number__c — that's a zero-padded
//     legacy identifier ('00000228') unrelated to our prop numbers.
//   - Lot_Number__c ('15K', '101') is the builder's lot — our header "Lot".
//   - Builder__c (plain string) and Project_Code__c on the Lot mirror our
//     header fields; we use them as warn-only sanity checks, never as keys.
//
// Auth is the OAuth 2.0 client-credentials flow against a Connected App with
// a run-as integration user — server-to-server, no human login. Files land as
// Salesforce Files (ContentVersion + ContentDocumentLink), NOT the legacy
// Attachment object. Re-sends become new VERSIONS of the same two files
// (matched by Title on the lot), so a lot always shows exactly one shop
// packet card and one foreman packet card with full version history.

const DEFAULT_API_VERSION = "v61.0";

// Base64-encoded ContentVersion bodies cap out around 37.5MB in Salesforce's
// JSON REST API. Packets are typically well under 1MB; a foreman packet with
// scanned plans could conceivably grow, so fail with a clear message instead
// of an opaque Salesforce error. (If this is ever actually hit, the upload
// needs the multipart variant — see SALESFORCE.md.)
const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;

export type SalesforceConfig = {
  instanceUrl: string;
  clientId: string;
  clientSecret: string;
  apiVersion: string;
  lotObject: string;
  lotPropField: string;
};

// null = integration off (missing flag or credentials). The button and the
// send route both key off this, so a half-configured environment stays inert.
export function salesforceConfig(): SalesforceConfig | null {
  if (process.env.SALESFORCE_ENABLED !== "true") return null;
  const instanceUrl = (process.env.SALESFORCE_INSTANCE_URL ?? "").trim().replace(/\/+$/, "");
  const clientId = (process.env.SALESFORCE_CLIENT_ID ?? "").trim();
  const clientSecret = (process.env.SALESFORCE_CLIENT_SECRET ?? "").trim();
  if (!instanceUrl || !clientId || !clientSecret) return null;
  return {
    instanceUrl,
    clientId,
    clientSecret,
    apiVersion: (process.env.SALESFORCE_API_VERSION ?? "").trim() || DEFAULT_API_VERSION,
    lotObject: (process.env.SALESFORCE_LOT_OBJECT ?? "").trim() || "Lot__c",
    lotPropField: (process.env.SALESFORCE_LOT_PROP_FIELD ?? "").trim() || "Name",
  };
}

export function salesforceEnabled(): boolean {
  return salesforceConfig() !== null;
}

// Errors that should surface verbatim in the UI toast.
export class SalesforceError extends Error {}

// ---------------------------------------------------------------------------
// Token
// ---------------------------------------------------------------------------

// One token per server process, refreshed on expiry or 401. Client-credentials
// tokens don't come with refresh tokens; re-asking is the refresh.
let cachedToken: { token: string; fetchedAt: number } | null = null;
const TOKEN_TTL_MS = 30 * 60 * 1000; // conservative; org session timeout is longer

async function getToken(cfg: SalesforceConfig, force = false): Promise<string> {
  if (!force && cachedToken && Date.now() - cachedToken.fetchedAt < TOKEN_TTL_MS) {
    return cachedToken.token;
  }
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
  });
  const res = await fetch(`${cfg.instanceUrl}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new SalesforceError(
      `Salesforce sign-in failed (${res.status}). Check the Connected App credentials. ${text.slice(0, 300)}`,
    );
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new SalesforceError("Salesforce sign-in returned no token.");
  cachedToken = { token: json.access_token, fetchedAt: Date.now() };
  return json.access_token;
}

// Authed fetch against the REST API, retrying exactly once on 401 with a
// fresh token (revoked sessions, org-side timeouts).
async function sfFetch(
  cfg: SalesforceConfig,
  path: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = 30_000, ...rest } = init;
  const doFetch = async (token: string) =>
    fetch(`${cfg.instanceUrl}${path}`, {
      ...rest,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(rest.headers ?? {}),
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
  let res = await doFetch(await getToken(cfg));
  if (res.status === 401) res = await doFetch(await getToken(cfg, true));
  return res;
}

async function soql<T>(cfg: SalesforceConfig, query: string): Promise<T[]> {
  const res = await sfFetch(cfg, `/services/data/${cfg.apiVersion}/query?q=${encodeURIComponent(query)}`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new SalesforceError(`Salesforce query failed (${res.status}). ${text.slice(0, 300)}`);
  }
  const json = (await res.json()) as { records?: T[] };
  return json.records ?? [];
}

// SOQL string literal escape — quotes and backslashes.
const q = (s: string) => `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;

// ---------------------------------------------------------------------------
// Lot lookup
// ---------------------------------------------------------------------------

export type SfLot = {
  id: string;
  prop: string;
  lotNumber: string;
  builder: string;
  projectCode: string;
  address: string;
};

export type LotLookup =
  | { status: "found"; lot: SfLot }
  | { status: "none" }
  | { status: "multiple"; count: number };

// Prop # -> Lot record. Name is an auto-number so it's unique in practice,
// but LIMIT 3 lets us detect (and refuse) the impossible-duplicate case
// loudly instead of picking one at random.
export async function findLotByProp(cfg: SalesforceConfig, prop: string): Promise<LotLookup> {
  type Row = {
    Id: string;
    Name: string;
    Lot_Number__c: string | null;
    Builder__c: string | null;
    Project_Code__c: string | null;
    Lot_Address__c: string | null;
  };
  const rows = await soql<Row>(
    cfg,
    `SELECT Id, Name, Lot_Number__c, Builder__c, Project_Code__c, Lot_Address__c FROM ${cfg.lotObject} WHERE ${cfg.lotPropField} = ${q(prop)} LIMIT 3`,
  );
  if (rows.length === 0) return { status: "none" };
  if (rows.length > 1) return { status: "multiple", count: rows.length };
  const r = rows[0];
  return {
    status: "found",
    lot: {
      id: r.Id,
      prop: r.Name,
      lotNumber: r.Lot_Number__c ?? "",
      builder: r.Builder__c ?? "",
      projectCode: r.Project_Code__c ?? "",
      address: r.Lot_Address__c ?? "",
    },
  };
}

// ---------------------------------------------------------------------------
// File upload (Salesforce Files: ContentVersion + ContentDocumentLink)
// ---------------------------------------------------------------------------

export type UploadResult = {
  contentDocumentId: string;
  contentVersionId: string;
  // true when this send added a version to an existing file on the lot
  // (re-send), false when it created the file fresh.
  newVersion: boolean;
};

async function createRecord(
  cfg: SalesforceConfig,
  sobject: string,
  body: Record<string, string>,
  timeoutMs: number,
): Promise<string> {
  const res = await sfFetch(cfg, `/services/data/${cfg.apiVersion}/sobjects/${sobject}`, {
    method: "POST",
    body: JSON.stringify(body),
    timeoutMs,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new SalesforceError(`Salesforce ${sobject} create failed (${res.status}). ${text.slice(0, 300)}`);
  }
  const json = (await res.json()) as { id?: string };
  if (!json.id) throw new SalesforceError(`Salesforce ${sobject} create returned no id.`);
  return json.id;
}

// Upload a PDF onto a record as a Salesforce File. If the record already has
// a File with this exact Title (a previous send), the upload becomes a new
// version of that File; otherwise a new File is created and linked.
export async function uploadPdfToRecord(
  cfg: SalesforceConfig,
  recordId: string,
  title: string,
  filename: string,
  pdf: Buffer,
): Promise<UploadResult> {
  if (pdf.byteLength > MAX_UPLOAD_BYTES) {
    throw new SalesforceError(
      `This packet is ${(pdf.byteLength / 1024 / 1024).toFixed(1)}MB — larger than the ${MAX_UPLOAD_BYTES / 1024 / 1024}MB send limit. (Usually a plan attachment; see SALESFORCE.md.)`,
    );
  }

  type LinkRow = { ContentDocumentId: string; ContentDocument: { Title: string } | null };
  const links = await soql<LinkRow>(
    cfg,
    `SELECT ContentDocumentId, ContentDocument.Title FROM ContentDocumentLink WHERE LinkedEntityId = ${q(recordId)}`,
  );
  const existing = links.find((l) => l.ContentDocument?.Title === title);

  const versionBody: Record<string, string> = {
    Title: title,
    PathOnClient: filename,
    VersionData: pdf.toString("base64"),
    ...(existing ? { ContentDocumentId: existing.ContentDocumentId } : {}),
  };
  const versionId = await createRecord(cfg, "ContentVersion", versionBody, 120_000);

  if (existing) {
    return { contentDocumentId: existing.ContentDocumentId, contentVersionId: versionId, newVersion: true };
  }

  // Fresh file: resolve the ContentDocument Salesforce minted for it, then
  // link it to the record so it shows in the lot's Files list.
  const created = await soql<{ ContentDocumentId: string }>(
    cfg,
    `SELECT ContentDocumentId FROM ContentVersion WHERE Id = ${q(versionId)}`,
  );
  const docId = created[0]?.ContentDocumentId;
  if (!docId) throw new SalesforceError("Salesforce did not return a ContentDocumentId for the upload.");
  await createRecord(
    cfg,
    "ContentDocumentLink",
    { ContentDocumentId: docId, LinkedEntityId: recordId, ShareType: "V", Visibility: "AllUsers" },
    30_000,
  );
  return { contentDocumentId: docId, contentVersionId: versionId, newVersion: false };
}
