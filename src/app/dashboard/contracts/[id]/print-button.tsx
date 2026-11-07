"use client";
import { Printer } from "lucide-react";
export default function PrintContractButton(){return <button className="sq-refresh" onClick={()=>window.print()}><Printer size={15}/> Print / Save PDF</button>;}
