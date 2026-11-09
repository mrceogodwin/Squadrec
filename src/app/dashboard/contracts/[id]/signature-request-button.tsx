"use client";
import { useState } from "react";
import { FileSignature, Loader2 } from "lucide-react";

export default function SignatureRequestButton({ contractId }: { contractId: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function start() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/contracts/" + contractId + "/signatures", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not start the signature process.");
      setMessage("DocuSign envelope sent. The rights holder signs first, followed by the acquiring party. Envelope: " + data.envelopeId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start signing.");
    } finally {
      setBusy(false);
    }
  }
  return <div className="sq-signature-action">
    <button className="sq-primary-button" onClick={start} disabled={busy}>
      {busy ? <Loader2 size={16} className="animate-spin" /> : <FileSignature size={16} />}
      {busy ? "Connecting to DocuSign…" : "Send for DocuSign signature"}
    </button>
    {message && <p role="status">{message}</p>}
  </div>;
}
