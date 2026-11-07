import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
export async function GET(){const s=await auth();if(!s?.user?.id||!["INDUSTRY_BUYER","ADMIN","SUPER_ADMIN"].includes(s.user.role))return NextResponse.json({error:"Verified industry access required."},{status:403});const tracks=await prisma.track.findMany({where:{type:"EXCLUSIVE",status:"APPROVED"},orderBy:{createdAt:"desc"},select:{id:true,title:true,description:true,previewSeconds:true,artworkUrl:true,artistProfile:{select:{stageName:true}},genre:{select:{name:true}}}});return NextResponse.json({tracks});}
