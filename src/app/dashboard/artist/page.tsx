import "./artist-overview.css";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  ArrowRight, AudioLines, BadgeCheck, Bell, CheckCircle2, Clock3,
  Disc3, FileAudio, FileCheck2, LockKeyhole,
  Plus, ShieldCheck, ShoppingBag, Sparkles
} from "lucide-react";
import ArtistApplicationForm from "./artist-application-form";
import ReplaceExclusivePreview from "./replace-exclusive-preview";

const dateLabel = (date: Date) => new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(date);
const statusLabel = (status: string) => status.toLowerCase().replaceAll("_", " ");

export default async function ArtistDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const profile = await prisma.artistProfile.findUnique({ where: { userId: session.user.id } });
  const status = profile?.verificationStatus ?? "NOT_SUBMITTED";
  const canSubmit = status === "VERIFIED" && ["ARTIST", "AUTHORISED_UPLOADER", "ADMIN", "SUPER_ADMIN"].includes(session.user.role);

  const [tracks, totalTracks, pendingTracks, approvedTracks, paidSales, offers] = await Promise.all([
    profile ? prisma.track.findMany({
      where: { artistProfileId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, type: true, status: true, createdAt: true, artworkUrl: true, previewObjectKey: true },
    }) : Promise.resolve([]),
    profile ? prisma.track.count({ where: { artistProfileId: profile.id } }) : Promise.resolve(0),
    profile ? prisma.track.count({ where: { artistProfileId: profile.id, status: "PENDING_REVIEW" } }) : Promise.resolve(0),
    profile ? prisma.track.count({ where: { artistProfileId: profile.id, status: "APPROVED" } }) : Promise.resolve(0),
    profile ? prisma.purchase.count({ where: { status: "PAID", track: { artistProfileId: profile.id } } }) : Promise.resolve(0),
    profile ? prisma.acquisitionOffer.count({ where: { track: { artistProfileId: profile.id } } }) : Promise.resolve(0),
  ]);

  const stats = [
    { label: "Total releases", value: totalTracks, detail: "In your catalogue", icon: Disc3 },
    { label: "Approved", value: approvedTracks, detail: "Available in SQUADREC", icon: CheckCircle2 },
    { label: "Under review", value: pendingTracks, detail: "Awaiting our team", icon: Clock3 },
    { label: "Music sales", value: paidSales, detail: "Completed purchases", icon: ShoppingBag },
  ];

  return (
    <main className="artist-dashboard sq-artist-home">
      <header className="artist-top sq-artist-top">
        <Link href="/dashboard" className="artist-back"><ArrowRight size={15}/> Account</Link>
        <Link href="/dashboard/artist" className="artist-top-brand"><span className="brand-symbol">SR</span> SQUADREC <span>ARTIST STUDIO</span></Link>
        <Link href="/dashboard/notifications" className="sq-artist-bell" aria-label="Notifications"><Bell size={18}/></Link>
      </header>

      <div className="artist-wrap sq-artist-wrap">
        <div className="sq-artist-welcome">
          <div>
            <span className="eyebrow"><AudioLines size={13}/> YOUR CREATOR WORKSPACE</span>
            <h1>Welcome back,<br/><em>{profile?.stageName || session.user.name || "Artist"}.</em></h1>
            <p>Your music journey, releases and catalogue activity — all in one place.</p>
          </div>
          <div className="sq-artist-verified">
            <span className={status === "VERIFIED" ? "sq-artist-status-dot verified" : "sq-artist-status-dot"}/>
            {status === "VERIFIED" ? "ARTIST VERIFIED" : status === "PENDING" ? "APPLICATION IN REVIEW" : status === "REJECTED" ? "ACTION REQUIRED" : "PROFILE NOT SET UP"}
          </div>
        </div>

        {status !== "VERIFIED" && (
          <section className="sq-artist-verification">
            <div className="sq-artist-verification-icon">{status === "PENDING" ? <Clock3 size={21}/> : <ShieldCheck size={21}/>}</div>
            <div className="sq-artist-verification-copy">
              <span className="eyebrow">ARTIST ACCESS</span>
              <h2>{status === "PENDING" ? "Your application is being reviewed." : status === "REJECTED" ? "Your application needs attention." : "Set up your artist profile."}</h2>
              <p>{status === "PENDING" ? "Our team is reviewing your identity and rights information. Upload permissions remain locked until approval." : status === "REJECTED" ? "Please contact the SQUADREC team for guidance on the next steps." : "Tell us about yourself. Our team will review your identity and rights information before enabling music uploads."}</p>
            </div>
            <span className="sq-artist-verification-pill">{statusLabel(status)}</span>
          </section>
        )}

        {!profile && (
          <section className="artist-panel sq-artist-application-panel">
            <div className="artist-panel-title"><div><span className="eyebrow">GET STARTED</span><h2>Artist application</h2><p>Complete your profile to request access to the Artist Studio.</p></div><ShieldCheck size={22}/></div>
            <ArtistApplicationForm/>
          </section>
        )}

        <section className="sq-artist-stats" aria-label="Artist performance overview">
          {stats.map((item) => { const Icon = item.icon; return (
            <article className="sq-artist-stat" key={item.label}>
              <span className="sq-artist-stat-icon"><Icon size={18}/></span>
              <span className="sq-artist-stat-label">{item.label}</span>
              <strong>{item.value.toLocaleString()}</strong>
              <small>{item.detail}</small>
            </article>
          ); })}
        </section>

        <section className="sq-artist-feature">
          <div className="sq-artist-feature-copy">
            <span className="eyebrow"><Sparkles size={12}/> YOUR MUSIC, YOUR NEXT MOVE</span>
            <h2>Every release<br/><em>starts somewhere.</em></h2>
            <p>Prepare your next track, submit the required rights information and let the SQUADREC team take it through review.</p>
            {canSubmit ? <Link href="/dashboard/artist/new-track" className="sq-artist-primary"><Plus size={17}/> Create a release <ArrowRight size={16}/></Link> : <span className="sq-artist-feature-locked"><LockKeyhole size={15}/> {status === "PENDING" ? "Uploads unlock after verification" : "Complete artist verification to upload"}</span>}
          </div>
          <div className="sq-artist-feature-art" aria-hidden="true">
            <div className="sq-artist-disc"><span>SR</span></div>
            <div className="sq-artist-soundwave"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div>
            <span className="sq-artist-art-label">SQUADREC · ARTIST STUDIO</span>
          </div>
        </section>

        <section className="artist-panel sq-artist-releases" id="releases">
          <div className="artist-panel-title">
            <div><span className="eyebrow">YOUR CATALOGUE</span><h2>Recent releases</h2><p>Keep track of your latest music submissions and their review status.</p></div>
            {canSubmit && <Link href="/dashboard/artist/new-track" className="sq-artist-add"><Plus size={15}/> New release</Link>}
          </div>
          {tracks.length ? <div className="sq-artist-release-list">
            {tracks.map(track => (
              <article className="sq-artist-release" key={track.id}>
                <div className="sq-artist-cover">
                  {track.artworkUrl ? <img src={`/api/admin/tracks/${track.id}/assets/artwork`} alt={track.title + " artwork"}/> : <Disc3 size={23}/>}
                </div>
                <div className="sq-artist-release-main">
                  <b>{track.title}</b>
                  <span>{track.type === "EXCLUSIVE" ? "Exclusive catalogue" : "Music store"} <i/> {dateLabel(track.createdAt)}</span>
                </div>
                <span className={"sq-artist-release-status " + track.status.toLowerCase()}>{statusLabel(track.status)}</span>
                {track.type === "EXCLUSIVE" && (track.status === "DRAFT" || track.status === "REJECTED") && <ReplaceExclusivePreview trackId={track.id}/>}
              </article>
            ))}
          </div> : <div className="sq-artist-empty">
            <span><FileAudio size={23}/></span><b>Your catalogue is waiting.</b>
            <p>Your submitted releases will appear here with their review progress.</p>
            {canSubmit && <Link href="/dashboard/artist/new-track">Submit your first track <ArrowRight size={15}/></Link>}
          </div>}
        </section>

        <div className="sq-artist-quick-links">
          <Link href="/dashboard/artist/offers"><span><BadgeCheck size={18}/></span><div><b>Acquisition offers</b><small>{offers} {offers === 1 ? "offer" : "offers"} connected to your catalogue</small></div><ArrowRight size={17}/></Link>
          <Link href="/dashboard/contracts"><span><FileCheck2 size={18}/></span><div><b>Contract register</b><small>Review and track your rights agreements</small></div><ArrowRight size={17}/></Link>
        </div>

        <div className="sq-artist-footnote"><ShieldCheck size={15}/> Every release is reviewed for ownership, authorisation and metadata before publication. Exclusive music is only available through verified industry access.</div>
      </div>

      <nav className="sq-artist-mobile-nav" aria-label="Artist Studio navigation">
        <Link href="/dashboard/artist" className="active"><Disc3 size={19}/><span>Overview</span></Link>
        <Link href="/dashboard/artist#releases"><FileAudio size={19}/><span>Releases</span></Link>
        <Link href={canSubmit ? "/dashboard/artist/new-track" : "/dashboard/artist"}><Plus size={21}/><span>Upload</span></Link>
        <Link href="/dashboard/artist/offers"><BadgeCheck size={19}/><span>Offers</span></Link>
        <Link href="/dashboard/contracts"><FileCheck2 size={19}/><span>Contracts</span></Link>
      </nav>
    </main>
  );
}
