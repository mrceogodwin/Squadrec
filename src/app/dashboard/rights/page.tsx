import Link from "next/link";
import {redirect} from "next/navigation";
import {auth} from "@/auth";
import {prisma} from "@/lib/prisma";
import {ArrowLeft,ScrollText,ShieldCheck} from "lucide-react";
import RightsRegisterClient from "./rights-register-client";
export default async function RightsPage(){
 const s=await auth();if(!s?.user?.id)redirect("/sign-in");
 const admin=["ADMIN","SUPER_ADMIN"].includes(s.user.role);
 const [records,ready]=await Promise.all([
  prisma.rightsRecord.findMany({where:admin?{}:{OR:[{grantorId:s.user.id},{granteeId:s.user.id}]},orderBy:{createdAt:"desc"},include:{track:{select:{title:true,artistProfile:{select:{stageName:true}}}},grantor:{select:{name:true,email:true}},grantee:{select:{name:true,email:true}},recorder:{select:{name:true,email:true}}}}),
  admin?prisma.contract.findMany({where:{status:"COMPLETED",signedAt:{not:null},completedAt:{not:null},rightsRecord:null},include:{offer:{include:{buyer:{select:{name:true,email:true}},track:{select:{title:true,artistProfile:{select:{stageName:true}}}}}}}}):Promise.resolve([])
 ]);
 const rows=records.map(r=>({id:r.id,track:r.track.title,artist:r.track.artistProfile.stageName,grantor:r.grantor.name||r.grantor.email,grantee:r.grantee.name||r.grantee.email,recorder:r.recorder.name||r.recorder.email,type:r.rightsType,territory:r.territory,duration:r.durationMonths,effective:r.effectiveAt.toISOString(),created:r.createdAt.toISOString(),contractId:r.contractId}));
 const pending=ready.map(c=>({id:c.id,track:c.offer.track.title,artist:c.offer.track.artistProfile.stageName,buyer:c.offer.buyer.name||c.offer.buyer.email,type:c.contractType,completed:c.completedAt!.toISOString()}));
 return <main className="artist-dashboard"><header className="artist-top"><Link href="/dashboard" className="artist-back"><ArrowLeft size={16}/> Account</Link><Link href="/" className="artist-top-brand"><span className="brand-symbol">SR</span> SQUADREC <span>RIGHTS REGISTER</span></Link></header><div className="artist-wrap"><div className="artist-heading"><div><span className="eyebrow">RIGHTS MANAGEMENT · AUDIT TRAIL</span><h1>Rights &<br/><em>ownership.</em></h1><p>A controlled record of completed music-rights transactions.</p></div><div className="artist-heading-mark"><ScrollText size={38}/></div></div><div className="artist-info-strip"><ShieldCheck size={16}/><span>Entries require a signed contract and verified completed payment. This operational register is not a substitute for legal advice or external rights filings.</span></div><RightsRegisterClient initialRecords={rows} pending={pending} admin={admin}/></div></main>;
}