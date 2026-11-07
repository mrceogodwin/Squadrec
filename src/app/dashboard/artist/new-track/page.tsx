"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Disc3, ShieldCheck, UploadCloud, FileAudio, Image as ImageIcon, FileCheck2 } from "lucide-react";

type Genre = { id: string; name: string };
const MAX_BYTES = 4 * 1024 * 1024;

export default function NewTrackPage() {
  const router = useRouter();
  const [genres,setGenres]=useState<Genre[]>([]);
  const [title,setTitle]=useState("");
  const [description,setDescription]=useState("");
  const [genreId,setGenreId]=useState("");
  const [type,setType]=useState<"RELEASED"|"EXCLUSIVE">("RELEASED");
  const [price,setPrice]=useState("");
  const [audio,setAudio]=useState<File|null>(null);
  const [preview,setPreview]=useState<File|null>(null);
  const [artwork,setArtwork]=useState<File|null>(null);
  const [rights,setRights]=useState<File|null>(null);
  const [message,setMessage]=useState("");
  const [loading,setLoading]=useState(false);
  const [step,setStep]=useState("Ready when you are");
  useEffect(()=>{fetch("/api/genres").then(r=>r.ok?r.json():{genres:[]}).then(d=>setGenres(d.genres||[])).catch(()=>setGenres([]));},[]);

  function validFile(file: File | null, label: string) {
    if (!file) return `Choose your ${label} file.`;
    if (file.size > MAX_BYTES) return `${label} must be 4 MB or smaller.`;
    return "";
  }

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const fileError = validFile(audio,"audio") || (type==="EXCLUSIVE" ? validFile(preview,"Exclusive preview clip") : "") || validFile(artwork,"cover artwork") || validFile(rights,"rights evidence");
    if (fileError) { setMessage(fileError); return; }
    setLoading(true);setMessage("");
    let draftId = "";
    try {
      setStep("Creating your private track draft…");
      const draftResponse=await fetch("/api/artist/tracks",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title,description,genreId:genreId||undefined,type,priceMinor:price?Math.round(Number(price)*100):undefined})});
      const draftData=await draftResponse.json();
      if(!draftResponse.ok) throw new Error(draftData.error||"Unable to create track draft.");
      draftId=draftData.track.id;

      setStep("Uploading audio, artwork and rights evidence securely…");
      const uploadItems: Array<["audio"|"preview"|"artwork"|"rights",File]> = [["audio",audio!], ...(type==="EXCLUSIVE" ? [["preview",preview!] as ["preview",File]] : []), ["artwork",artwork!], ["rights",rights!]];
      for (const [kind,file] of uploadItems) {
        setStep(`Uploading ${kind} securely…`);
        const form = new FormData();
        form.append(kind,file);
        const assetResponse=await fetch(`/api/artist/tracks/${draftId}/assets`,{method:"POST",body:form});
        const assetData=await assetResponse.json();
        if(!assetResponse.ok) throw new Error(assetData.error||`Unable to upload ${kind}. Your draft has been saved; retry the upload.`);
      }

      setStep("Submitting your track for review…");
      const submitResponse=await fetch(`/api/artist/tracks/${draftId}/submit`,{method:"POST"});
      const submitData=await submitResponse.json();
      if(!submitResponse.ok) throw new Error(submitData.error||"Files uploaded, but submission could not be completed.");
      router.push("/dashboard/artist?submitted=1");
    } catch(error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong. Your draft may have been saved.");
      setLoading(false);
      setStep(draftId ? "Draft saved — upload or submission needs attention" : "Ready when you are");
    }
  }

  return <main className="artist-dashboard">
    <header className="artist-top"><Link href="/dashboard/artist" className="artist-back"><ArrowLeft size={16}/> Artist Studio</Link><div className="artist-top-brand"><span className="brand-symbol">SR</span> SQUADREC <span>ARTIST STUDIO</span></div></header>
    <div className="artist-wrap artist-new-wrap">
      <div className="artist-heading"><div><span className="eyebrow">CATALOGUE SUBMISSION</span><h1>Upload your<br/><em>music.</em></h1><p>Submit the audio, cover artwork and rights evidence together. Every submission stays private until our review team approves it.</p></div><div className="artist-heading-mark"><Disc3 size={40}/></div></div>
      <form className="artist-panel new-track-form" onSubmit={submit}>
        <div className="artist-panel-title"><div><span className="eyebrow">STEP 01 · TRACK DETAILS</span><h2>Release information</h2><p>Tell us about the recording you are submitting.</p></div><Disc3 size={22}/></div>
        <label>Track title<input required maxLength={160} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Enter track title"/></label>
        <label>Genre<select value={genreId} onChange={e=>setGenreId(e.target.value)}><option value="">Select a genre</option>{genres.map(g=><option value={g.id} key={g.id}>{g.name}</option>)}</select></label>
        <label>Catalogue type<select value={type} onChange={e=>setType(e.target.value as "RELEASED"|"EXCLUSIVE")}><option value="RELEASED">Released music · Music Store</option><option value="EXCLUSIVE">Unreleased music · Exclusive Catalogue</option></select></label>
        <label>Store price (USD)<input type="number" min="0.01" step="0.01" value={price} onChange={e=>setPrice(e.target.value)} placeholder="Optional for released music" disabled={type==="EXCLUSIVE"}/></label>
        <label className="full">Description<textarea rows={3} maxLength={2000} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Credits, release notes or a short description…"/></label>

        <div className="artist-upload-section full"><span className="eyebrow">STEP 02 · REQUIRED FILES</span><h2>Attach your music and documents</h2><p>Files are stored in private SQUADREC storage. Each file is currently limited to 4 MB. Exclusive tracks require a separate preview clip. Please keep the clip to the intended 10-second preview length; the platform does not yet trim or verify duration automatically.</p>
          <label className="artist-file-field"><span className="artist-file-icon"><FileAudio/></span><span><b>Audio master</b><small>MP3, WAV, M4A, AAC, FLAC, OGG · max 4 MB</small><strong>{audio ? audio.name : "Choose audio file"}</strong></span><input required type="file" accept=".mp3,.wav,.m4a,.aac,.flac,.ogg,.webm,audio/*" onChange={e=>setAudio(e.target.files?.[0]||null)}/><UploadCloud size={18}/></label>
          {type==="EXCLUSIVE" && <label className="artist-file-field"><span className="artist-file-icon"><FileAudio/></span><span><b>10-second preview clip</b><small>Separate preview clip · target 10 seconds · max 4 MB</small><strong>{preview ? preview.name : "Choose preview clip"}</strong></span><input required type="file" accept=".mp3,.wav,.m4a,.aac,.flac,.ogg,.webm,audio/*" onChange={e=>setPreview(e.target.files?.[0]||null)}/><UploadCloud size={18}/></label>}
          <label className="artist-file-field"><span className="artist-file-icon"><ImageIcon/></span><span><b>Cover artwork</b><small>JPG, PNG, WEBP · max 4 MB</small><strong>{artwork ? artwork.name : "Choose artwork"}</strong></span><input required type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={e=>setArtwork(e.target.files?.[0]||null)}/><UploadCloud size={18}/></label>
          <label className="artist-file-field"><span className="artist-file-icon"><FileCheck2/></span><span><b>Rights evidence</b><small>Signed rights declaration, agreement or proof · PDF/JPG/PNG · max 4 MB</small><strong>{rights ? rights.name : "Choose rights document"}</strong></span><input required type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={e=>setRights(e.target.files?.[0]||null)}/><UploadCloud size={18}/></label>
        </div>
        <div className="artist-locked full"><ShieldCheck size={18}/><div><b>Private until approved</b><span>Uploading does not publish your recording. SQUADREC reviews ownership evidence, artist authorisation and track metadata before catalogue access is granted.</span></div></div>
        {message&&<p className="artist-form-error full">{message}</p>}
        <div className="artist-upload-status full">{loading?<><span className="artist-upload-spinner"/> {step}</>:step}</div>
        <button className="artist-submit" disabled={loading}>{loading?"Processing submission…":"Upload & submit for review"} <span>→</span></button>
      </form>
    </div>
  </main>;
}
