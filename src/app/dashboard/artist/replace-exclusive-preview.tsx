"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const MAX_BYTES = 4 * 1024 * 1024;

export default function ReplaceExclusivePreview({ trackId }: { trackId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function replace() {
    if (!file) { setMessage("Choose a replacement preview clip first."); return; }
    if (file.size > MAX_BYTES) { setMessage("The preview must be 4 MB or smaller."); return; }
    setBusy(true); setMessage("");
    try {
      const form = new FormData();
      form.append("preview", file);
      const upload = await fetch(`/api/artist/tracks/${trackId}/assets`, { method: "POST", body: form });
      const uploaded = await upload.json();
      if (!upload.ok) throw new Error(uploaded.error || "Preview upload failed.");
      const submit = await fetch(`/api/artist/tracks/${trackId}/submit`, { method: "POST" });
      const submitted = await submit.json();
      if (!submit.ok) throw new Error(submitted.error || "Preview replaced, but resubmission failed.");
      setMessage("Preview replaced and track resubmitted for review.");
      setFile(null);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally { setBusy(false); }
  }

  return <div className="sq-preview-replace">
    <label>Replace preview clip
      <input type="file" accept=".mp3,.wav,.m4a,.aac,.flac,.ogg,.webm,audio/*" onChange={e => setFile(e.target.files?.[0] || null)} />
    </label>
    <button type="button" disabled={busy || !file} onClick={replace}>{busy ? "Uploading…" : "Replace preview & resubmit"}</button>
    {message && <small role="status">{message}</small>}
  </div>;
}
