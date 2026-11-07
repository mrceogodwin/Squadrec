"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Disc3, ShieldCheck } from "lucide-react";

type Genre = { id: string; name: string };

export default function NewTrackPage() {
  const router = useRouter();
  const [genres,setGenres]=useState<Genre[]>([]);
  const [title,setTitle]=useState("");
  const [description,setDescription]=useState("");
  const [genreId,setGenreId]=useState("");
  const [type,setType]=useState<"RELEASED"|"EXCLUSIVE">("RELEASED");
  const [price,setPrice]=useState("");
  const [message,setMessage]=useState("");
  const [loading,setLoading]=useState(false);
  useEffect(()=>{fetch("/api/genres").then(r=>r.ok?r.json():{genres:[]}).then(d=>setGenres(d.genres||[])).catch(()=>setGenres([]));},[]);
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setLoading(true);setMessage("");try{const r=await fetch("/api/artist/tracks",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title,description,genreId:genreId||undefined,type,priceMinor:price?Math.round(Number(price)*100):undefined})});const d=await r.json();if(!r.ok){setMessage(d.error||"Unable to create draft.");setLoading(false);return;}router.push("/dashboard/artist");}catch{setMessage("Something went wrong. Try again.");setLoading(false);}}
  return <main className="artist-dashboard"><header className="artist-top"><Link href="/dashboard/artist" className="artist-back"><ArrowLeft size={16}/> Artist Studio</Link><div className="artist-top-brand"><span className="brand-symbol">SR</span> SQUADREC <span>ARTIST STUDIO</span></div></header><div className="artist-wrap artist-new-wrap"><div className="artist-heading"><div><span className="eyebrow">CATALOGUE SUBMISSION</span><h1>Create a<br/><em>track draft.</em></h1><p>Start with the track details. Audio upload and rights evidence are required before review.</p></div><div className="artist-heading-mark"><Disc3 size={40}/></div></div><form className="artist-panel new-track-form" onSubmit={submit}><label>Track title<input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="Enter track title"/></label><label>Genre<select value={genreId} onChange={e=>setGenreId(e.target.value)}><option value="">Select a genre</option>{genres.map(g=><option value={g.id} key={g.id}>{g.name}</option>)}</select></label><label>Catalogue type<select value={type} onChange={e=>setType(e.target.value as "RELEASED"|"EXCLUSIVE")}><option value="RELEASED">Released music · Music Store</option><option value="EXCLUSIVE">Unreleased music · Exclusive Catalogue</option></select></label><label>Store price (USD)<input type="number" min="0.01" step="0.01" value={price} onChange={e=>setPrice(e.target.value)} placeholder="e.g. 1.99" disabled={type==="EXCLUSIVE"}/></label><label className="full">Description<textarea rows={4} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Add release notes, credits or a short description..."/></label><div className="artist-locked full"><ShieldCheck size={18}/><div><b>Rights evidence and audio file required</b><span>This creates a private draft only. It does not publish music or grant public access. Secure audio storage, rights document upload and review workflow are next.</span></div></div>{message&&<p className="artist-form-error full">{message}</p>}<button className="artist-submit" disabled={loading}>{loading?"Creating draft...":"Save track draft"} <span>→</span></button></form></div></main>;
}
