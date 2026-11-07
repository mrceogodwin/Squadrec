"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";

export default function ArtistApplicationForm() {
  const router=useRouter();
  const [stageName,setStageName]=useState("");
  const [country,setCountry]=useState("");
  const [website,setWebsite]=useState("");
  const [biography,setBiography]=useState("");
  const [confirmsRights,setConfirmsRights]=useState(false);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setError("");setLoading(true);
    try{
      const response=await fetch("/api/artist/apply",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({stageName,country,website,biography,confirmsRights})});
      const data=await response.json();
      if(!response.ok){setError(data.error||"Unable to submit your application.");setLoading(false);return;}
      router.refresh();
    }catch{setError("Something went wrong. Please try again.");setLoading(false);}
  }
  return <form className="artist-application" onSubmit={submit}>
    <label>Artist / stage name<input value={stageName} onChange={e=>setStageName(e.target.value)} placeholder="e.g. Your artist name" required minLength={2}/></label>
    <label>Country<input value={country} onChange={e=>setCountry(e.target.value)} placeholder="Country of residence"/></label>
    <label>Website or official profile<input value={website} onChange={e=>setWebsite(e.target.value)} type="url" placeholder="https://"/></label>
    <label className="full">Short artist biography<textarea value={biography} onChange={e=>setBiography(e.target.value)} rows={3} placeholder="Tell us about your sound, releases and career..."/></label>
    <label className="rights-check full"><input type="checkbox" checked={confirmsRights} onChange={e=>setConfirmsRights(e.target.checked)} required/><span>I confirm that I am the artist or have authority to represent the artist, and that I will only submit music for which the necessary rights and permissions are documented.</span></label>
    {error&&<p className="artist-form-error full">{error}</p>}
    <button className="artist-submit" type="submit" disabled={loading||!confirmsRights}>{loading?"Submitting application...":"Submit artist application"} <span>→</span></button>
    <p className="artist-form-note full"><ShieldCheck size={13}/> Artist access remains locked until identity and rights verification are completed.</p>
  </form>;
}
