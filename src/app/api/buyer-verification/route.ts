import {NextResponse} from "next/server";
import {put} from "@vercel/blob";
import {auth} from "@/auth";
import {prisma} from "@/lib/prisma";
export const runtime="nodejs";
const MAX=5*1024*1024;
export async function POST(req:Request){
 const s=await auth();if(!s?.user?.id)return NextResponse.json({error:"Sign in first."},{status:401});
 const u=await prisma.user.findUnique({where:{id:s.user.id},select:{role:true,verificationStatus:true,isActive:true}});
 if(!u?.isActive)return NextResponse.json({error:"This account is inactive."},{status:403});
 if(["ARTIST","AUTHORISED_UPLOADER"].includes(u.role))return NextResponse.json({error:"Use a separate listener account for industry buyer verification so your existing artist/uploader permissions are not changed."},{status:409});
 if(["ADMIN","SUPER_ADMIN"].includes(u.role))return NextResponse.json({error:"Administrator accounts do not need buyer verification."},{status:400});
 if(u.role==="INDUSTRY_BUYER"&&u.verificationStatus==="VERIFIED")return NextResponse.json({error:"This buyer account is already verified."},{status:409});
 if(u.verificationStatus==="PENDING")return NextResponse.json({error:"Your verification is already pending review."},{status:409});
 const f=await req.formData();const company=String(f.get("companyName")||"").trim();const title=String(f.get("jobTitle")||"").trim();const website=String(f.get("website")||"").trim();const file=f.get("document");
 if(company.length<2||company.length>160||title.length<2||title.length>120)return NextResponse.json({error:"Enter your company and professional role."},{status:400});
 if(website&&!/^https?:\/\/.{3,}$/i.test(website))return NextResponse.json({error:"Enter a valid company or professional website URL."},{status:400});
 if(!(file instanceof File)||file.size<1||file.size>MAX)return NextResponse.json({error:"Upload one supporting document up to 5 MB."},{status:400});
 const allowed:Record<string,string[]>={"application/pdf":["pdf"],"image/jpeg":["jpg","jpeg"],"image/png":["png"],"image/webp":["webp"]};const ext=file.name.split(".").pop()?.toLowerCase()||"";
 if(!allowed[file.type]?.includes(ext))return NextResponse.json({error:"Document must be PDF, JPG, PNG or WEBP."},{status:415});
 const bytes=new Uint8Array(await file.slice(0,16).arrayBuffer());
 const signatures:Record<string,(b:Uint8Array)=>boolean>={
  "application/pdf":b=>b.length>=5&&String.fromCharCode(...b.slice(0,5))==="%PDF-",
  "image/jpeg":b=>b.length>=3&&b[0]===0xff&&b[1]===0xd8&&b[2]===0xff,
  "image/png":b=>b.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v),
  "image/webp":b=>b.length>=12&&String.fromCharCode(...b.slice(0,4))==="RIFF"&&String.fromCharCode(...b.slice(8,12))==="WEBP",
 };
 if(!signatures[file.type]?.(bytes))return NextResponse.json({error:"The document contents do not match the selected file type."},{status:415});
 const blob=await put(`buyer-verification/${s.user.id}/${Date.now()}.${ext}`,file,{access:"private",addRandomSuffix:true,contentType:file.type,cacheControlMaxAge:60});
 await prisma.$transaction([prisma.user.update({where:{id:s.user.id},data:{verificationStatus:"PENDING"}}),prisma.auditLog.create({data:{actorId:s.user.id,action:"BUYER_VERIFICATION_SUBMITTED",entityType:"User",entityId:s.user.id,metadata:{companyName:company,jobTitle:title,website:website||null,documentObjectKey:blob.pathname,fileName:file.name,contentType:file.type}}})]);
 return NextResponse.json({success:true,status:"PENDING",message:"Your buyer verification has been submitted for administrator review."},{status:201});
}