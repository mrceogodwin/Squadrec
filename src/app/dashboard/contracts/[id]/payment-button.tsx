"use client";
import { useState } from "react";
import { CreditCard } from "lucide-react";
export default function ContractPaymentButton({contractId}:{contractId:string}){
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 async function pay(){setBusy(true);setError("");try{const r=await fetch("/api/contracts/"+contractId+"/payment",{method:"POST"});const d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to start payment.");if(!d.authorizationUrl)throw new Error("Payment link was not returned.");window.location.assign(d.authorizationUrl);}catch(e){setError(e instanceof Error?e.message:"Unable to start payment.");setBusy(false);}}
 return <div className="sq-payment-action"><button className="artist-submit" onClick={pay} disabled={busy}>{busy?"Connecting to Paystack…":<><CreditCard size={16}/> Pay securely with Paystack</>}</button>{error&&<p role="alert">{error}</p>}</div>;
}
