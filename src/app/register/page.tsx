"use client";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import styles from "./register.module.css";

const roles = { ARTIST:"Artist / Creator", RIGHTS_HOLDER:"Rightsholder", LABEL_PUBLISHER:"Label / Publisher" } as const;
type Role = keyof typeof roles;

export default function RegisterPage(){
 const [role,setRole]=useState<Role>("ARTIST");
 const [name,setName]=useState("");const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [confirm,setConfirm]=useState("");
 const [showPassword,setShowPassword]=useState(false);const [showConfirm,setShowConfirm]=useState(false);const [accepted,setAccepted]=useState(false);
 const [error,setError]=useState("");const [loading,setLoading]=useState(false);
 useEffect(()=>{const value=new URLSearchParams(window.location.search).get("type");if(value&&value in roles)setRole(value as Role);else window.location.replace("/register/account-type");},[]);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setError("");
  if(password!==confirm){setError("Your passwords do not match.");return;}
  if(!accepted){setError("Please agree to the Terms of Service and Privacy Policy.");return;}
  setLoading(true);
  try{
   const response=await fetch("/api/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,email,password,role})});
   const data=await response.json();if(!response.ok)throw new Error(data.error||"Registration failed.");
   window.location.href="/verify-email?email="+encodeURIComponent(data.email);
  }catch(e){setError(e instanceof Error?e.message:"Something went wrong. Please try again.");setLoading(false);}
 }
 return <main className={styles.page}>
  <header className={styles.top}><Link href="/register/account-type"><ArrowLeft size={20}/></Link><Link href="/onboarding" className={styles.brand}><span>▶▶</span> SQUADREC<sup>®</sup></Link><span/></header>
  <section className={styles.card}>
   <div className={styles.logo}>▶▶</div><div className={styles.brandName}>SQUADREC<sup>®</sup></div>
   <div className={styles.step}>STEP 02 · {roles[role].toUpperCase()}</div>
   <h1>Create your<br/><em>account.</em></h1><p>It only takes a minute. You're creating a {roles[role].toLowerCase()} account.</p>
   <form onSubmit={submit}>
    <label>Full name<input autoComplete="name" required minLength={2} maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name"/></label>
    <label>Email address<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
    <label>Password<div className={styles.password}><input type={showPassword?"text":"password"} autoComplete="new-password" required minLength={10} maxLength={72} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 10 characters"/><button type="button" onClick={()=>setShowPassword(!showPassword)} aria-label={showPassword?"Hide password":"Show password"}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>
    <label>Confirm password<div className={styles.password}><input type={showConfirm?"text":"password"} autoComplete="new-password" required minLength={10} maxLength={72} value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Enter your password again"/><button type="button" onClick={()=>setShowConfirm(!showConfirm)} aria-label={showConfirm?"Hide password":"Show password"}>{showConfirm?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>
    <label className={styles.terms}><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/><span>I agree to the <a href="/terms" target="_blank">Terms of Service</a> and <a href="/privacy" target="_blank">Privacy Policy</a>.</span></label>
    {error&&<div className={styles.error} role="alert">{error}</div>}
    <button className={styles.submit} disabled={loading}>{loading?"Creating account...":"Create account"} <ArrowRight size={17}/></button>
   </form>
   <div className={styles.switch}>Already have an account? <Link href="/sign-in">Sign in</Link></div>
   <div className={styles.safe}><ShieldCheck size={15}/> Your password is encrypted. Email verification is required.</div>
  </section>
 </main>
}
