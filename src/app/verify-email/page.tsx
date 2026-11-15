"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Mail, RefreshCw, ShieldCheck } from "lucide-react";
import styles from "./verify-email.module.css";

export default function VerifyEmailPage(){
 const [email,setEmail]=useState("");const [status,setStatus]=useState("sent");const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
 useEffect(()=>{const params=new URLSearchParams(window.location.search);setEmail(params.get("email")||"");setStatus(params.get("status")||"sent");},[]);
 async function resend(){if(!email){setMessage("Enter the email address you used to register.");return;}setBusy(true);setMessage("");try{const r=await fetch("/api/verify-email/resend",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to resend the link.");setMessage(d.message||"If this address has an unverified account, a fresh link will be sent.");}catch(e){setMessage(e instanceof Error?e.message:"Unable to resend the link.");}finally{setBusy(false);}}
 const verified=status==="success";
 return <main className={styles.page}><Link href="/onboarding" className={styles.brand}><span>▶▶</span> SQUADREC<sup>®</sup></Link><section className={styles.card}>
  <div className={verified?styles.successIcon:styles.icon}>{verified?<CheckCircle2 size={35}/>:<Mail size={35}/>}</div>
  <span className={styles.step}>ACCOUNT SECURITY</span>
  <h1>{verified?"Email verified!":status==="expired"?"Your link has expired":"Verify your email."}</h1>
  <p>{verified?"Your email address is confirmed. You can now sign in to SQUADREC.":status==="expired"?"This verification link has expired. Request a fresh link below.":"We've sent a verification link to your inbox. Open the email and confirm your address to activate your account."}</p>
  {email&&<div className={styles.email}><Mail size={15}/>{email}</div>}
  {!verified&&<><label className={styles.emailInput}>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><button className={styles.primary} disabled={busy} onClick={resend}>{busy?"Sending...":"Resend verification link"} <RefreshCw size={15}/></button></>}
  {verified&&<Link className={styles.primary} href="/sign-in">Continue to sign in <ArrowRight size={16}/></Link>}
  {message&&<div className={styles.message} role="status">{message}</div>}
  <div className={styles.help}><ShieldCheck size={15}/> The verification link expires after 30 minutes. Check your spam folder if it doesn't arrive.</div>
  <Link className={styles.back} href="/sign-in">Back to sign in</Link>
 </section></main>
}
