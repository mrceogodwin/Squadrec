import {NextResponse} from "next/server";
import {z} from "zod";
import {auth} from "@/auth";
import {prisma} from "@/lib/prisma";

const schema=z.object({
 contractId:z.string().min(1),
 effectiveAt:z.string().datetime(),
 territory:z.string().trim().min(2).max(120).default("Worldwide"),
 durationMonths:z.number().int().positive().max(1200).nullable().optional(),
});
async function isAdmin(){const s=await auth();return s?.user?.id&&["ADMIN","SUPER_ADMIN"].includes(s.user.role)?s:null;}
export async function GET(){
 const s=await isAdmin();if(!s)return NextResponse.json({error:"Administrator access required."},{status:403});
 const contracts=await prisma.contract.findMany({
  where:{status:"COMPLETED",signedAt:{not:null},rightsRecord:null},
  include:{offer:{include:{buyer:{select:{id:true,name:true,email:true}},track:{select:{id:true,title:true,type:true,artistProfile:{select:{userId:true,stageName:true,user:{select:{id:true,name:true,email:true}}}}}}}}},
  orderBy:{completedAt:"desc"},take:100
 });
 const rows=await Promise.all(contracts.map(async c=>{
  const event=await prisma.auditLog.findFirst({where:{entityType:"Contract",entityId:c.id,action:"SIGNATURES_VERIFIED_BY_PROVIDER"},select:{id:true,createdAt:true,metadata:true}});
  return {id:c.id,type:c.contractType,status:c.status,signedAt:c.signedAt?.toISOString(),completedAt:c.completedAt?.toISOString(),signatureVerified:Boolean(event),signatureEventAt:event?.createdAt.toISOString()||null,track:{id:c.offer.track.id,title:c.offer.track.title,type:c.offer.track.type},grantor:{id:c.offer.track.artistProfile.user.id,name:c.offer.track.artistProfile.user.name||c.offer.track.artistProfile.stageName,email:c.offer.track.artistProfile.user.email},grantee:{id:c.offer.buyer.id,name:c.offer.buyer.name||c.offer.buyer.email,email:c.offer.buyer.email}};
 }));
 const records=await prisma.rightsRecord.findMany({orderBy:{createdAt:"desc"},take:100,include:{track:{select:{title:true}},grantor:{select:{name:true,email:true}},grantee:{select:{name:true,email:true}},recorder:{select:{name:true,email:true}}}});
 return NextResponse.json({eligible:rows,records:records.map(r=>({id:r.id,contractId:r.contractId,track:r.track.title,rightsType:r.rightsType,territory:r.territory,durationMonths:r.durationMonths,effectiveAt:r.effectiveAt.toISOString(),createdAt:r.createdAt.toISOString(),grantor:r.grantor.name||r.grantor.email,grantee:r.grantee.name||r.grantee.email,recordedBy:r.recorder.name||r.recorder.email}))});
}
export async function POST(req:Request){
 const s=await isAdmin();if(!s?.user?.id)return NextResponse.json({error:"Administrator access required."},{status:403});
 const parsed=schema.safeParse(await req.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Invalid rights registration details.",details:parsed.error.flatten()},{status:400});
 const c=await prisma.contract.findUnique({where:{id:parsed.data.contractId},include:{offer:{include:{buyer:{select:{id:true}},track:{include:{artistProfile:{select:{userId:true}}}}}},rightsRecord:true}});
 if(!c)return NextResponse.json({error:"Contract not found."},{status:404});
 if(c.rightsRecord)return NextResponse.json({error:"A rights record already exists for this contract."},{status:409});
 if(c.contractType!=="OWNERSHIP_TRANSFER")return NextResponse.json({error:"Only ownership-transfer contracts can create an ownership record."},{status:400});
 if(c.status!=="COMPLETED"||!c.signedAt||!c.completedAt)return NextResponse.json({error:"The contract must be signed and payment-completed before rights registration."},{status:409});
 const signature=await prisma.auditLog.findFirst({where:{entityType:"Contract",entityId:c.id,action:"SIGNATURES_VERIFIED_BY_PROVIDER"},select:{id:true}});
 if(!signature)return NextResponse.json({error:"Provider-verified signatures are not recorded. Ownership registration is blocked."},{status:409});
 const trackId=c.offer.trackId,grantorId=c.offer.track.artistProfile.userId,granteeId=c.offer.buyerId;
 try{
  const record=await prisma.$transaction(async tx=>{
   const created=await tx.rightsRecord.create({data:{contractId:c.id,trackId,grantorId,granteeId,recordedById:s.user.id,rightsType:c.contractType,territory:parsed.data.territory,durationMonths:parsed.data.durationMonths??null,effectiveAt:new Date(parsed.data.effectiveAt)}});
   await tx.auditLog.create({data:{actorId:s.user.id,action:"RIGHTS_REGISTERED",entityType:"Contract",entityId:c.id,metadata:{rightsRecordId:created.id,trackId,grantorId,granteeId,rightsType:c.contractType,territory:created.territory,effectiveAt:created.effectiveAt.toISOString(),signatureEvidenceEventId:signature.id}}});
   return created;
  });
  return NextResponse.json({success:true,recordId:record.id},{status:201});
 }catch(e){return NextResponse.json({error:"Rights record could not be created; it may already have been registered."},{status:409});}
}