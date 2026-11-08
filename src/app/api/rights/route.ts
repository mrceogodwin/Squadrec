import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
const input = z.object({ contractId:z.string().min(1), territory:z.string().trim().min(2).max(120).default("Worldwide"), durationMonths:z.number().int().positive().max(1200).nullable().optional() });
export async function GET(){
 const s=await auth(); if(!s?.user?.id)return NextResponse.json({error:"Sign in required."},{status:401});
 const admin=["ADMIN","SUPER_ADMIN"].includes(s.user.role);
 const records=await prisma.rightsRecord.findMany({where:admin?{}:{OR:[{grantorId:s.user.id},{granteeId:s.user.id}]},orderBy:{createdAt:"desc"},include:{track:{select:{title:true,artistProfile:{select:{stageName:true}}}},grantor:{select:{name:true,email:true}},grantee:{select:{name:true,email:true}},recorder:{select:{name:true,email:true}}}});
 const readyContracts=admin?await prisma.contract.findMany({where:{status:"COMPLETED",signedAt:{not:null},completedAt:{not:null},rightsRecord:null},orderBy:{completedAt:"desc"},include:{offer:{include:{buyer:{select:{name:true,email:true}},track:{select:{title:true,artistProfile:{select:{stageName:true}}}}}}}}):[];
 return NextResponse.json({records,readyContracts});
}
export async function POST(req:Request){
 const s=await auth();if(!s?.user?.id)return NextResponse.json({error:"Sign in required."},{status:401});
 if(!["ADMIN","SUPER_ADMIN"].includes(s.user.role))return NextResponse.json({error:"Administrator access required."},{status:403});
 const p=input.safeParse(await req.json().catch(()=>null));if(!p.success)return NextResponse.json({error:"Invalid register details."},{status:400});
 const c=await prisma.contract.findUnique({where:{id:p.data.contractId},include:{offer:{include:{buyer:{select:{id:true}},track:{include:{artistProfile:{select:{userId:true}}}}}}}});
 if(!c)return NextResponse.json({error:"Contract not found."},{status:404});
 if(c.status!=="COMPLETED"||!c.signedAt||!c.completedAt)return NextResponse.json({error:"Only signed and payment-verified contracts can be recorded."},{status:409});
 if(await prisma.rightsRecord.findUnique({where:{contractId:c.id}}))return NextResponse.json({error:"This contract is already registered."},{status:409});
 const record=await prisma.$transaction(async tx=>{
  const r=await tx.rightsRecord.create({data:{contractId:c.id,trackId:c.offer.trackId,grantorId:c.offer.track.artistProfile.userId,granteeId:c.offer.buyerId,recordedById:s.user.id,rightsType:c.contractType,territory:p.data.territory,durationMonths:p.data.durationMonths??null,effectiveAt:c.completedAt!}});
  await tx.auditLog.create({data:{actorId:s.user.id,action:"RIGHTS_REGISTER_ENTRY_CREATED",entityType:"RightsRecord",entityId:r.id,metadata:{contractId:c.id,trackId:c.offer.trackId,rightsType:c.contractType}}});
  return r;
 });
 return NextResponse.json({record},{status:201});
}