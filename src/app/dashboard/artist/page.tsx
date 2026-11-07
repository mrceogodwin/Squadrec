import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ArrowLeft, AudioLines, BadgeCheck, Clock3, Disc3, ShieldCheck, UploadCloud } from "lucide-react";

export default async function ArtistDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  const [profile, genres, tracks] = await Promise.all([
    prisma.artistProfile.findUnique({ where: { userId: session.user.id } }),
    prisma.genre.findMany({ orderBy: { name: "asc" } }),
    prisma.track.findMany({ where: { uploaderId: session.user.id }, orderBy: { createdAt: "desc" }, take: 8, select: { id: true, title: true, type: true, status: true, createdAt: true } }),
  ]);

  const status = profile?.verificationStatus ?? "NOT_SUBMITTED";
  const canSubmit = status === "VERIFIED" && ["ARTIST", "AUTHORISED_UPLOADER", "ADMIN", "SUPER_ADMIN"].includes(session.user.role);

  return <main className="artist-dashboard">
    <header className="artist-top"><Link href="/" className="artist-back"><ArrowLeft size={16}/> Back to discovery</Link><div className="artist-top-brand"><span className="brand-symbol">SR</span> SQUADREC <span>ARTIST STUDIO</span></div><div className="artist-user">{session.user.name || session.user.email}</div></header>
    <div className="artist-wrap">
      <div className="artist-heading"><div><span className="eyebrow"><AudioLines size={13}/> CREATOR WORKSPACE</span><h1>Your music.<br/><em>Your catalogue.</em></h1><p>Manage your artist profile, prepare releases and explore acquisition activity.</p></div><div className="artist-heading-mark"><Disc3 size={40}/></div></div>
      <section className="artist-status-card"><div className="artist-status-icon">{status === "VERIFIED" ? <BadgeCheck/> : <Clock3/>}</div><div className="artist-status-copy"><span className="eyebrow">ARTIST VERIFICATION</span><h2>{status === "VERIFIED" ? "You're verified." : status === "PENDING" ? "Application under review." : status === "REJECTED" ? "More information required." : "Set up your artist profile."}</h2><p>{status === "VERIFIED" ? "Your artist account is approved. You can prepare music submissions." : status === "PENDING" ? "Our team is reviewing your artist identity and rights information. Upload permissions remain locked until approval." : status === "REJECTED" ? "Please contact the SQUADREC team for the next steps on your application." : "Apply for artist access. Our team will review your identity and rights information before enabling uploads."}</p></div><span className={`artist-status-pill ${status.toLowerCase()}`}>{status.replaceAll("_"," ")}</span></section>
      {!profile && <section className="artist-panel"><div className="artist-panel-title"><div><span className="eyebrow">STEP 01</span><h2>Artist application</h2><p>Tell us who you are. Applications are reviewed before any upload access is granted.</p></div><ShieldCheck size={22}/></div><form className="artist-application" action="/api/artist/apply" method="post"><label>Artist / stage name<input name="stageName" placeholder="e.g. Your artist name" required minLength={2}/></label><label>Country<input name="country" placeholder="Country of residence"/></label><label>Website or official profile<input name="website" type="url" placeholder="https://"/></label><label className="full">Short artist biography<textarea name="biography" rows={3} placeholder="Tell us about your sound, releases and career..."/></label><label className="rights-check full"><input name="confirmsRights" type="checkbox" required/><span>I confirm that I am the artist or have authority to represent the artist, and that I will only submit music for which the necessary rights and permissions are documented.</span></label><button className="artist-submit" type="submit">Submit artist application <span>→</span></button></form><p className="artist-form-note">Application form interface is prepared; secure submission will be enabled with the connected artist onboarding flow.</p></section>}
      <section className="artist-panel"><div className="artist-panel-title"><div><span className="eyebrow">YOUR WORKSPACE</span><h2>Music submissions</h2><p>Drafts and reviewed submissions associated with your profile.</p></div><UploadCloud size={22}/></div>{canSubmit ? <div className="artist-upload-ready"><BadgeCheck size={18}/><div><b>Submission access enabled</b><span>You can create catalogue drafts. Audio file storage and final release review are separate steps.</span></div><Link href="/dashboard/artist/new-track">Create track draft →</Link></div> : <div className="artist-locked"><ShieldCheck size={20}/><div><b>Music uploads are locked</b><span>Artist verification is required before music can enter the catalogue. This protects rights holders and buyers.</span></div></div>}
      <div className="artist-track-list">{tracks.length ? tracks.map(track=><div className="artist-track-row" key={track.id}><div className="artist-track-icon"><Disc3 size={17}/></div><div><b>{track.title}</b><span>{track.type === "EXCLUSIVE" ? "Exclusive catalogue" : "Music store"} · {new Date(track.createdAt).toLocaleDateString()}</span></div><span className="artist-track-state">{track.status.replaceAll("_"," ")}</span></div>) : <div className="artist-empty"><Disc3 size={23}/><b>No submissions yet</b><span>Your submitted music will appear here.</span></div>}</div></section>
      <section className="artist-info-strip"><ShieldCheck size={16}/><span>Every release is reviewed for ownership, authorisation and metadata before it can be published. Exclusive tracks are only available through verified industry access.</span></section>
    </div>
  </main>;
}
