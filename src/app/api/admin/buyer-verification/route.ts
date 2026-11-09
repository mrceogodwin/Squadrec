import {NextResponse} from "next/server";
import {z} from "zod";
import {auth} from "@/auth";
import {prisma} from "@/lib/prisma";
const body=z.object({userId:z.string().min(1),decision:z.enum(["approve","reject"]),note:z.string().trim().max(1000).optional()});
export async function GET(){
 const s=await auth();if(!s?.user?.id||!["ADMIN","SUPER_ADMIN"].includes(s.user.role))return NextResponse.json({error:"Administrator access required."},{status:403});
 const events=await prisma.auditLog.findMany({where:{action:"BUYER_VERIFICATION_SUBMITTED",entityType:"User"},orderBy:{createdAt:"desc"},take:100});const latest=new Map<string,typeof events[number]>();for(const e of events)if(!latest.has(e.entityId))latest.set(e.entityId,e);
 const ids=[...latest.keys()];const users=ids.length?await prisma.user.findMany({where:{id:{in:ids},verificationStatus:"PENDING"},select:{id:true,name:true,email:true,createdAt:true,role:true,verificationStatus:true}}):[];const byId=new Map(users.map(u=>[u.id,u]));
 const applications=[...latest.values()].filter(e=>byId.has(e.entityId)).map(e=>{const m=e.metadata as Record<string,unknown>|null;const u=byId.get(e.entityId)!;return {userId:u.id,name:u.name,email:u.email,role:u.role,submittedAt:e.createdAt.toISOString(),companyName:String(m?.companyName||""),jobTitle:String(m?.jobTitle||""),website:typeof m?.website==="string"?m.website:null,fileName:String(m?.fileName||"Supporting document"),documentObjectKey:String(m?.documentObjectKey||"")};});return NextResponse.json({applications});
}
export async function POST(req:Request){
 const s=await auth();if(!s?.user?.id||!["ADMIN","SUPER_ADMIN"].includes(s.user.role))return NextResponse.json({error:"Administrator access required."},{status:403});const p=body.safeParse(await req.json().catch(()=>null));if(!p.success)return NextResponse.json({error:"Invalid review decision."},{status:400});
 const user=await prisma.user.findUnique({where:{id:p.data.userId},select:{id:true,verificationStatus:true,role:true,isActive:true}});if(!user||user.verificationStatus!=="PENDING"||!user.isActive)return NextResponse.json({error:"This verification is no longer pending or the account is inactive."},{status:409});
 const nextStatus=p.data.decision==="approve"?"VERIFIED":"REJECTED";
 const updated=await prisma.$transaction(async tx=>{
  const changed=await tx.user.updateMany({where:{id:user.id,verificationStatus:"PENDING",isActive:true},data:{verificationStatus:nextStatus,...(p.data.decision==="approve"?{role:"INDUSTRY_BUYER"}:{})}});
  if(changed.count!==1)return false;
  await tx.auditLog.create({data:{actorId:s.user.id,action:p.data.decision==="approve"?"BUYER_VERIFICATION_APPROVED":"BUYER_VERIFICATION_REJECTED",entityType:"User",entityId:user.id,metadata:{note:p.data.note||null,previousRole:user.role}}});
  return true;
 });
 if(!updated)return NextResponse.json({error:"This application was already reviewed or the account changed. Refresh the queue."},{status:409});
 return NextResponse.json({success:true,status:nextStatus});
}