"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Check, Layers3, Music2, ShieldCheck } from "lucide-react";
import styles from "./account-type.module.css";

const choices = [
  { id:"ARTIST", title:"Artist / Creator", description:"Release your music, track earnings and grow your fanbase.", detail:"Artist Studio", icon:Music2 },
  { id:"RIGHTS_HOLDER", title:"Rightsholder", description:"Manage, license and monetise music rights you own or represent.", detail:"Rights workspace", icon:Layers3 },
  { id:"LABEL_PUBLISHER", title:"Label / Publisher", description:"Manage artist rosters, distribute music and explore acquisition opportunities.", detail:"Industry workspace", icon:Building2 },
] as const;

export default function AccountTypePage(){
 const [selected,setSelected]=useState<(typeof choices)[number]["id"]>("ARTIST");
 return <main className={styles.page}>
  <header className={styles.top}><Link href="/onboarding" aria-label="Back to home"><ArrowLeft size={20}/></Link><Link href="/onboarding" className={styles.brand}><img className={styles.mark} src="/squadrec-purple-mark.svg" alt="" /> SQUADREC<sup>®</sup></Link><span/></header>
  <section className={styles.content}>
   <div className={styles.progress}><span/><i/><i/><i/></div>
   <div className={styles.heading}><span>STEP 01 · ACCOUNT SETUP</span><h1>Choose your<br/><em>account type.</em></h1><p>Choose the account that best describes how you work with music. Your workspace and permissions will be tailored to your role.</p></div>
   <div className={styles.options}>{choices.map(({id,title,description,detail,icon:Icon})=><button type="button" key={id} onClick={()=>setSelected(id)} className={selected===id?styles.optionSelected:styles.option}>
    <span className={styles.optionIcon}><Icon size={22}/></span><span className={styles.optionCopy}><b>{title}</b><small>{description}</small><em>{detail}</em></span><span className={styles.radio}>{selected===id&&<Check size={13}/>}</span>
   </button>)}</div>
   <div className={styles.notice}><ShieldCheck size={17}/><span>Account type determines your initial workspace. Sensitive rights and catalogue actions may still require additional verification and approval.</span></div>
   <Link className={styles.continue} href={`/register?type=${selected}`}>Continue <ArrowRight size={17}/></Link>
   <div className={styles.signin}>Already have an account? <Link href="/sign-in">Sign in</Link></div>
  </section>
 </main>
}
