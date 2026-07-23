"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CloudUpload } from "lucide-react";
import { flushPendingSaves } from "@/lib/print-flush";

type Props = {
  cutsheetId: number;
  // Same save-before-act contract as PrintPacketButton: what's on screen is
  // what gets sent.
  formId?: string;
  saveAction?: (formData: FormData) => Promise<void>;
};

type SendResponse = {
  ok?: boolean;
  error?: string;
  lot?: { prop: string; lotNumber: string; builder: string; address: string };
  files?: Array<{ kind: string; newVersion: boolean }>;
  warnings?: string[];
};

// Pushes the whole-house shop + foreman packets onto the matching Salesforce
// Lot record as two Files. Only rendered when the server says the Salesforce
// integration is configured (see salesforceEnabled()), so during the dormant
// scaffold phase nobody ever sees it.
export function SendToSalesforceButton({ cutsheetId, formId, saveAction }: Props) {
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    try {
      if (formId && saveAction) {
        const form = document.getElementById(formId);
        if (form instanceof HTMLFormElement) {
          await saveAction(new FormData(form));
        }
      }
      await flushPendingSaves();

      const res = await fetch(`/api/salesforce/send/${cutsheetId}`, { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as SendResponse;
      if (!res.ok || !json.ok) {
        throw new Error(json.error || `Sending failed (${res.status}).`);
      }

      const versioned = json.files?.some((f) => f.newVersion);
      const lotBit = json.lot ? `lot ${json.lot.lotNumber || json.lot.prop} (${json.lot.builder})` : "the lot";
      toast.success(
        versioned
          ? `Updated both packets on ${lotBit} in Salesforce.`
          : `Sent both packets to ${lotBit} in Salesforce.`,
      );
      for (const w of json.warnings ?? []) toast.warning(w, { duration: 10000 });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sending to Salesforce failed.", {
        duration: 10000,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={send}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-secondary disabled:opacity-60"
    >
      <CloudUpload className="h-4 w-4" /> {busy ? "Sending…" : "Send to Salesforce"}
    </button>
  );
}
