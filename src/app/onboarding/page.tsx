"use client";

import Link from "next/link";
import { ArrowRight, AudioLines, ChevronRight, Menu, Music2, ShieldCheck, Layers3 } from "lucide-react";
import styles from "./onboarding.module.css";

function BrandMark() {\n  return <img src="/squadrec-purple-mark.svg" alt="" aria-hidden="true" className={styles.mark} />;\n}

const services = [
  { icon: Music2, title: "Release & distribute", copy: "Get your music ready for a wider audience." },
  { icon: Layers3, title: "Acquire music rights", copy: "Buy, license and explore exclusive catalogues." },
  { icon: ShieldCheck, title: "Manage ownership", copy: "Keep track of rights, agreements and revenue." },
];

export default function OnboardingHome() {
  return <main className={styles.page}>
    <header className={styles.header}>
      <Link href="/" className={styles.brand}><BrandMark/><span>SQUADREC<sup>®</sup></span></Link>
      <nav className={styles.desktopNav}><a href="#platform">Platform</a><a href="#services">What you can do</a><Link href="/sign-in">Sign in</Link></nav>
      <div className={styles.headerActions}><Link href="/register" className={styles.headerCta}>Get started <ArrowRight size={15}/></Link><button className={styles.menu} aria-label="Menu"><Menu size={20}/></button></div>
    </header>

    <section className={styles.hero} id="platform">
      <div className={styles.copy}>
        <div className={styles.eyebrow}><AudioLines size={13}/> MUSIC RIGHTS PLATFORM</div>
        <h1>Make music.<br/><span>Own the rights.</span></h1>
        <p>Release music, discover exclusive catalogues, and manage ownership from one place.</p>
        <div className={styles.actions}><Link href="/register" className={styles.primary}>Get started <ArrowRight size={17}/></Link><a href="#services" className={styles.secondary}>Explore platform</a></div>
        <div className={styles.trustLine}><span className={styles.trustDot}/> BUILT FOR ARTISTS, RIGHTSHOLDERS &amp; THE MUSIC INDUSTRY</div>
      </div>

      <div className={styles.visual} aria-label="Illustrative SQUADREC artist dashboard preview">
        <div className={styles.orbit}/>
        <div className={styles.phone}>
          <div className={styles.phoneTop}><span>9:41</span><span className={styles.dynamicIsland}/><span>•••</span></div>
          <div className={styles.phoneBrand}><BrandMark/><b>SQUADREC<sup>®</sup></b><span className={styles.avatar}>F</span></div>
          <div className={styles.greeting}>Welcome to your music space</div>
          <div className={styles.metricGrid}><div><Music2/><b>Releases</b><strong>—</strong></div><div><Layers3/><b>Rights</b><strong>—</strong></div><div><ShieldCheck/><b>Deals</b><strong>—</strong></div></div>
          <div className={styles.previewTitle}>Explore your workspace <span>›</span></div>
          <div className={styles.track}><div className={styles.coverOne}><AudioLines/></div><div><b>Your music catalogue</b><small>Releases and submissions</small></div><span>›</span></div>
          <div className={styles.track}><div className={styles.coverTwo}><Music2/></div><div><b>Exclusive opportunities</b><small>Rights and acquisition</small></div><span>›</span></div>
          <div className={styles.phoneNav}><span>⌂<small>Home</small></span><span>♫<small>Music</small></span><span>◇<small>Deals</small></span><span>•••<small>More</small></span></div>
        </div>
        <div className={styles.floatTag}><span><ShieldCheck size={16}/></span><div><b>Rights first</b><small>Your work. Your ownership.</small></div></div>
      </div>
    </section>

    <section className={styles.services} id="services">
      <div className={styles.servicesIntro}><span>ONE PLATFORM</span><h2>More than music distribution.</h2><p>Tools and opportunities for the people who create, own and work with music.</p></div>
      <div className={styles.serviceList}>{services.map(({icon:Icon,title,copy})=><div className={styles.service} key={title}><span className={styles.serviceIcon}><Icon size={20}/></span><div><b>{title}</b><small>{copy}</small></div><ChevronRight size={18}/></div>)}</div>
    </section>
    <footer className={styles.footer}><Link href="/" className={styles.brand}><BrandMark/><span>SQUADREC<sup>®</sup></span></Link><span>Music worth finding. Music worth owning.</span><Link href="/register">Create your account <ArrowRight size={14}/></Link></footer>
  </main>;
}
