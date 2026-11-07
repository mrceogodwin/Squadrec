"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Disc3, Library, Plus, Music2, LockKeyhole, Globe2 } from "lucide-react";

type Playlist = {
  id: string; title: string; description: string | null; isPublic: boolean;
  tracks: { id: string; track: { id: string; title: string; artworkUrl: string | null; artistProfile: { stageName: string } } }[];
};

export default function LibraryPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/playlists");
      const data = await response.json();
      if (!response.ok) { setMessage(data.error || "Unable to load your library."); setPlaylists([]); }
      else { setPlaylists(data.playlists || []); setMessage(""); }
    } catch { setMessage("Could not connect to your library."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function createPlaylist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true); setMessage("");
    try {
      const response = await fetch("/api/playlists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description, isPublic: false }) });
      const data = await response.json();
      if (!response.ok) setMessage(data.error || "Unable to create playlist.");
      else { setTitle(""); setDescription(""); await load(); }
    } catch { setMessage("Could not create playlist. Try again."); }
    finally { setCreating(false); }
  }

  return <main className="artist-dashboard">
    <header className="artist-top"><Link href="/dashboard" className="artist-back"><ArrowLeft size={16}/> Account</Link><div className="artist-top-brand"><span className="brand-symbol">SR</span> SQUADREC <span>YOUR LIBRARY</span></div></header>
    <div className="artist-wrap">
      <div className="artist-heading"><div><span className="eyebrow"><Library size={13}/> PERSONAL MUSIC SPACE</span><h1>Your music.<br/><em>Your way.</em></h1><p>Build private playlists from approved SQUADREC releases. Your collection stays connected to your account.</p></div><div className="artist-heading-mark"><Disc3 size={40}/></div></div>
      <section className="artist-panel">
        <div className="artist-panel-title"><div><span className="eyebrow">NEW COLLECTION</span><h2>Create a playlist</h2><p>Give your next collection a name and a description.</p></div><Plus size={22}/></div>
        <form className="new-track-form" onSubmit={createPlaylist}>
          <label>Playlist name<input required maxLength={80} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Late night Afrobeats"/></label>
          <label>Description<input maxLength={300} value={description} onChange={e=>setDescription(e.target.value)} placeholder="What's the mood? (optional)"/></label>
          <div className="artist-locked full"><LockKeyhole size={18}/><div><b>Private by default</b><span>Your playlists are visible only to you. Public sharing can be enabled later.</span></div></div>
          {message && <p className="artist-form-error full">{message}</p>}
          <button className="artist-submit" disabled={creating}>{creating ? "Creating..." : "Create playlist"} <span>→</span></button>
        </form>
      </section>
      <section className="artist-panel">
        <div className="artist-panel-title"><div><span className="eyebrow">YOUR COLLECTIONS</span><h2>Playlists</h2><p>{playlists.length} playlist{playlists.length===1?"":"s"} in your library.</p></div><Music2 size={22}/></div>
        {loading ? <div className="artist-empty">Loading your playlists...</div> : playlists.length ? playlists.map(p=><div className="artist-track-row" key={p.id}><div className="artist-track-icon"><Disc3 size={17}/></div><div><b>{p.title}</b><span>{p.tracks.length} tracks · {p.description || "No description"}</span></div><span className="artist-track-state">{p.isPublic ? <Globe2 size={14}/> : <LockKeyhole size={14}/>} {p.isPublic ? "Public" : "Private"}</span></div>) : <div className="artist-empty"><Library size={23}/><b>Your library is waiting</b><span>Create your first playlist above. You can add approved released tracks as the catalogue grows.</span></div>}
      </section>
    </div>
  </main>;
}
