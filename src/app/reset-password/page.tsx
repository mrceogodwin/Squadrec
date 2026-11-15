"use client";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import styles from "../forgot-password/password-reset.module.css";

export default function ResetPasswordPage() {
  const [token,setToken] = useState("");
  const [password,setPassword] = useState("");
  const [confirm,setConfirm] = useState("");
  const [show,setShow] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [success,setSuccess] = useState(false);
  useEffect(()=>{setToken(new URLSearchParams(window.location.search).get("token") || "");},[]);
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setError("");
    if(password!==confirm){setError("Your passwords do not match.");return;}
    setBusy(true);
    try {
      const response=await fetch("/api/password-reset/complete",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,password})});
      const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to reset your password.");
      setSuccess(true);
    } catch(e){setError(e instanceof Error?e.message:"Something went wrong.");}
    finally{setBusy(false);}
  }
  return <main className={styles.page}>
    <Link href="/" className={styles.brand}><img src="/squadrec-mark.svg" alt=""/><span>SQUADREC<sup>®</sup></span></Link>
    <section className={styles.card}>
      <div className={styles.icon}><ShieldCheck size={27}/></div>
      <span className={styles.eyebrow}>SECURE ACCOUNT ACCESS</span>
      <h1>{success?"Password updated.":"Create a new password."}</h1>
      <p>{success?"Your SQUADREC password has been changed. Sign in with your new password.":"Choose a new password with at least 10 characters. This reset link can only be used once."}</p>
      {!success && <form onSubmit={submit}>
        <label>New password<div className={styles.password}><input type={show?"text":"password"} minLength={10} maxLength={72} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 10 characters"/><button type="button" onClick={()=>setShow(!show)} aria-label="Toggle password visibility">{show?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>
        <label>Confirm new password<input type="password" minLength={10} maxLength={72} required value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Enter it again"/></label>
        {error&&<div className={styles.error} role="alert">{error}</div>}
        <button disabled={busy||!token}>{busy?"Updating...":"Update password"} <ArrowRight size={16}/></button>
      </form>}
      {success&&<Link className={styles.action} href="/sign-in">Continue to sign in <ArrowRight size={16}/></Link>}
      {!token&&!success&&<div className={styles.error}>This reset link is missing or invalid. Request a new one from the sign-in page.</div>}
      <Link className={styles.back} href="/sign-in">Back to sign in</Link>
    </section>
  </main>;
}
