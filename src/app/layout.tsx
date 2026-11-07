import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "SQUADREC — Music Worth Owning", description: "Discover new music, explore charts and acquire exceptional exclusive recordings." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
