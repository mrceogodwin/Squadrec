import "../artist/artist-overview.css";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  ArrowLeft, ArrowRight, BadgeCheck, FileSignature, LibraryBig,
  ScrollText, ShieldCheck, Sparkles, Clock3, Music2
} from "lucide-react";

const dateLabel=(date:Date)=>new Intl.DateTimeFormat("en",{day:"numeric",month:"short",year:"numeric"}).format(date);
export default async function RightsholderWorkspace(){
 const session=await auth();
 if(!session?.user?.id)redirect("/sign-in");
 const user=await prisma.user.findUnique({where:{id:session.user.id},select:{name:true,accountType:true,role:true}});
 if(user?.accountType!=="RIGHTS_HOLDER"&& !["ADMIN","SUPER_ADMIN"].includes(session.user.role))redirect("/dashboard");
 const [records,contracts,grantCount,acquiredCount,activeContracts]=await Promise.all([
  prisma.rightsRecord.findMany({where:{OR:[{grantorId:session.user.id},{granteeId:session.user.id}]},orderBy:{createdAt:"desc"},take:6,include:{track:{select:{title:true,artistProfile:{select:{stageName:true}}}},grantor:{select:{name:true,email:true}},grantee:{select:{name:true,email:true}}}}),
  prisma.contract.findMany({where:{offer:{OR:[{buyerId:session.user.id},{track:{artistProfile:{userId:session.user.id}}}] }},select:{id:true,status:true,contractType:true,createdAt:true,offer:{select:{track:{select:{title:true,artistProfile:{select:{stageName:true}}}},buyer:{select:{name:true,email:true}}}}},orderBy:{createdAt:"desc"},take:4}),
  prisma.rightsRecord.count({where:{grantorId:session.user.id}}),
  prisma.rightsRecord.count({where:{granteeId:session.user.id}}),
  prisma.contract.count({where:{status:{notIn:["COMPLETED","CANCELLED"]},offer:{OR:[{buyerId:session.user.id},{track:{artistProfile:{userId:session.user.id}}}]}}})
 ]);
 const stats=[
  {label:"Rights granted",value:grantCount,detail:"Recorded transactions",icon:ScrollText},
  {label:"Rights acquired",value:acquiredCount,detail:"Recorded acquisitions",icon:BadgeCheck},
  {label:"Active agreements",value:activeContracts,detail:"Not yet completed",icon:FileSignature},
  {label:"Portfolio entries",value:records.length,detail:"Recent register entries",icon:LibraryBig}
 ];
 return <main className="artist-dashboard sq-artist-home sq-rights-home">
  <header className="artist-top sq-artist-top">
   <Link href="/dashboard" className="artist-back"><ArrowLeft size={16}/> Account</Link>
   <Link href="/dashboard/rightsholder" className="artist-top-brand"><img className="sq-brand-mark" src="/squadrec-purple-mark.svg" alt="" /> SQUADREC <span>RIGHTSHOLDER DESK</span></Link>
   <Link href="/dashboard/notifications" className="sq-artist-bell" aria-label="Notifications"><Sparkles size={17}/></Link>
  </header>
  <div className="artist-wrap sq-rights-wrap">
   <div className="sq-artist-welcome">
    <div><span className="eyebrow"><ShieldCheck size={13}/> RIGHTS & OWNERSHIP WORKSPACE</span>
     <h1>Welcome back,<br/><em>{user?.name||"Rightsholder"}.</em></h1>
     <p>Your recorded music rights, agreements and ownership activity in one secure workspace.</p>
    </div>
    <span className="sq-artist-verified"><i className="sq-artist-status-dot verified"/> RIGHTSHOLDER ACCOUNT</span>
   </div>
   <section className="sq-rights-hero">
    <div><span className="eyebrow">YOUR RIGHTS PORTFOLIO</span><h2>Clarity over<br/><em>every right.</em></h2><p>Follow recorded rights grants, acquisitions and the agreements connected to your SQUADREC activity.</p>
     <Link href="/dashboard/rights" className="sq-artist-primary"><ScrollText size={16}/> Open rights register <ArrowRight size={15}/></Link>
    </div>
    <div className="sq-rights-hero-art" aria-hidden="true"><div className="sq-rights-orbit"><ShieldCheck size={43}/><span>SR</span></div><div className="sq-rights-orbit-ring"/></div>
   </section>
   <section className="sq-artist-stats" aria-label="Rights portfolio statistics">
    {stats.map(item=>{const Icon=item.icon;return <article className="sq-artist-stat" key={item.label}><span className="sq-artist-stat-icon"><Icon size={18}/></span><span className="sq-artist-stat-label">{item.label}</span><strong>{item.value.toLocaleString()}</strong><small>{item.detail}</small></article>;})}
   </section>
   <section className="artist-panel sq-rights-panel">
    <div className="artist-panel-title"><div><span className="eyebrow">OWNERSHIP ACTIVITY</span><h2>Recent rights records</h2><p>Transactions formally recorded after agreement completion.</p></div><Link href="/dashboard/rights" className="sq-artist-add">View register <ArrowRight size={14}/></Link></div>
    {records.length?<div className="sq-rights-activity">{records.map(record=><article className="sq-rights-activity-row" key={record.id}>
      <span className="sq-rights-activity-icon"><BadgeCheck size={18}/></span>
      <div><b>{record.track.title}</b><small>{record.track.artistProfile.stageName} · {record.rightsType.replaceAll("_"," ")}</small><small>{record.grantorId===session.user.id?"You granted rights":"You acquired rights"} · {record.territory}</small></div>
      <time>{dateLabel(record.effectiveAt)}</time>
     </article>)}</div>:<div className="sq-rights-empty"><span><Music2 size={23}/></span><b>Your rights portfolio starts here.</b><p>When a signed agreement and payment are verified and the transaction is formally recorded, your rights activity will appear here.</p><Link href="/dashboard/rights">Open rights register <ArrowRight size={14}/></Link></div>}
   </section>
   <section className="artist-panel sq-rights-panel">
    <div className="artist-panel-title"><div><span className="eyebrow">AGREEMENTS & TRANSFERS</span><h2>Contract activity</h2><p>Follow the status of agreements involving your rights.</p></div><FileSignature size={22}/></div>
    {contracts.length?contracts.map(contract=><article className="sq-rights-contract-row" key={contract.id}>
      <span><FileSignature size={17}/></span><div><b>{contract.offer.track.title}</b><small>{contract.offer.track.artistProfile.stageName} · {contract.contractType.replaceAll("_"," ")}</small></div><em>{contract.status.replaceAll("_"," ")}</em>
     </article>):<div className="sq-rights-empty compact"><span><Clock3 size={21}/></span><b>No contract activity yet</b><p>Agreements connected to your rights will appear here as they are prepared and reviewed.</p></div>}
    <Link href="/dashboard/contracts" className="sq-rights-all-contracts">Open contract register <ArrowRight size={15}/></Link>
   </section>
   <div className="sq-artist-footnote"><ShieldCheck size={15}/> This workspace displays records linked to your SQUADREC account. It does not independently verify external ownership claims or replace official rights registrations.</div>
  </div>
  <nav className="sq-artist-mobile-nav sq-rights-mobile-nav" aria-label="Rightsholder navigation">
   <Link href="/dashboard/rightsholder" className="active"><ShieldCheck size={19}/><span>Overview</span></Link>
   <Link href="/dashboard/rights"><ScrollText size={19}/><span>Rights</span></Link>
   <Link href="/dashboard/contracts"><FileSignature size={20}/><span>Contracts</span></Link>
   <Link href="/dashboard/notifications"><Sparkles size={19}/><span>Updates</span></Link>
   <Link href="/dashboard"><LibraryBig size={19}/><span>Account</span></Link>
  </nav>
 </main>;
}
