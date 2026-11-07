"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { ArrowRight, Disc3, ShieldCheck } from "lucide-react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn("credentials", { email, password, redirect: false, callbackUrl: "/" });
    setLoading(false);
    if (result?.error) setError("We couldn't sign you in. Check your details and try again.");
    else window.location.href = result?.url || "/";
  }

  return <main className="auth-screen"><div className="auth-glow"/><Link className="auth-brand" href="/"><span className="brand-symbol">SR</span><span>SQUADREC<small>THE SOUND. THE CULTURE.</small></span></Link><section className="auth-card"><div className="auth-icon"><Disc3 size={23}/></div><span className="eyebrow">WELCOME BACK</span><h1>Come back to<br/><em>your sound.</em></h1><p>Sign in to your SQUADREC account and pick up where you left off.</p><form onSubmit={submit}><label>Email address<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Your password"/></label>{error&&<div className="auth-error">{error}</div>}<button className="primary-action auth-submit" disabled={loading}>{loading?"Signing in...":"Sign in"}<ArrowRight size={15}/></button></form><div className="auth-switch">New to SQUADREC? <Link href="/register">Create an account</Link></div><div className="auth-safe"><ShieldCheck size={14}/> Your account and music collection stay yours.</div></section><Link className="auth-back" href="/">← Back to discovery</Link></main>;
}
