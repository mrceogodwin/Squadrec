"use client";

import { useMemo, useState } from "react";
import {
  Activity, ArrowDownToLine, ArrowLeft, ArrowRight, AudioLines, Bell, Check,
  ChevronDown, Disc3, Headphones, Heart, Home, Library, ListMusic, Menu,
  MoreHorizontal, Pause, Play, Plus, Radio, Search, Settings2, ShieldCheck,
  ShoppingBag, SkipBack, SkipForward, SlidersHorizontal, Sparkles, TrendingUp,
  Upload, UserRound, X
} from "lucide-react";

const tracks = [
  { id: "01", title: "Outside the Lines", artist: "Kairo", genre: "Afrobeats", change: "+12", art: "art-one", duration: "3:42" },
  { id: "02", title: "No Sleep in Lagos", artist: "Mira Sol", genre: "R&B", change: "+4", art: "art-two", duration: "2:58" },
  { id: "03", title: "Golden Hour", artist: "Juno Vale", genre: "Amapiano", change: "NEW", art: "art-three", duration: "3:16" },
  { id: "04", title: "After the Rain", artist: "NØVA", genre: "Alté", change: "−2", art: "art-four", duration: "4:01" },
  { id: "05", title: "Palmwine Skies", artist: "Tayo Grey", genre: "Afropop", change: "+8", art: "art-five", duration: "3:27" },
];
const playlists = [
  { name: "Lagos After Dark", meta: "The city after hours", art: "art-two" },
  { name: "Afrobeats Forward", meta: "New wave, no limits", art: "art-one" },
  { name: "Soft Life Sounds", meta: "Ease into the weekend", art: "art-three" },
  { name: "The New Alternative", meta: "Outside the expected", art: "art-four" },
];
const releases = [
  { title: "A Little More", artist: "Mira Sol", type: "Single · R&B", art: "art-three", price: "$1.99" },
  { title: "City Never Sleeps", artist: "Kairo", type: "EP · Afrobeats", art: "art-five", price: "$4.99" },
  { title: "Blue Notes", artist: "Juno Vale", type: "Single · Soul", art: "art-two", price: "$1.99" },
  { title: "Frequency", artist: "NØVA", type: "Album · Electronic", art: "art-four", price: "$8.99" },
];
const exclusive = [
  { title: "Midnight in Motion", creator: "Producer: K. Adisa", genre: "Afrobeats · Unreleased", art: "art-five", price: "Offer invited" },
  { title: "Velvet Season", creator: "Artist: Mira Sol", genre: "Alternative R&B · Unreleased", art: "art-three", price: "Private catalogue" },
  { title: "No Looking Back", creator: "Producer: Northside", genre: "Afro-fusion · Unreleased", art: "art-four", price: "Offer invited" },
];

function Cover({ art, large = false }: { art: string; large?: boolean }) {
  return <div className={`cover ${art} ${large ? "cover-large" : ""}`}><span className="cover-mark">SR</span></div>;
}

