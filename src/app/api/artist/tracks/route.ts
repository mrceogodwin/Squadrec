import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
const schema=z.object({title:z.string().trim().min(1).max(160),description:z.string().trim().max(2000).optional(),genreId:z.string().optional(),type:z.enum(["RELEASED","EXCLUSIVE"]),priceMinor:z.number().int().positive().optional()});
function slugify(v:string){return v.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");}
export async function GET(){const s=await auth();if(!s?.user?.id)return NextResponse.json({error:"Sign in to view submissions."},{status:401});const tracks=await prisma.track.findMany({where:{uploaderId:s.user.id},orderBy:{createdAt:"desc"},select:{id:true,title:true,type:true,status:true,createdAt:true,genre:{select:{name:true}}}});return NextResponse.json({tracks});}
export async function POST(request:Request){
 const s=await auth();if(!s?.user?.id)return NextResponse.json({error:"Sign in to submit music."},{status:401});
 if(!["ARTIST","AUTHORISED_UPLOADER","ADMIN","SUPER_ADMIN"].includes(s.user.role))return NextResponse.json({error:"Artist or authorised uploader access is required."},{status:403});
 const profile=await prisma.artistProfile.findUnique({where:{userId:s.user.id}});if(!profile||profile.verificationStatus!=="VERIFIED")return NextResponse.json({error:"Your artist profile must be verified before submitting music."},{status:403});
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Check the track details and try again."},{status:400});
 if(parsed.data.genreId&&!await prisma.genre.findUnique({where:{id:parsed.data.genreId}}))return NextResponse.json({error:"Choose a valid genre."},{status:400});
 const slug=`${slugify(parsed.data.title)||"untitled"}-${Date.now().toString(36)}`;
 const track=await prisma.track.create({data:{title:parsed.data.title,slug,description:parsed.data.description||null,type:parsed.data.type,status:"DRAFT",artistProfileId:profile.id,uploaderId:s.user.id,genreId:parsed.data.genreId||null,priceMinor:parsed.data.type==="RELEASED"?parsed.data.priceMinor:null},select:{id:true,title:true,type:true,status:true,createdAt:true}});
 await prisma.auditLog.create({data:{actorId:s.user.id,action:"TRACK_DRAFT_CREATED",entityType:"Track",entityId:track.id}});
 return NextResponse.json({track},{status:201});
}