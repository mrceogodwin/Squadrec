"use client";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight, Mail, ShieldCheck } from "lucide-react";
import styles from "./password-reset.module.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage(""); setBusy(true);
    try {
      const response = await fetch("/api/password-reset/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to request a reset link.");
      setMessage(data.message);
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong."); }
    finally { setBusy(false); }
  }
  return <main className={styles.page}>
    <Link href="/" className={styles.brand}><img src="/squadrec-purple-mark.svg" alt="" /><span>SQUADREC<sup>®</sup></span></Link>
    <section className={styles.card}>
      <div className={styles.icon}><Mail size={27}/></div>
      <span className={styles.eyebrow}>ACCOUNT RECOVERY</span>
      <h1>Forgot your<br/><em>password?</em></h1>
      <p>Enter the email address linked to your SQUADREC account. If it matches an active, verified account, we'll send you a secure reset link.</p>
      <form onSubmit={submit}>
        <label>Email address<input type="email" required maxLength={254} autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
        {error && <div className={styles.error} role="alert">{error}</div>}
        {message && <div className={styles.message} role="status">{message}</div>}
        <button disabled={busy}>{busy ? "Sending..." : "Send reset link"} <ArrowRight size={16}/></button>
      </form>
      <div className={styles.safe}><ShieldCheck size={15}/> Reset links expire after 30 minutes.</div>
      <Link className={styles.back} href="/sign-in">Back to sign in</Link>
    </section>
  </main>;
}
