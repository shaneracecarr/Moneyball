import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { StyleHealthCheck } from "@/components/style-health-check";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Moneyball - Fantasy Football League Manager",
  description: "Create and manage your fantasy football leagues",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <StyleHealthCheck />
        {children}
      </body>
    </html>
  );
}