export default function Home() {
  const [activeNav, setActiveNav] = useState("Discover");
  const [playing, setPlaying] = useState<string | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [showContract, setShowContract] = useState(false);
  const [selectedExclusive, setSelectedExclusive] = useState(exclusive[0]);
  const [notice, setNotice] = useState("");
  const [chartTab, setChartTab] = useState("Global");
  const [mobileNav, setMobileNav] = useState(false);
  const filteredTracks = useMemo(() => tracks.filter(t => (t.title + t.artist + t.genre).toLowerCase().includes(query.toLowerCase())), [query]);
  const currentTrack = tracks.find(t => t.id === playing);

  function playTrack(id: string) {
    setPlaying(current => current === id ? null : id);
    setNotice("");
  }
  function toggleSaved(id: string) {
    setSaved(current => current.includes(id) ? current.filter(x => x !== id) : [...current, id]);
  }
  function showMessage(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  }

  const navItems = [
    { label: "Discover", icon: Home },
    { label: "Charts", icon: TrendingUp },
    { label: "Playlists", icon: ListMusic },
    { label: "Music Store", icon: ShoppingBag },
    { label: "Exclusive", icon: ShieldCheck },
  ];

  return (
    <main className="app-frame">
      <aside className={`app-sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <a className="app-brand" href="#" onClick={() => setActiveNav("Discover")}><span className="brand-symbol">SR</span><span>SQUADREC<small>THE SOUND. THE CULTURE.</small></span></a>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="side-nav">
          {navItems.map(item => {
            const Icon = item.icon;
            return <button key={item.label} className={activeNav === item.label ? "side-link selected" : "side-link"} onClick={() => { setActiveNav(item.label); setMobileNav(false); document.getElementById(item.label === "Charts" ? "charts" : item.label === "Playlists" ? "playlists" : item.label === "Music Store" ? "store" : item.label === "Exclusive" ? "exclusive" : "discover")?.scrollIntoView({ behavior: "smooth" }); }}><Icon size={17}/><span>{item.label}</span>{item.label === "Exclusive" && <i className="side-dot"/>}</button>;
          })}
        </nav>
        <div className="sidebar-divider"/>
        <div className="sidebar-label">YOUR COLLECTION</div>
        <button className="side-link" onClick={() => showMessage("Your saved tracks will appear in your library.")}><Library size={17}/><span>Your library</span></button>
        <button className="side-link" onClick={() => showMessage("Playlist creation will be available with your account.")}><Plus size={17}/><span>Create playlist</span></button>
        <div className="sidebar-bottom">
          <div className="sidebar-promo"><Sparkles size={17}/><strong>Sound without limits.</strong><span>Get closer to the music and the people shaping it.</span><button onClick={() => showMessage("Membership options are coming soon.")}>Explore membership <ArrowRight size={13}/></button></div>
          <button className="profile-mini" onClick={() => showMessage("Sign in to access your SQUADREC account.")}><span className="profile-avatar"><UserRound size={16}/></span><span><b>Guest listener</b><small>Sign in to personalise</small></span><MoreHorizontal size={17}/></button>
        </div>
      </aside>

      <section className="app-main">
        <header className="app-topbar">
          <button className="mobile-nav-trigger" onClick={() => setMobileNav(!mobileNav)}><Menu size={20}/></button>
          <div className="breadcrumb"><span>Workspace</span><span>/</span><b>{activeNav}</b></div>
          <div className="topbar-actions">
            {searchOpen ? <div className="search-field"><Search size={16}/><input autoFocus placeholder="Search tracks, artists, genres..." value={query} onChange={e => setQuery(e.target.value)}/><button onClick={() => {setSearchOpen(false);setQuery("");}}><X size={15}/></button></div> : <button className="top-icon" aria-label="Search" onClick={() => setSearchOpen(true)}><Search size={18}/></button>}
            <button className="top-icon" aria-label="Notifications" onClick={() => showMessage("You're all caught up.")}><Bell size={18}/></button>
            <button className="top-avatar" onClick={() => showMessage("Sign in to manage your profile.")}>G</button>
          </div>
        </header>

        <div className="app-content">
          <section className="welcome-row" id="discover">
            <div><div className="eyebrow"><span/> YOUR MUSIC DESTINATION</div><h1>Good sound.<br/><em>Good energy.</em></h1><p>Find your next favourite. Discover music worth hearing, collecting and owning.</p></div>
            <div className="welcome-status"><span className="status-pulse"/> CURATED SOUND, ALWAYS IN MOTION</div>
          </section>

          <section className="feature-panel">
            <div className="feature-copy"><div className="feature-kicker"><AudioLines size={14}/> SQUADREC SELECTS <span>VOL. 001</span></div><h2>Sound<br/><i>in motion.</i></h2><p>A considered selection of new voices, fresh records and future favourites.</p><button className="primary-action" onClick={() => playTrack("01")}>{playing === "01" ? <Pause size={16} fill="currentColor"/> : <Play size={16} fill="currentColor"/>}{playing === "01" ? "Pause selection" : "Play selection"}</button></div>
            <div className="feature-visual"><div className="feature-orbit orbit-one"/><div className="feature-orbit orbit-two"/><div className="feature-disc"><span>SR</span></div><div className="feature-visual-caption">THE SOUND OF WHAT'S NEXT</div></div>
            <div className="feature-count"><span>01</span><span> / 04</span></div>
          </section>

          <section className="quick-genres"><div className="section-heading compact"><div><span className="eyebrow">FIND YOUR FREQUENCY</span><h3>Browse by sound</h3></div><button className="quiet-action" onClick={() => showMessage("All genres are coming soon.")}>All genres <ArrowRight size={14}/></button></div><div className="genre-pills">{["Afrobeats","Amapiano","R&B","Hip-Hop","Electronic","Alté","Pop"].map((g,i)=><button key={g} className="genre-pill" onClick={() => {setQuery(g);setSearchOpen(true);}}><span className={`genre-symbol genre-${i}`}>{["A","◉","R","H","∿","Ø","P"][i]}</span>{g}<ArrowRight size={12}/></button>)}</div></section>

          <section className="content-section" id="charts"><div className="section-heading"><div><span className="eyebrow">THE SOUND RIGHT NOW</span><h3>Top 100<span className="gold-dot">.</span></h3><p>Records finding their way into rotation.</p></div><button className="quiet-action" onClick={() => showMessage("The full verified chart is coming soon.")}>Full chart <ArrowRight size={14}/></button></div><div className="filter-row"><div className="filter-tabs">{["Global","Nigeria","Afrobeats","R&B","Amapiano"].map(t=><button key={t} className={chartTab===t?"filter-tab active":"filter-tab"} onClick={()=>setChartTab(t)}>{t}</button>)}</div><button className="filter-button" onClick={()=>showMessage("Chart filters will be available soon.")}><SlidersHorizontal size={14}/> Filters</button></div><div className="app-track-list">{filteredTracks.map(t=><div className={playing===t.id?"app-track-row is-playing":"app-track-row"} key={t.id}><span className="app-track-number">{t.id}</span><button className="track-art-button" onClick={()=>playTrack(t.id)}><Cover art={t.art}/><span className="art-hover">{playing===t.id?<Pause size={16}/>:<Play size={16} fill="currentColor"/>}</span></button><div className="app-track-details"><b>{t.title}</b><span>{t.artist} <i>·</i> {t.genre}</span></div><span className={t.change==="NEW"?"track-new":"track-change"}>{t.change}</span><span className="track-duration">{t.duration}</span><button className={saved.includes(t.id)?"track-heart saved":"track-heart"} aria-label="Save track" onClick={()=>toggleSaved(t.id)}><Heart size={16} fill={saved.includes(t.id)?"currentColor":"none"}/></button><button className="row-play" aria-label="Play track" onClick={()=>playTrack(t.id)}>{playing===t.id?<Pause size={15} fill="currentColor"/>:<Play size={15} fill="currentColor"/>}</button></div>)}</div><div className="chart-note"><TrendingUp size={14}/> {chartTab} chart · Rankings will be based on verified listening and purchase activity.</div></section>

          <section className="content-section playlist-block" id="playlists"><div className="section-heading"><div><span className="eyebrow">MADE FOR THE MOMENT</span><h3>Playlists<span className="gold-dot">.</span></h3><p>A good soundtrack changes everything.</p></div><button className="quiet-action" onClick={()=>showMessage("More playlists are on the way.")}>All playlists <ArrowRight size={14}/></button></div><div className="app-playlist-grid">{playlists.map((p,i)=><button className="app-playlist-card" key={p.name} onClick={()=>{playTrack(tracks[i%tracks.length].id);showMessage(`Playing ${p.name} preview.`);}}><div className="app-playlist-art"><Cover art={p.art} large/><span className="playlist-number">0{i+1}</span><span className="playlist-play"><Play size={18} fill="currentColor"/></span></div><b>{p.name}</b><span>{p.meta}</span></button>)}</div></section>

          <section className="content-section" id="store"><div className="section-heading"><div><span className="eyebrow">FRESH IN THE STORE</span><h3>New releases<span className="gold-dot">.</span></h3><p>New music, ready for your collection.</p></div><button className="quiet-action" onClick={()=>showMessage("The full store is coming soon.")}>Visit store <ArrowRight size={14}/></button></div><div className="app-release-grid">{releases.map(r=><article className="app-release-card" key={r.title}><div className="app-release-art"><Cover art={r.art} large/><button onClick={()=>showMessage(`${r.title} preview is not connected yet.`)}><Play size={16} fill="currentColor"/></button></div><div className="release-card-meta"><div><b>{r.title}</b><span>{r.artist} · {r.type}</span></div><strong>{r.price}</strong></div><button className="add-to-bag" onClick={()=>showMessage(`${r.title} added to your purchase list (demo).`)}><ShoppingBag size={14}/> Add to collection</button></article>)}</div></section>

          <section className="exclusive-panel" id="exclusive"><div className="exclusive-heading"><div><span className="eyebrow"><ShieldCheck size={13}/> VERIFIED INDUSTRY ACCESS</span><h3>The private<br/><em>catalogue.</em></h3><p>Unreleased records. Limited previews. Serious acquisition opportunities.</p></div><div className="exclusive-lock"><ShieldCheck size={25}/><span>RIGHTS-LED<br/>ACQUISITIONS</span></div></div><div className="exclusive-list">{exclusive.map((item,i)=><div className="exclusive-row" key={item.title}><Cover art={item.art}/><div className="exclusive-track-info"><b>{item.title}</b><span>{item.creator} · {item.genre}</span></div><span className="exclusive-price">{item.price}</span><button className="preview-button" onClick={()=>showMessage("10-second preview player will be connected to approved audio assets.")}><Headphones size={14}/> Preview</button><button className="contract-button" onClick={()=>{setSelectedExclusive(item);setShowContract(true);}}>Place contract <ArrowRight size={14}/></button></div>)}</div><div className="exclusive-foot"><ShieldCheck size={14}/> Full catalogue access requires verified industry credentials. Rights are transferred only after a signed agreement.</div></section>

          <footer className="app-footer"><a className="app-brand" href="#"><span className="brand-symbol">SR</span><span>SQUADREC<small>THE SOUND. THE CULTURE.</small></span></a><span>© 2026 SQUADREC. Music worth finding. Music worth owning.</span><button onClick={()=>showMessage("Help centre coming soon.")}>Help & support</button></footer>
        </div>
      </section>

      <div className="player-bar"><div className="player-track">{currentTrack?<><Cover art={currentTrack.art}/><div><b>{currentTrack.title}</b><span>{currentTrack.artist}</span></div><button className="player-heart" onClick={()=>toggleSaved(currentTrack.id)}><Heart size={15} fill={saved.includes(currentTrack.id)?"currentColor":"none"}/></button></>:<><div className="player-empty"><Disc3 size={20}/></div><div><b>Nothing playing</b><span>Choose a track to start listening</span></div></>}</div><div className="player-controls"><div className="player-buttons"><button aria-label="Previous track" onClick={()=>playTrack("05")}><SkipBack size={16}/></button><button className="player-main-play" aria-label="Play or pause" onClick={()=>currentTrack?setPlaying(null):playTrack("01")}>{playing?<Pause size={17} fill="currentColor"/>:<Play size={17} fill="currentColor"/>}</button><button aria-label="Next track" onClick={()=>playTrack("02")}><SkipForward size={16}/></button></div><div className="player-progress"><span>0:00</span><div className="progress-track"><i/></div><span>{currentTrack?.duration || "0:00"}</span></div></div><div className="player-right"><button onClick={()=>showMessage("Queue is coming soon.")}><ListMusic size={17}/></button><button onClick={()=>showMessage("Audio output settings coming soon.")}><AudioLines size={17}/></button><span className="volume-line"><i/></span></div></div>

      {notice && <div className="app-toast"><Check size={15}/>{notice}<button onClick={()=>setNotice("")}><X size={14}/></button></div>}
      {showContract && <div className="modal-backdrop" onClick={()=>setShowContract(false)}><div className="contract-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setShowContract(false)}><X size={18}/></button><span className="eyebrow"><ShieldCheck size={13}/> PRIVATE ACQUISITION</span><h3>Start a conversation.</h3><p>You are requesting an acquisition discussion for <b>{selectedExclusive.title}</b>. Industry verification and a formal rights review are required before any transfer.</p><label>Proposed offer (USD)<input placeholder="Enter your proposed amount" /></label><label>Message to rights holder<textarea placeholder="Introduce your organisation and outline your intended use..." rows={3}/></label><button className="primary-action modal-submit" onClick={()=>{setShowContract(false);showMessage("Demo request captured. Sign in and complete industry verification to submit a real offer.");}}>Continue to verification <ArrowRight size={15}/></button><small>No rights are transferred by submitting an enquiry.</small></div></div>}
    </main>
  );
}
