// Mock Salesforce for local/offline testing of the send integration.
// Node builtins only — run with plain `node scripts/mock-salesforce.mjs`.
//
//   node scripts/mock-salesforce.mjs [port] [propNumber ...]
//
// Serves just enough of the Salesforce REST surface for src/lib/salesforce.ts:
// token endpoint, SOQL query (Lot lookup, ContentDocumentLink lookup,
// ContentVersion->ContentDocumentId resolve), ContentVersion create, and
// ContentDocumentLink create. Every prop number passed on the command line
// (default: 424242) exists as a fake lot; anything else returns no rows so
// the not-found path is testable. Uploaded PDFs are written to
// .mock-salesforce/ next to the repo so you can open what "Salesforce"
// received. State lives in memory — restart to reset versions.
//
// Point the app at it:
//   SALESFORCE_ENABLED=true \
//   SALESFORCE_INSTANCE_URL=http://localhost:3999 \
//   SALESFORCE_CLIENT_ID=mock SALESFORCE_CLIENT_SECRET=mock \
//   npm run dev

import { createServer } from "node:http";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const port = Number(process.argv[2]) || 3999;
const props = process.argv.slice(3);
const knownProps = new Set(props.length ? props : ["424242"]);

const outDir = join(process.cwd(), ".mock-salesforce");
mkdirSync(outDir, { recursive: true });

// In-memory content store: docId -> { title, versions: number }
const docs = new Map();
// linkedEntityId -> [{ contentDocumentId }]
const links = new Map();
let nextId = 1;
const id = (prefix) => `${prefix}${String(nextId++).padStart(6, "0")}`;

const readBody = (req) =>
  new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
  });

const json = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  const path = url.pathname;
  console.log(`${req.method} ${path}${url.search ? "?…" : ""}`);

  // --- token -----------------------------------------------------------
  if (req.method === "POST" && path === "/services/oauth2/token") {
    await readBody(req);
    return json(res, 200, { access_token: "mock-token", instance_url: `http://localhost:${port}`, token_type: "Bearer" });
  }

  const authed = req.headers.authorization === "Bearer mock-token";
  if (!authed) return json(res, 401, [{ message: "INVALID_SESSION_ID" }]);

  // --- SOQL ------------------------------------------------------------
  if (req.method === "GET" && /^\/services\/data\/v[\d.]+\/query$/.test(path)) {
    const q = url.searchParams.get("q") ?? "";

    // Lot lookup: ... FROM Lot__c WHERE Name = 'XXXX'
    if (/FROM\s+Lot__c/i.test(q)) {
      const m = q.match(/=\s*'((?:[^'\\]|\\.)*)'/);
      const prop = m ? m[1].replace(/\\(.)/g, "$1") : "";
      const records = knownProps.has(prop)
        ? [{
            Id: `LOT_${prop}`,
            Name: prop,
            Lot_Number__c: "101",
            Builder__c: "TEST BUILDER",
            Project_Code__c: "SP1",
            Lot_Address__c: "123 MOCK ST, FREDERICK, MD",
          }]
        : [];
      return json(res, 200, { totalSize: records.length, done: true, records });
    }

    // Links on a record: ... FROM ContentDocumentLink WHERE LinkedEntityId = '...'
    if (/FROM\s+ContentDocumentLink/i.test(q)) {
      const m = q.match(/LinkedEntityId\s*=\s*'((?:[^'\\]|\\.)*)'/i);
      const entity = m ? m[1] : "";
      const rows = (links.get(entity) ?? []).map((l) => ({
        ContentDocumentId: l.contentDocumentId,
        ContentDocument: { Title: docs.get(l.contentDocumentId)?.title ?? "" },
      }));
      return json(res, 200, { totalSize: rows.length, done: true, records: rows });
    }

    // Resolve version -> document: ... FROM ContentVersion WHERE Id = '...'
    if (/FROM\s+ContentVersion/i.test(q)) {
      const m = q.match(/Id\s*=\s*'((?:[^'\\]|\\.)*)'/i);
      const versionId = m ? m[1] : "";
      const docId = [...docs.entries()].find(([, d]) => d.versionIds.includes(versionId))?.[0];
      return json(res, 200, {
        totalSize: docId ? 1 : 0,
        done: true,
        records: docId ? [{ ContentDocumentId: docId }] : [],
      });
    }

    return json(res, 400, [{ message: `mock: unhandled SOQL: ${q.slice(0, 120)}` }]);
  }

  // --- ContentVersion create ------------------------------------------
  if (req.method === "POST" && /\/sobjects\/ContentVersion$/.test(path)) {
    const body = JSON.parse((await readBody(req)).toString());
    const pdf = Buffer.from(body.VersionData ?? "", "base64");
    const versionId = id("068");
    let docId = body.ContentDocumentId;
    if (docId) {
      const doc = docs.get(docId);
      if (!doc) return json(res, 400, [{ message: "mock: unknown ContentDocumentId" }]);
      doc.versions += 1;
      doc.versionIds.push(versionId);
    } else {
      docId = id("069");
      docs.set(docId, { title: body.Title, versions: 1, versionIds: [versionId] });
    }
    const doc = docs.get(docId);
    const file = join(outDir, `${body.PathOnClient?.replace(/\.pdf$/, "") ?? versionId}-v${doc.versions}.pdf`);
    writeFileSync(file, pdf);
    console.log(`   received "${body.Title}" v${doc.versions} (${pdf.length} bytes) -> ${file}`);
    return json(res, 201, { id: versionId, success: true });
  }

  // --- ContentDocumentLink create -------------------------------------
  if (req.method === "POST" && /\/sobjects\/ContentDocumentLink$/.test(path)) {
    const body = JSON.parse((await readBody(req)).toString());
    const list = links.get(body.LinkedEntityId) ?? [];
    list.push({ contentDocumentId: body.ContentDocumentId });
    links.set(body.LinkedEntityId, list);
    return json(res, 201, { id: id("06A"), success: true });
  }

  return json(res, 404, [{ message: `mock: no route for ${req.method} ${path}` }]);
}).listen(port, () => {
  console.log(`Mock Salesforce on http://localhost:${port}`);
  console.log(`Known lots (by prop/Name): ${[...knownProps].join(", ")}`);
  console.log(`Uploads land in ${outDir}/`);
});
