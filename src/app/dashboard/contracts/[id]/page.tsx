import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import PrintContractButton from "./print-button";
import ContractExecution from "./execution-tracker";

export default async function ContractDocumentPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  const contract = await prisma.contract.findUnique({
    where: { id: params.id },
    include: { offer: { include: {
      buyer: { select: { id: true, name: true, email: true } },
      track: { include: { artistProfile: { include: { user: { select: { id: true, name: true, email: true } } } } } },
    } } },
  });
  if (!contract) notFound();
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);
  const buyer = contract.offer.buyer;
  const rightsHolder = contract.offer.track.artistProfile.user;
  if (!isAdmin && buyer.id !== session.user.id && rightsHolder.id !== session.user.id) notFound();
  const money = contract.offer.amountMinor == null ? "To be agreed" : new Intl.NumberFormat("en-US", { style: "currency", currency: contract.offer.currency }).format(contract.offer.amountMinor / 100);
  return <main className="artist-dashboard sq-contract-document">
    <header className="artist-top sq-document-toolbar"><Link href="/dashboard/contracts" className="artist-back"><ArrowLeft size={16}/> Contract register</Link><span className="artist-top-brand"><span className="brand-symbol">SR</span> SQUADREC <span>AGREEMENT PREVIEW</span></span><PrintContractButton/></header>
    <article className="sq-document-sheet">
      <div className="sq-document-brand">SQUADREC <span>THE SOUND. THE CULTURE.</span></div>
      <div className="sq-document-kicker">PRIVATE CONTRACT DOCUMENT · {contract.contractType.replaceAll("_", " ")}</div>
      <h1>{contract.contractType === "OWNERSHIP_TRANSFER" ? "Music Rights Ownership Transfer Agreement" : "Exclusive Music Licence Agreement"}</h1>
      <p className="sq-document-intro">Draft agreement preview for legal and counterparty review. This document is not executed until all required parties complete a valid signature process.</p>
      <div className="sq-document-meta"><div><small>CONTRACT REFERENCE</small><b>{contract.id}</b></div><div><small>STATUS</small><b>{contract.status.replaceAll("_", " ")}</b></div><div><small>PROPOSED CONSIDERATION</small><b>{money}</b></div><div><small>PREPARED</small><b>{new Date(contract.createdAt).toLocaleDateString("en-GB")}</b></div></div>
      <section><h2>1. Parties</h2><p><b>Rights holder / artist:</b> {rightsHolder.name || contract.offer.track.artistProfile.stageName} ({rightsHolder.email})</p><p><b>Acquiring party:</b> {buyer.name || buyer.email} ({buyer.email})</p></section>
      <section><h2>2. Work covered</h2><p><b>Track:</b> {contract.offer.track.title}</p><p><b>Artist profile:</b> {contract.offer.track.artistProfile.stageName}</p><p><b>Agreement type:</b> {contract.contractType.replaceAll("_", " ")}</p></section>
      <section><h2>3. Commercial terms and conditions</h2><div className="sq-document-terms">{contract.terms}</div></section>
      <section><h2>4. Execution and effectiveness</h2><p>This draft does not itself assign copyright, master rights, publishing rights or any other interest. Any transfer or licence takes effect only as expressly stated in the final agreement, after all required parties have validly signed and all agreed conditions, including payment, have been satisfied.</p></section>
      <section><h2>5. Independent legal review</h2><p>Each party should obtain independent legal advice and confirm authority to enter this agreement. The parties should ensure the final document accurately identifies the rights, territory, duration, consideration, warranties, delivery obligations and effective date.</p></section>
      <ContractExecution contractId={contract.id}/><div className="sq-document-signatures"><div><b>Rights holder signature</b><span>Pending external signature workflow</span></div><div><b>Acquiring party signature</b><span>Pending external signature workflow</span></div></div>
      <div className="sq-document-footer"><ShieldCheck size={15}/> Private SQUADREC contract preview · Reference {contract.id}</div>
    </article>
  </main>;
}
