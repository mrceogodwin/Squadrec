"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Building2, Music2, Headphones, ShieldCheck } from "lucide-react";

const types = [
  {id:"artist",title:"Artist / Creator",desc:"Release music, manage your catalogue and receive acquisition offers.",icon:Music2},
  {id:"industry",title:"Industry Buyer",desc:"Discover exclusive music and submit acquisition offers. Verification is required.",icon:Building2},
  {id:"listener",title:"Listener",desc:"Discover released music, build playlists and grow your library.",icon:Headphones},
] as const;

export default function GetStartedPage(){
 const [selected,setSelected]=useState<"artist"|"industry"|"listener">("artist");
 const active=types.find(t=>t.id===selected)!;
 return <main className="sq-onboard">
  <header><Link href="/" aria-label="Back to home"><ArrowLeft/></Link><Link href="/" className="sq-onboard-brand"><img src="/squadrec-mark.svg" alt=""/> <b>SQUADREC<span>®</span></b></Link></header>
  <section className="sq-onboard-content">
   <span className="sq-onboard-kicker">GET STARTED WITH SQUADREC</span>
   <h1>Choose your<br/><em>account type.</em></h1>
   <p className="sq-onboard-intro">Choose how you want to use SQUADREC. You can request additional access later.</p>
   <div className="sq-account-options">{types.map(item=>{const Icon=item.icon;return <button type="button" key={item.id} onClick={()=>setSelected(item.id)} className={selected===item.id?"sq-account-option selected":"sq-account-option"} aria-pressed={selected===item.id}><span className="sq-account-icon"><Icon/></span><span className="sq-account-copy"><b>{item.title}</b><small>{item.desc}</small></span><i className="sq-account-radio"/></button>})}</div>
   {selected==="industry"&&<div className="sq-onboard-note"><ShieldCheck/> <span>Industry access is not automatic. Your professional credentials must be reviewed before you can enter the Exclusive Vault.</span></div>}
   {selected==="artist"&&<div className="sq-onboard-note"><ShieldCheck/> <span>Artist uploads are enabled only after your artist profile and rights information are approved.</span></div>}
   <Link className="sq-onboard-continue" href={`/register?type=${selected}`}>Continue <ArrowRight/></Link>
   <div className="sq-onboard-signin">Already have an account? <Link href="/sign-in">Sign in</Link></div>
  </section>
 </main>;
}
