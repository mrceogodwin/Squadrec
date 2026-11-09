import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const labels:Record<string,string>={
 ACQUISITION_OFFER_SUBMITTED:"A new acquisition offer was submitted",
 ACQUISITION_OFFER_ACCEPT:"Your acquisition offer was accepted",
 ACQUISITION_OFFER_DECLINE:"Your acquisition offer was declined",
 ACQUISITION_OFFER_COUNTER:"A rights holder sent a counteroffer",
 CONTRACT_DRAFT_CREATED:"A contract draft was prepared",
 CONTRACT_SENT_FOR_REVIEW:"An agreement was sent for your review",
 CONTRACT_TERMS_ACCEPTED_PENDING_SIGNATURE:"The buyer accepted the terms; signatures are still required",
 CONTRACT_CHANGES_REQUESTED:"Changes were requested to an agreement",
 PAYMENT_INITIALIZED:"A contract payment was initiated",
 PAYMENT_VERIFIED:"A contract payment was verified",
 RIGHTS_REGISTER_ENTRY_CREATED:"A rights transaction was added to the register",
 ARTIST_APPLICATION_APPROVED:"Your artist application was approved",
 ARTIST_APPLICATION_REJECTED:"Your artist application was not approved",
 TRACK_APPROVED:"Your track was approved",
 TRACK_REJECTED:"Your track needs changes",
 BUYER_VERIFICATION_SUBMITTED:"Your industry buyer verification was submitted",
 BUYER_VERIFICATION_APPROVED:"Your industry buyer verification was approved",
 BUYER_VERIFICATION_REJECTED:"Your industry buyer verification was declined",
};
export async function GET(){
 const session=await auth();
 if(!session?.user?.id)return NextResponse.json({error:"Sign in required."},{status:401});
 const userId=session.user.id;
 const admin=["ADMIN","SUPER_ADMIN"].includes(session.user.role);
 const [offers,contracts,artist,tracks]=await Promise.all([
  prisma.acquisitionOffer.findMany({where:admin?{}:{OR:[{buyerId:userId},{track:{artistProfile:{userId}}}]},select:{id:true}}),
  prisma.contract.findMany({where:admin?{}:{offer:{OR:[{buyerId:userId},{track:{artistProfile:{userId}}}]}},select:{id:true}}),
  prisma.artistProfile.findUnique({where:{userId},select:{id:true}}),
  prisma.track.findMany({where:admin?{}:{OR:[{uploaderId:userId},{artistProfile:{userId}}]},select:{id:true}}),
 ]);
 const filters:any[]=[{entityType:"User",entityId:userId}];
 if(offers.length)filters.push({entityType:"AcquisitionOffer",entityId:{in:offers.map(x=>x.id)}});
 if(contracts.length)filters.push({entityType:"Contract",entityId:{in:contracts.map(x=>x.id)}});
 if(artist)filters.push({entityType:"ArtistProfile",entityId:artist.id});
 if(tracks.length)filters.push({entityType:"Track",entityId:{in:tracks.map(x=>x.id)}});
 const events=filters.length?await prisma.auditLog.findMany({where:{OR:filters},orderBy:{createdAt:"desc"},take:60,select:{id:true,action:true,entityType:true,entityId:true,createdAt:true,actorId:true,metadata:true}}):[];
 const notifications=events.filter(e=>labels[e.action]).map(e=>({
  id:e.id,title:labels[e.action],type:e.entityType,entityId:e.entityId,
  createdAt:e.createdAt.toISOString(),action:e.action,
  message:typeof e.metadata==="object"&&e.metadata&&"message" in e.metadata?String((e.metadata as {message?:unknown}).message||""):"",
  href:e.entityType==="Contract"?"/dashboard/contracts/"+e.entityId:e.entityType==="AcquisitionOffer"?"/dashboard/artist/offers":e.entityType==="Track"?"/dashboard/artist":e.entityType==="User"?"/dashboard/industry/verification":"/dashboard/artist",
 }));
 const buyerEvents=admin?await prisma.auditLog.findMany({where:{action:"BUYER_VERIFICATION_SUBMITTED",entityType:"User"},select:{entityId:true},distinct:["entityId"]}):[];
 const pendingBuyerIds=buyerEvents.map(e=>e.entityId);
 const pendingBuyerApplications=admin&&pendingBuyerIds.length?await prisma.user.count({where:{id:{in:pendingBuyerIds},verificationStatus:"PENDING"}}):0;
 const pending=admin?await prisma.$transaction([
  prisma.artistProfile.count({where:{verificationStatus:"PENDING"}}),
  prisma.track.count({where:{status:"PENDING_REVIEW"}}),
 ]):[0,0];
 return NextResponse.json({notifications,adminSummary:admin?{pendingArtistApplications:pending[0],pendingTracks:pending[1],pendingBuyerApplications}:null});
}