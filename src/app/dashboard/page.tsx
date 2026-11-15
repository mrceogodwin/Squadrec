import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  ArrowRight, AudioLines, BadgeCheck, Disc3, Headphones, Library,
  ShieldCheck, ShoppingBag, UserRound, ScrollText, Bell, Building2,
  FileSignature, Music2
} from "lucide-react";

export default async function AccountDashboard() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const [user, purchases, playlists, artist, offers] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, role: true, accountType: true },
    }),
    prisma.purchase.count({ where: { buyerId: session.user.id, status: "PAID" } }),
    prisma.playlist.count({ where: { userId: session.user.id } }),
    prisma.artistProfile.findUnique({
      where: { userId: session.user.id },
      select: { verificationStatus: true },
    }),
    prisma.acquisitionOffer.count({ where: { buyerId: session.user.id } }),
  ]);

  const accountType = user?.accountType ?? "LISTENER";
  const accountLabels: Record<string, string> = {
    LISTENER: "Music listener",
    ARTIST: "Artist / Creator",
    RIGHTS_HOLDER: "Rightsholder",
    LABEL_PUBLISHER: "Label / Publisher",
  };
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(user?.role ?? "");
  const isIndustryBuyer = ["INDUSTRY_BUYER", "ADMIN", "SUPER_ADMIN"].includes(user?.role ?? "");

  const links = [
    { href: "/", title: "Discover music", description: "Browse approved releases", icon: Headphones },
    { href: "/library", title: "Your library", description: "Create and manage private playlists", icon: Library },
    { href: "/dashboard/notifications", title: "Notifications", description: "Offers, contracts and account updates", icon: Bell },
    ...(accountType === "ARTIST" ? [
      { href: "/dashboard/artist", title: "Artist Studio", description: artist ? `Application: ${artist.verificationStatus.toLowerCase().replaceAll("_", " ")}` : "Manage your artist profile and submissions", icon: Music2 },
      { href: "/dashboard/contracts", title: "Contract register", description: "Review music agreements and transfer progress", icon: FileSignature },
      { href: "/dashboard/rights", title: "Rights ownership register", description: "View completed rights transactions", icon: ScrollText },
    ] : []),
    ...(accountType === "RIGHTS_HOLDER" ? [
      { href: "/dashboard/rights", title: "Rights ownership register", description: "Review recorded rights and completed transfers", icon: ScrollText },
      { href: "/dashboard/contracts", title: "Contract register", description: "Track agreements involving your music rights", icon: FileSignature },
    ] : []),
    ...(accountType === "LABEL_PUBLISHER" ? [
      { href: "/dashboard/industry", title: "Label / Publisher desk", description: "Manage catalogue enquiries and acquisition activity", icon: Building2 },
      { href: "/dashboard/industry/verification", title: "Verify industry access", description: "Submit company credentials for private catalogue access", icon: ShieldCheck },
      { href: "/dashboard/contracts", title: "Contract register", description: "Track acquisition agreements and transfer progress", icon: FileSignature },
    ] : []),
    ...(accountType === "LISTENER" ? [
      { href: "/dashboard/artist", title: "Apply for Artist Studio", description: "Request artist and music submission access", icon: BadgeCheck },
      { href: "/dashboard/industry/verification", title: "Industry buyer verification", description: "Apply for verified industry catalogue access", icon: Building2 },
    ] : []),
    ...(isIndustryBuyer && accountType !== "LABEL_PUBLISHER" ? [
      { href: "/dashboard/industry", title: "Industry desk", description: "Manage private catalogue enquiries", icon: ShieldCheck },
      { href: "/dashboard/contracts", title: "Contract register", description: "Track rights agreements and ownership transfers", icon: FileSignature },
    ] : []),
    ...(isAdmin ? [
      { href: "/dashboard/admin", title: "Admin review centre", description: "Review artist, music and buyer applications", icon: BadgeCheck },
    ] : []),
  ];

  const stats = [
    { label: "Purchased tracks", value: purchases, icon: ShoppingBag },
    { label: "Your playlists", value: playlists, icon: Library },
    { label: "Acquisition enquiries", value: offers, icon: ShieldCheck },
  ];

  return (
    <main className="artist-dashboard">
      <header className="artist-top">
        <Link href="/" className="artist-back"><ArrowRight size={16}/> Discovery</Link>
        <Link href="/" className="artist-top-brand"><span className="brand-symbol">SR</span> SQUADREC <span>YOUR ACCOUNT</span></Link>
      </header>
      <div className="artist-wrap">
        <div className="artist-heading">
          <div>
            <span className="eyebrow"><UserRound size={13}/> {accountLabels[accountType] ?? "SQUADREC"} WORKSPACE</span>
            <h1>Welcome back,<br/><em>{user?.name || "music lover"}.</em></h1>
            <p>Your {accountLabels[accountType]?.toLowerCase() ?? "SQUADREC"} workspace, music activity and account tools live here.</p>
          </div>
          <div className="artist-heading-mark"><Disc3 size={40}/></div>
        </div>
        <div className="account-stats">
          {stats.map((item) => { const Icon = item.icon; return <div className="account-stat" key={item.label}><Icon size={18}/><span>{item.label}</span><b>{item.value}</b></div>; })}
        </div>
        <section className="artist-panel">
          <div className="artist-panel-title">
            <div><span className="eyebrow">YOUR SQUADREC</span><h2>{accountLabels[accountType] ?? "Account"} tools</h2><p>Quick access to the areas relevant to your account.</p></div>
            <AudioLines size={22}/>
          </div>
          <div className="account-links">
            {links.map((item) => { const Icon = item.icon; return <Link href={item.href} className="account-link" key={item.href + item.title}><Icon/><span><b>{item.title}</b><small>{item.description}</small></span><ArrowRight/></Link>; })}
          </div>
        </section>
      </div>
    </main>
  );
}
