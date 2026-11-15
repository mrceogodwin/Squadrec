"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight, Bell, Check, ChevronDown, CloudUpload, Gem, Headphones,
  Heart, Menu, Pause, Play, Search, ShieldCheck, ShoppingBag, SkipBack,
  SkipForward, X, Users, Music2
} from "lucide-react";

type CatalogueTrack = { id: string; title: string; artist: string; genre: string; art: string; duration: string; rank: string };
function duration(seconds: number | null) {
  if (!seconds) return "—";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

const shortcuts = [
  { title: "Listen", text: "Stream and discover new music", icon: Headphones, href: "#trending" },
  { title: "Acquire", text: "Own tracks and music rights", icon: Gem, href: "#vault" },
  { title: "Upload", text: "Share your music and get discovered", icon: CloudUpload, href: "/dashboard/artist" },
  { title: "Industry Access", text: "For labels, A&R and verified buyers", icon: Users, href: "/dashboard/industry" },
];

function Cover({ src, title }: { src: string; title: string }) {
  return <div className="sq-cover"><img src={src} alt={title} /></div>;
}

export default function Home() {
  const [tracks, setTracks] = useState<CatalogueTrack[]>([]);
  const [catalogueLoading, setCatalogueLoading] = useState(true);
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState("");
  const [activeGenre, setActiveGenre] = useState("All");
  useEffect(() => {
    fetch("/api/catalogue/released").then(r => r.ok ? r.json() : { tracks: [] }).then(data => setTracks((data.tracks || []).map((t: any) => ({ id: t.id, title: t.title, artist: t.artistProfile?.stageName || "Independent artist", genre: t.genre?.name || "Uncategorised", art: t.artworkUrl ? `/api/catalogue/released/${t.id}/artwork` : "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=700&auto=format&fit=crop&q=80", duration: duration(t.durationSeconds), rank: "Approved release" })))).catch(() => setTracks([])).finally(() => setCatalogueLoading(false));
  }, []);
  const filtered = useMemo(() => tracks.filter(t => (t.title + t.artist + t.genre).toLowerCase().includes(query.toLowerCase()) && (activeGenre === "All" || t.genre === activeGenre)), [tracks, query, activeGenre]);
  const current = tracks.find(t => t.id === playing);
  const togglePlay = async (id: string) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing === id && !audio.paused) { audio.pause(); setPlaying(null); return; }
    audio.pause();
    audio.src = `/api/catalogue/released/${id}/audio`;
    audio.load();
    try { await audio.play(); setPlaying(id); }
    catch { setPlaying(null); notify("This track could not be played right now."); }
  };
  const notify = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(""), 2600); };
  const toggleSave = (id: string) => setSaved(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  return (
    <main className="sq-home">
      <header className="sq-header">
        <a className="sq-logo" href="#"><img className="sq-logo-image" src="/squadrec-mark.svg" alt="" /><b>SQUADREC<sup>®</sup></b></a>
        <button className="sq-mobile-menu" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle menu"><Menu /></button>
        <nav className={mobileMenu ? "sq-nav sq-nav-open" : "sq-nav"}>
          <a className="active" href="#">Home</a><a href="#trending">Discover</a><a href="#store">Store</a><a href="#vault">Exclusive Vault</a><a href="/dashboard/artist">For Artists</a><a href="/dashboard/industry">Industry</a>
        </nav>
        <div className="sq-header-actions">
          {searchOpen ? <div className="sq-search"><Search size={17}/><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search music, artists..."/><button onClick={() => {setSearchOpen(false);setQuery("");}}><X size={16}/></button></div> : <button className="sq-icon-button" aria-label="Search" onClick={() => setSearchOpen(true)}><Search /></button>}
          <button className="sq-icon-button" aria-label="Notifications" onClick={() => notify("You're all caught up.")}><Bell /></button>
          <a className="sq-avatar" href="/sign-in">G</a><ChevronDown size={15}/>
        </div>
      </header>

      <section className="sq-hero sq-hero-creem">
        <div className="sq-hero-copy">
          <div className="sq-overline sq-overline-pill"><span className="sq-wave">▮▮▮</span> MUSIC RIGHTS PLATFORM</div>
          <h1>Make music.<br/><span>Own the rights.</span></h1>
          <p>Release music, discover exclusive catalogues, and manage ownership from one place.</p>
          <div className="sq-hero-actions"><a className="sq-button sq-button-peach" href="/get-started">Get started <ArrowRight size={19}/></a><a className="sq-button sq-button-outline" href="#platform">Explore platform</a></div>
          <div className="sq-hero-orbit" aria-hidden="true"/>
        </div>
        <div className="sq-product-stage">
          <div className="sq-dashboard-preview">
            <div className="sq-preview-top"><span><img src="/squadrec-mark.svg" alt=""/> SQUADREC</span><span>⌕　♧　●</span></div>
            <p className="sq-preview-welcome">Welcome back, Femi 👋</p>
            <div className="sq-preview-stats"><div><small>♫ Releases</small><b>24</b><em>↑ +20%</em></div><div><small>◇ Deals</small><b>06</b><em>↑ +50%</em></div><div><small>♢ Rights</small><b>12</b><em>↑ +33%</em></div></div>
            <div className="sq-preview-list-head"><b>Recent releases</b><span>View all →</span></div>
            <div className="sq-preview-track"><i className="art-a"/> <span><b>Higher Ground</b><small>Single · 3.2M streams</small></span><button>▶</button></div>
            <div className="sq-preview-track"><i className="art-b"/> <span><b>No Delay</b><small>EP · 1.1M streams</small></span><button>▶</button></div>
            <div className="sq-preview-track"><i className="art-c"/> <span><b>Edo Vibes</b><small>Album · 5.8M streams</small></span><button>▶</button></div>
            <div className="sq-preview-nav"><span>⌂<small>Overview</small></span><span>♫<small>Music</small></span><span>◇<small>Deals</small></span><span>♢<small>Rights</small></span><span>•••<small>More</small></span></div>
          </div>
        </div>
      </section>
      <section className="sq-shortcuts sq-feature-band" id="platform">
        <a className="sq-shortcut" href="/dashboard/artist"><span className="sq-shortcut-icon"><Music2 size={27}/></span><span className="sq-shortcut-copy"><b>Release &amp; Distribute</b><small>Get your music to global audiences.</small></span><ArrowRight size={19}/></a>
        <a className="sq-shortcut" href="/dashboard/industry"><span className="sq-shortcut-icon"><Gem size={27}/></span><span className="sq-shortcut-copy"><b>Acquire Music Rights</b><small>Buy, license and own exclusive catalogues.</small></span><ArrowRight size={19}/></a>
        <a className="sq-shortcut" href="/dashboard/contracts"><span className="sq-shortcut-icon"><ShieldCheck size={27}/></span><span className="sq-shortcut-copy"><b>Manage Ownership</b><small>Track rights, contracts and revenue in one place.</small></span><ArrowRight size={19}/></a>
      </section>

      <section className="sq-section" id="trending">
        <div className="sq-section-head"><div><h2>Trending Now</h2><p>The sounds making their mark right now.</p></div><div className="sq-genres">{["All","Afrobeats","Hip-Hop","R&B","Amapiano","Afropop","Alternative"].map(g=><button key={g} className={activeGenre===g?"selected":""} onClick={()=>setActiveGenre(g)}>{g}</button>)}</div><a className="sq-view-all" href="#store">View All <ArrowRight size={16}/></a></div>
        <div className="sq-track-grid">{filtered.map(t=><article className="sq-track-card" key={t.id}><div className="sq-track-image"><Cover src={t.art} title={t.title}/><button className="sq-track-play" onClick={()=>togglePlay(t.id)} aria-label={playing===t.id?"Pause track":"Play track"}>{playing===t.id?<Pause size={17} fill="currentColor"/>:<Play size={17} fill="currentColor"/>}</button><button className={saved.includes(t.id)?"sq-track-save saved":"sq-track-save"} onClick={()=>toggleSave(t.id)} aria-label="Save track"><Heart size={16} fill={saved.includes(t.id)?"currentColor":"none"}/></button></div><div className="sq-track-meta"><div><b>{t.title}</b><span>{t.artist} · {t.genre}</span></div><small>{t.rank}</small></div></article>)}</div>
        {filtered.length===0 && <p className="sq-empty">{catalogueLoading ? "Loading approved releases..." : query ? "No tracks match that search. Try another title or genre." : "No approved releases yet. Once artists are verified and their music is approved, it will appear here."}</p>}
      </section>

      <section className="sq-vault" id="vault"><div className="sq-vault-copy"><div className="sq-overline">◇ &nbsp; THE EXCLUSIVE VAULT</div><h2>Unreleased Music.<br/>Real Ownership.</h2><p>Access a curated catalogue of unreleased tracks and acquire full or exclusive rights directly from verified artists.</p><a className="sq-button sq-button-green" href="/dashboard/industry">Enter Vault <ArrowRight size={17}/></a></div><div className="sq-vault-visual"><div className="sq-vault-disc"><span>S</span></div><div className="sq-vault-record"><Music2 size={46}/><b>EXCLUSIVE</b></div></div></section>

      <section className="sq-artist-band"><div><div className="sq-overline">FOR ARTISTS</div><h2>Create. Release.<br/>Get Acquired.</h2><p>Distribute your music, build your fanbase, and get your work discovered by verified buyers and industry professionals.</p><a className="sq-button sq-button-green" href="/dashboard/artist">Join as an Artist <ArrowRight size={16}/></a></div><img src="https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=900&auto=format&fit=crop&q=85" alt="Singer performing on stage"/><div className="sq-artist-benefits"><span><CloudUpload/> Upload your music</span><span><Music2/> Get discovered</span><span><Users/> Receive acquisition offers</span><span><ShieldCheck/> Protect your rights</span></div></section>

      <section className="sq-stats"><div><Headphones/><b>Curated</b><span>Approved music catalogue</span></div><div><Users/><b>Artist-led</b><span>Creator-owned submissions</span></div><div><Gem/><b>Exclusive</b><span>Rights acquisition vault</span></div><div><ShoppingBag/><b>Verified</b><span>Industry buyer access</span></div></section>

      <footer className="sq-footer"><a className="sq-logo" href="#"><img className="sq-logo-image" src="/squadrec-mark.svg" alt="" /><b>SQUADREC<sup>®</sup></b></a><span>© 2026 SQUADREC. Music worth finding. Music worth owning.</span><div><a href="/sign-in">Sign in</a><a href="/get-started">Create account</a><a href="/dashboard">Dashboard</a></div></footer>

      <div className="sq-player"><div className="sq-player-current">{current ? <Cover src={current.art} title={current.title}/> : <div className="sq-player-placeholder"><Music2/></div>}<div><b>{current?.title || "SQUADREC PLAYER"}</b><span>{current?.artist || "Secure audio previews are being connected"}</span></div><button onClick={()=>current&&toggleSave(current.id)} aria-label="Save track"><Heart size={17} fill={current&&saved.includes(current.id)?"currentColor":"none"}/></button></div><div className="sq-player-controls"><div><button className="sq-player-play" disabled={!current} onClick={()=>current&&togglePlay(current.id)} aria-label={playing?"Pause":"Play"}>{playing?<Pause size={18}/>:<Play size={18}/>}</button><span className="sq-player-placeholder"><Music2 size={16}/></span><span className="sq-player-placeholder"><ShieldCheck size={16}/></span><span className="sq-player-placeholder"><Headphones size={16}/></span></div><span>{playing ? "NOW PLAYING · APPROVED RELEASE" : "SELECT A RELEASE TO START PLAYBACK"}</span></div><div className="sq-player-extra"><span>RIGHTS FIRST</span><div/></div></div>
      <audio ref={audioRef} onEnded={()=>setPlaying(null)} onPause={()=>setPlaying(null)} />\n      {notice && <div className="sq-toast"><Check size={16}/>{notice}<button onClick={()=>setNotice("")}><X size={15}/></button></div>}
    </main>
  );
}
