"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, FileText, Gem, LockKeyhole, Send, ShieldCheck } from "lucide-react";

type ExclusiveTrack = { id: string; title: string; description: string | null; previewSeconds: number; artworkUrl: string | null; artistProfile: { stageName: string }; genre: { name: string } | null };

export default function ExclusiveCataloguePage() {
  const [tracks, setTracks] = useState<ExclusiveTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [terms, setTerms] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetch("/api/catalogue/exclusive").then(async r => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Industry access is required.");
      setTracks(data.tracks || []);
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  async function submit(trackId: string) {
    setSending(true); setNotice("");
    try {
      const response = await fetch("/api/acquisitions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        trackId, amountMinor: amount ? Math.round(Number(amount) * 100) : undefined,
        proposedTerms: terms || undefined, message,
      }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not send enquiry.");
      setNotice("Your acquisition enquiry has been sent. Track the discussion in your Industry Desk.");
      setActive(null); setAmount(""); setTerms(""); setMessage("");
    } catch (e) { setNotice(e instanceof Error ? e.message : "Something went wrong."); }
    finally { setSending(false); }
  }

  return <main className="artist-dashboard">
    <header className="artist-top"><Link href="/dashboard/industry" className="artist-back"><ArrowLeft size={16}/> Industry Desk</Link><div className="artist-top-brand"><span className="brand-symbol">SR</span> SQUADREC <span>EXCLUSIVE VAULT</span></div></header>
    <div className="artist-wrap">
      <div className="artist-heading"><div><span className="eyebrow"><Gem size={13}/> PRIVATE RIGHTS MARKETPLACE</span><h1>Find the sound.<br/><em>Acquire the rights.</em></h1><p>Browse approved unreleased music. Send an acquisition enquiry to begin a direct rights discussion with the rights holder.</p></div><div className="artist-heading-mark"><LockKeyhole size={38}/></div></div>
      <div className="artist-info-strip"><ShieldCheck size={16}/><span>Only approved exclusive tracks are shown. Enquiries do not transfer ownership; transfer requires a signed contract and completed payment.</span></div>
      {notice && <div className="artist-info-strip"><BadgeCheck size={16}/><span>{notice}</span></div>}
      <section className="artist-panel"><div className="artist-panel-title"><div><span className="eyebrow">VERIFIED CATALOGUE</span><h2>Exclusive releases</h2><p>{tracks.length} approved track{tracks.length===1?"":"s"} currently available.</p></div><Gem size={22}/></div>
        {loading ? <div className="artist-empty">Loading the private catalogue...</div> : error ? <div className="artist-empty"><ShieldCheck size={22}/><b>Access restricted</b><span>{error}</span></div> : tracks.length ? tracks.map(t=><article className="exclusive-track-card" key={t.id}>
          <div className="exclusive-track-art">{t.artworkUrl ? <img src={t.artworkUrl} alt="Track artwork"/> : <Gem size={30}/>}</div>
          <div className="exclusive-track-info"><b>{t.title}</b><span>{t.artistProfile.stageName} · {t.genre?.name || "Uncategorised"}</span><small>Private preview · maximum {t.previewSeconds} seconds</small><audio className="exclusive-preview-audio" controls preload="none" src={`/api/catalogue/exclusive/${t.id}/preview`} aria-label={`Preview ${t.title}`} /><p>{t.description || "Artist-approved exclusive music available for rights acquisition enquiries."}</p></div>
          <button className="artist-submit exclusive-offer-button" onClick={()=>setActive(active===t.id?null:t.id)}>{active===t.id?"Close":"Place enquiry"} <Send size={15}/></button>
          {active===t.id && <div className="exclusive-offer-form"><label>Proposed offer (USD)<input type="number" min="1" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Optional"/></label><label>Proposed rights terms<textarea rows={3} value={terms} onChange={e=>setTerms(e.target.value)} placeholder="Describe the ownership transfer terms you want to discuss."/></label><label>Message to rights holder<textarea rows={3} minLength={20} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Introduce your company and explain your intended use or acquisition interest."/></label><button className="artist-submit" disabled={sending||message.trim().length<20} onClick={()=>submit(t.id)}>{sending?"Sending...":"Send acquisition enquiry"} <Send size={15}/></button></div>}
        </article>) : <div className="artist-empty"><FileText size={23}/><b>The vault is being curated</b><span>Approved exclusive tracks will appear here after artist verification and rights review.</span></div>}
      </section>
    </div>
  </main>;
}
