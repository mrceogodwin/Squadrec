import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ArrowLeft, BadgeCheck, FileAudio, ShieldCheck, Users, Building2, BookOpen } from "lucide-react";
import ReviewCentre from "./review-centre";

export default async function AdminDashboard() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) redirect("/dashboard");
  const [pendingArtists,pendingTracks,approvedTracks] = await Promise.all([
    prisma.artistProfile.count({where:{verificationStatus:"PENDING"}}),
    prisma.track.count({where:{status:"PENDING_REVIEW"}}),
    prisma.track.count({where:{status:"APPROVED"}}),
  ]);
  return <main className="artist-dashboard sq-dashboard">
    <header className="artist-top"><Link href="/dashboard" className="artist-back"><ArrowLeft size={16}/> Account</Link><Link href="/" className="artist-top-brand"><span className="brand-symbol">SR</span> SQUADREC <span>ADMIN REVIEW</span></Link><span className="sq-admin-chip"><ShieldCheck size={14}/> SUPER ADMIN</span></header>
    <div className="artist-wrap sq-admin-wrap">
      <div className="artist-heading"><div><span className="eyebrow">SQUADREC CONTROL ROOM</span><h1>Review. Verify.<br/><em>Protect ownership.</em></h1><p>Review artist identities, rights evidence and music submissions before anything enters the public catalogue.</p></div><div className="artist-heading-mark"><ShieldCheck size={40}/></div></div>
      <Link href="/dashboard/admin/buyer-verification" className="sq-buyer-admin-link"><Building2 size={18}/><span><b>Industry buyer verification</b><small>Review company credentials before granting private catalogue access</small></span><b>Open queue →</b></Link><Link href="/dashboard/admin/rights-register" className="sq-buyer-admin-link"><BookOpen size={18}/><span><b>Rights ownership register</b><small>Review and record completed ownership transfers</small></span><b>Open register →</b></Link><div className="sq-admin-stats"><div><Users/><span>Artist applications</span><b>{pendingArtists}</b><small>Waiting for review</small></div><div><FileAudio/><span>Track submissions</span><b>{pendingTracks}</b><small>Waiting for review</small></div><div><BadgeCheck/><span>Approved tracks</span><b>{approvedTracks}</b><small>In catalogue</small></div></div>
      <section className="sq-admin-panel"><div className="sq-admin-panel-head"><div><span className="eyebrow">MODERATION WORKSPACE</span><h2>Review queue</h2><p>Check every detail before granting access or approving music.</p></div><span className="sq-admin-secure"><ShieldCheck size={15}/> Private admin area</span></div><ReviewCentre/></section>
      <div className="sq-review-foot"><ShieldCheck size={16}/> Signed-in administrator: {session.user.name||session.user.email}. All actions are permission-checked on the server.</div>
    </div>
  </main>;
}
