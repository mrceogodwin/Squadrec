"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { ArrowRight, Disc3, ShieldCheck } from "lucide-react";

export default function RegisterPage() {
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);

  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      const response=await fetch("/api/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,email,password})});
      const data=await response.json();
      if(!response.ok) {setError(data.error||"Registration failed.");setLoading(false);return;}
      const result=await signIn("credentials",{email,password,redirect:false,callbackUrl:"/"});
      if(result?.error) {setError("Account created. Please sign in.");setLoading(false);return;}
      window.location.href=result?.url||"/";
    } catch {setError("Something went wrong. Please try again.");setLoading(false);}
  }

  return <main className="auth-screen"><div className="auth-glow"/><Link className="auth-brand" href="/"><span className="brand-symbol">SR</span><span>SQUADREC<small>THE SOUND. THE CULTURE.</small></span></Link><section className="auth-card"><div className="auth-icon"><Disc3 size={23}/></div><span className="eyebrow">YOUR NEXT CHAPTER</span><h1>Make room for<br/><em>great sound.</em></h1><p>Create your listener account. Artist and industry access can be requested after registration.</p><form onSubmit={submit}><label>Your name<input autoComplete="name" required minLength={2} maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name"/></label><label>Email address<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label>Password<input type="password" autoComplete="new-password" required minLength={10} maxLength={72} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 10 characters"/></label>{error&&<div className="auth-error">{error}</div>}<button className="primary-action auth-submit" disabled={loading}>{loading?"Creating account...":"Create account"}<ArrowRight size={15}/></button></form><div className="auth-switch">Already have an account? <Link href="/sign-in">Sign in</Link></div><div className="auth-safe"><ShieldCheck size={14}/> Your account and music collection stay yours.</div></section><Link className="auth-back" href="/">← Back to discovery</Link></main>;
}
