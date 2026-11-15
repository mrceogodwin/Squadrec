"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, Disc3, FileAudio,
  FileCheck2, Image as ImageIcon, LockKeyhole, ShieldCheck, UploadCloud
} from "lucide-react";

type Genre = { id: string; name: string };
type Step = 1 | 2 | 3 | 4;
const MAX_BYTES = 4 * 1024 * 1024;
const STEPS = [
  { number: 1, title: "Details", subtitle: "Release information" },
  { number: 2, title: "Media", subtitle: "Audio and artwork" },
  { number: 3, title: "Rights", subtitle: "Ownership evidence" },
  { number: 4, title: "Review", subtitle: "Confirm submission" },
];

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
  const [rightsConfirmed,setRightsConfirmed]=useState(false);
  const [currentStep,setCurrentStep]=useState<Step>(1);
  const [message,setMessage]=useState("");
  const [loading,setLoading]=useState(false);
  const [progressText,setProgressText]=useState("");
  const [draftId,setDraftId]=useState("");

  useEffect(()=>{
    fetch("/api/genres").then(r=>r.ok?r.json():{genres:[]})
      .then(d=>setGenres(d.genres||[])).catch(()=>setGenres([]));
  },[]);

  function validateFile(file: File|null,label: string,extensions: string[]) {
    if(!file)return `Choose your ${label} file.`;
    if(file.size>MAX_BYTES)return `${label} must be 4 MB or smaller.`;
    const ext=file.name.split(".").pop()?.toLowerCase()||"";
    if(!extensions.includes(ext))return `Unsupported ${label} format. Use ${extensions.join(", ").toUpperCase()}.`;
    return "";
  }

  function nextStep(){
    setMessage("");
    if(currentStep===1){
      if(title.trim().length<1){setMessage("Enter a track title to continue.");return;}
      if(price&&(!Number.isFinite(Number(price))||Number(price)<=0)){setMessage("Enter a valid store price or leave it blank.");return;}
    }
    if(currentStep===2){
      const error=validateFile(audio,"audio master",["mp3","wav","m4a","aac","flac","ogg","webm"])
        ||validateFile(artwork,"cover artwork",["jpg","jpeg","png","webp"])
        ||(type==="EXCLUSIVE"?validateFile(preview,"exclusive preview",["mp3","wav","m4a","aac","flac","ogg","webm"]):"");
      if(error){setMessage(error);return;}
    }
    if(currentStep===3){
      const error=validateFile(rights,"rights evidence",["pdf","jpg","jpeg","png"]);
      if(error){setMessage(error);return;}
      if(!rightsConfirmed){setMessage("Confirm that you have the rights or authority to submit this music.");return;}
    }
    setCurrentStep((currentStep+1) as Step);
  }

  function previousStep(){
    setMessage("");
    setCurrentStep((currentStep-1) as Step);
  }

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(currentStep!==4||!rightsConfirmed)return;
    setLoading(true);setMessage("");
    let activeDraftId=draftId;
    try{
      if(!activeDraftId){
        setProgressText("Creating your private track draft…");
        const draftResponse=await fetch("/api/artist/tracks",{
          method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({title:title.trim(),description,genreId:genreId||undefined,type,priceMinor:price?Math.round(Number(price)*100):undefined})
        });
        const draftData=await draftResponse.json();
        if(!draftResponse.ok)throw new Error(draftData.error||"Unable to create track draft.");
        activeDraftId=draftData.track.id;
        setDraftId(activeDraftId);
      }

      const uploadItems:Array<["audio"|"preview"|"artwork"|"rights",File]>=[
        ["audio",audio!],...(type==="EXCLUSIVE"?[["preview",preview!] as ["preview",File]]:[]),
        ["artwork",artwork!],["rights",rights!]
      ];
      for(const [kind,file] of uploadItems){
        setProgressText(`Uploading ${kind==="artwork"?"cover artwork":kind==="rights"?"rights evidence":kind} securely…`);
        const form=new FormData();form.append(kind,file);
        const response=await fetch(`/api/artist/tracks/${activeDraftId}/assets`,{method:"POST",body:form});
        const data=await response.json();
        if(!response.ok)throw new Error(data.error||`Unable to upload ${kind}. Your draft is saved; you can retry.`);
      }

      setProgressText("Submitting your release for SQUADREC review…");
      const submitResponse=await fetch(`/api/artist/tracks/${activeDraftId}/submit`,{method:"POST"});
      const submitData=await submitResponse.json();
      if(!submitResponse.ok)throw new Error(submitData.error||"Your files uploaded, but the submission could not be completed.");
      router.push("/dashboard/artist?submitted=1");
    }catch(error){
      setMessage(error instanceof Error?error.message:"Something went wrong. Your draft has been saved where possible.");
      setLoading(false);
      setProgressText(activeDraftId?"Your draft is saved. Return to Review and retry submission.":"Ready when you are");
    }
  }

  const genreName=genres.find(g=>g.id===genreId)?.name||"Not selected";
  const fileRows=[
    {label:"Audio master",file:audio},
    ...(type==="EXCLUSIVE"?[{label:"Exclusive preview",file:preview}]:[]),
    {label:"Cover artwork",file:artwork},
    {label:"Rights evidence",file:rights},
  ];

  return <main className="artist-dashboard sq-artist-home sq-upload-page">
    <header className="artist-top sq-artist-top">
      <Link href="/dashboard/artist" className="artist-back"><ArrowLeft size={16}/> Artist Studio</Link>
      <Link href="/dashboard/artist" className="artist-top-brand"><span className="brand-symbol">SR</span> SQUADREC <span>NEW RELEASE</span></Link>
      <span className="sq-upload-secure"><LockKeyhole size={14}/> PRIVATE</span>
    </header>

    <div className="artist-wrap sq-upload-wrap">
      <div className="sq-upload-heading">
        <span className="eyebrow"><Disc3 size={13}/> ARTIST STUDIO · CATALOGUE</span>
        <h1>Let's get your music<br/><em>ready for review.</em></h1>
        <p>Four simple steps. Your release stays private while our team checks the music and rights information.</p>
      </div>

      <div className="sq-upload-stepper" aria-label={`Step ${currentStep} of 4`}>
        {STEPS.map((item,index)=><div className={currentStep===item.number?"sq-upload-step active":currentStep>item.number?"sq-upload-step complete":"sq-upload-step"} key={item.number}>
          <span className="sq-upload-step-number">{currentStep>item.number?<Check size={14}/>:item.number}</span>
          <span className="sq-upload-step-copy"><b>{item.title}</b><small>{item.subtitle}</small></span>
          {index<3&&<i className="sq-upload-step-line"/>}
        </div>)}
      </div>

      <form className="artist-panel sq-upload-card" onSubmit={submit}>
        {currentStep===1&&<section className="sq-upload-panel">
          <div className="sq-upload-panel-head"><span>STEP 01 / 04</span><h2>Release information</h2><p>Start with the basics. You can review everything before submitting.</p></div>
          <label>Track title<input required maxLength={160} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Enter your track title"/></label>
          <label>Genre<select value={genreId} onChange={e=>setGenreId(e.target.value)}><option value="">Select a genre</option>{genres.map(g=><option value={g.id} key={g.id}>{g.name}</option>)}</select></label>
          <label>Where should this release appear?<select value={type} onChange={e=>{setType(e.target.value as "RELEASED"|"EXCLUSIVE");setPrice("");setPreview(null);}}><option value="RELEASED">Music Store · Released music</option><option value="EXCLUSIVE">Exclusive Catalogue · Unreleased music</option></select></label>
          {type==="RELEASED"&&<label>Store price (USD) · optional<input type="number" min="0.01" step="0.01" value={price} onChange={e=>setPrice(e.target.value)} placeholder="Enter price or leave blank"/></label>}
          <label className="full">Release notes / description<textarea rows={4} maxLength={2000} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Credits, collaborators, release notes or a short description…"/></label>
          <div className="sq-upload-hint"><ShieldCheck size={16}/><span>Choose the correct catalogue type. Exclusive music is only available through verified industry access.</span></div>
        </section>}

        {currentStep===2&&<section className="sq-upload-panel">
          <div className="sq-upload-panel-head"><span>STEP 02 / 04</span><h2>Add your music and artwork</h2><p>Upload the master recording and the artwork listeners will see in the catalogue.</p></div>
          <FilePicker label="Audio master" description="MP3, WAV, M4A, AAC, FLAC or OGG · max 4 MB" icon="audio" file={audio} onChange={setAudio} accept=".mp3,.wav,.m4a,.aac,.flac,.ogg,.webm,audio/*"/>
          {type==="EXCLUSIVE"&&<FilePicker label="10-second preview clip" description="Separate preview audio · exactly 10 seconds (±0.15s) · max 4 MB" icon="audio" file={preview} onChange={setPreview} accept=".mp3,.wav,.m4a,.aac,.flac,.ogg,.webm,audio/*"/>}
          <FilePicker label="Cover artwork" description="JPG, PNG or WEBP · max 4 MB" icon="image" file={artwork} onChange={setArtwork} accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"/>
          {type==="EXCLUSIVE"&&<div className="sq-upload-hint"><Disc3 size={16}/><span>The exclusive preview must be prepared as a separate 10-second clip. SQUADREC validates the duration but does not trim audio for you.</span></div>}
        </section>}

        {currentStep===3&&<section className="sq-upload-panel">
          <div className="sq-upload-panel-head"><span>STEP 03 / 04</span><h2>Prove your rights</h2><p>Provide a document that supports your ownership or authority to submit this recording.</p></div>
          <FilePicker label="Rights evidence" description="Signed rights declaration, agreement or proof · PDF, JPG or PNG · max 4 MB" icon="document" file={rights} onChange={setRights} accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"/>
          <label className="sq-upload-rights-check"><input type="checkbox" checked={rightsConfirmed} onChange={e=>setRightsConfirmed(e.target.checked)}/><span><b>Rights and authorisation confirmation</b><small>I confirm that I own this recording or have the necessary authority and permissions to submit it to SQUADREC for review and the catalogue use I have selected.</small></span></label>
          <div className="sq-upload-hint"><LockKeyhole size={16}/><span>Your rights evidence is stored privately. It is not displayed publicly with your release.</span></div>
        </section>}

        {currentStep===4&&<section className="sq-upload-panel">
          <div className="sq-upload-panel-head"><span>STEP 04 / 04</span><h2>Review your submission</h2><p>Check the details and attached files before sending your release to our review team.</p></div>
          <div className="sq-upload-summary">
            <div><small>TRACK TITLE</small><b>{title}</b></div>
            <div><small>CATALOGUE</small><b>{type==="EXCLUSIVE"?"Exclusive Catalogue":"Music Store"}</b></div>
            <div><small>GENRE</small><b>{genreName}</b></div>
            {type==="RELEASED"&&price&&<div><small>STORE PRICE</small><b>USD {Number(price).toFixed(2)}</b></div>}
            {description&&<div className="wide"><small>RELEASE NOTES</small><p>{description}</p></div>}
          </div>
          <div className="sq-upload-file-summary"><h3>Attached files</h3>{fileRows.map(row=><div key={row.label}><span><CheckCircle2 size={16}/>{row.label}</span><b>{row.file?.name||"Not attached"}</b></div>)}</div>
          <div className="sq-upload-hint"><ShieldCheck size={16}/><span>Submitting sends your release for review. It will not appear in the public catalogue until approved.</span></div>
          {draftId&&<div className="sq-upload-hint"><FileCheck2 size={16}/><span>Your private draft has already been created. Retrying will continue with that draft.</span></div>}
        </section>}

        {message&&<div className="sq-upload-error" role="alert">{message}</div>}
        {loading&&<div className="sq-upload-progress"><span className="sq-upload-spinner"/>{progressText}</div>}
        <div className="sq-upload-actions">
          {currentStep>1&&!loading&&<button type="button" className="sq-upload-back" onClick={previousStep}><ArrowLeft size={16}/> Back</button>}
          {currentStep<4?<button type="button" className="sq-upload-next" onClick={nextStep}>Continue <ArrowRight size={16}/></button>:<button type="submit" className="sq-upload-next" disabled={loading||!rightsConfirmed}>{loading?"Submitting…":"Submit for review"} <ArrowRight size={16}/></button>}
        </div>
        <div className="sq-upload-footer"><LockKeyhole size={13}/> Secure submission · Private until approved</div>
      </form>
    </div>
  </main>;
}

function FilePicker({label,description,icon,file,onChange,accept}:{label:string;description:string;icon:"audio"|"image"|"document";file:File|null;onChange:(file:File|null)=>void;accept:string}){
  const Icon=icon==="audio"?FileAudio:icon==="image"?ImageIcon:FileCheck2;
  return <label className="sq-upload-file-picker">
    <span className="sq-upload-file-icon"><Icon size={20}/></span>
    <span className="sq-upload-file-copy"><b>{label}</b><small>{description}</small><strong>{file?file.name:"Choose file to upload"}</strong></span>
    <span className="sq-upload-file-action"><UploadCloud size={17}/>{file?"Change":"Browse"}</span>
    <input type="file" accept={accept} onChange={e=>onChange(e.target.files?.[0]||null)}/>
  </label>;
}
