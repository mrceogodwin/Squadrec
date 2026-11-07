"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Clock3, FileAudio, FileCheck2, Image as ImageIcon, RefreshCw, ShieldCheck, XCircle, CheckCircle2 } from "lucide-react";

type ReviewData = {
  artists: Array<{ id: string; stageName: string; biography: string | null; country: string | null; website: string | null; createdAt: string; user: { name: string | null; email: string; createdAt: string } }>;
  tracks: Array<{ id: string; title: string; description: string | null; type: string; status: string; createdAt: string; audioObjectKey: string | null; artworkUrl: string | null; genre: { name: string } | null; artistProfile: { stageName: string; country: string | null }; uploader: { email: string; name: string | null }; rightsEvidence: { uploadedAt: string; fileName: string } | null }>;
};

export default function ReviewCentre() {
  const [data,setData]=useState<ReviewData>({artists:[],tracks:[]});
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState("");
  const [notice,setNotice]=useState("");
  const [notes,setNotes]=useState<Record<string,string>>({});
  const [tab,setTab]=useState<"artists"|"tracks">("artists");
  async function load() {
    setLoading(true);
    try { const r=await fetch("/api/admin/review"); const d=await r.json(); if(!r.ok) throw new Error(d.error||"Unable to load reviews."); setData(d); }
    catch(e) { setNotice(e instanceof Error?e.message:"Unable to load reviews."); }
    finally { setLoading(false); }
  }
  useEffect(()=>{load();},[]);
  async function decide(entity:"artist"|"track",id:string,decision:"approve"|"reject") {
    const key=entity+id; setBusy(key);setNotice("");
    try {
      const r=await fetch("/api/admin/review",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({entity,id,decision,note:notes[id]||""})});
      const d=await r.json(); if(!r.ok) throw new Error(d.error||"Review action failed.");
      setNotice(decision==="approve"?"Approved successfully.":"Rejected and recorded.");
      await load();
    } catch(e) { setNotice(e instanceof Error?e.message:"Review action failed."); }
    finally { setBusy(""); }
  }
  return <div className="sq-review-centre">
    <div className="sq-review-toolbar"><div className="sq-review-tabs"><button className={tab==="artists"?"selected":""} onClick={()=>setTab("artists")}>Artist applications <b>{data.artists.length}</b></button><button className={tab==="tracks"?"selected":""} onClick={()=>setTab("tracks")}>Track submissions <b>{data.tracks.length}</b></button></div><button className="sq-refresh" onClick={load} disabled={loading}><RefreshCw size={15}/> Refresh</button></div>
    {notice&&<div className="sq-review-notice">{notice}</div>}
    {loading?<div className="sq-review-empty"><RefreshCw/> Loading review queue…</div>:tab==="artists"?data.artists.length===0?<div className="sq-review-empty"><BadgeCheck/><b>No artist applications waiting</b><span>New artist applications will appear here.</span></div>:<div className="sq-review-list">{data.artists.map(a=><article className="sq-review-card" key={a.id}><div className="sq-review-card-head"><div className="sq-review-avatar">{a.stageName.slice(0,1).toUpperCase()}</div><div><h3>{a.stageName}</h3><p>{a.user.name||"Account holder"} · {a.user.email}</p></div><span className="sq-review-pending"><Clock3 size={13}/> Pending</span></div><div className="sq-review-details"><div><small>COUNTRY</small><b>{a.country||"Not provided"}</b></div><div><small>APPLIED</small><b>{new Date(a.createdAt).toLocaleDateString()}</b></div><div><small>OFFICIAL PROFILE</small><b>{a.website?<a href={a.website} target="_blank" rel="noreferrer">Open link ↗</a>:"Not provided"}</b></div></div>{a.biography&&<p className="sq-review-bio">{a.biography}</p>}<label className="sq-review-note">Internal review note<textarea value={notes[a.id]||""} onChange={e=>setNotes(v=>({...v,[a.id]:e.target.value}))} placeholder="Optional reason or note for the audit record"/></label><div className="sq-review-actions"><button className="sq-review-reject" disabled={!!busy} onClick={()=>decide("artist",a.id,"reject")}><XCircle size={16}/> Reject</button><button className="sq-review-approve" disabled={!!busy} onClick={()=>decide("artist",a.id,"approve")}>{busy==="artist"+a.id?"Processing…":<><CheckCircle2 size={16}/> Approve artist</>}</button></div></article>)}</div>:data.tracks.length===0?<div className="sq-review-empty"><FileAudio/><b>No track submissions waiting</b><span>Verified artists' submissions will appear here after they upload all required files.</span></div>:<div className="sq-review-list">{data.tracks.map(t=><article className="sq-review-card" key={t.id}><div className="sq-review-card-head"><div className="sq-review-avatar track"><FileAudio/></div><div><h3>{t.title}</h3><p>{t.artistProfile.stageName} · {t.genre?.name||"Genre not set"}</p></div><span className="sq-review-pending"><Clock3 size={13}/> Pending</span></div><div className="sq-review-details"><div><small>CATALOGUE</small><b>{t.type==="EXCLUSIVE"?"Exclusive / unreleased":"Released music"}</b></div><div><small>UPLOADED BY</small><b>{t.uploader.name||t.uploader.email}</b></div><div><small>SUBMITTED</small><b>{new Date(t.createdAt).toLocaleDateString()}</b></div></div><div className="sq-review-evidence"><span><FileAudio size={16}/> Audio {t.audioObjectKey?"attached":"missing"}</span><span><ImageIcon size={16}/> Artwork {t.artworkUrl?"attached":"missing"}</span><span><FileCheck2 size={16}/> {t.rightsEvidence?.fileName||"Rights evidence missing"}</span></div><div className="sq-review-files">{t.audioObjectKey&&<a href={`/api/admin/tracks/${t.id}/assets/audio`} target="_blank" rel="noreferrer"><FileAudio size={15}/> Listen to submitted audio ↗</a>}{t.artworkUrl&&<a href={`/api/admin/tracks/${t.id}/assets/artwork`} target="_blank" rel="noreferrer"><ImageIcon size={15}/> View artwork ↗</a>}{t.rightsEvidence&&<a href={`/api/admin/tracks/${t.id}/assets/rights`}><FileCheck2 size={15}/> Open rights evidence ↓</a>}</div>{t.description&&<p className="sq-review-bio">{t.description}</p>}<label className="sq-review-note">Internal review note<textarea value={notes[t.id]||""} onChange={e=>setNotes(v=>({...v,[t.id]:e.target.value}))} placeholder="Optional rights verification note"/></label><div className="sq-review-actions"><button className="sq-review-reject" disabled={!!busy} onClick={()=>decide("track",t.id,"reject")}><XCircle size={16}/> Reject track</button><button className="sq-review-approve" disabled={!!busy} onClick={()=>decide("track",t.id,"approve")}>{busy==="track"+t.id?"Processing…":<><CheckCircle2 size={16}/> Approve release</>}</button></div></article>)}</div>}
    <div className="sq-review-foot"><ShieldCheck size={16}/> Decisions are recorded in the SQUADREC audit log. Approved music becomes eligible for the relevant catalogue.</div>
  </div>;
}
