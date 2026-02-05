import { Navbar } from "@/components/dashboard/navbar";

export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#1a1d24]">
      <Navbar />
      {children}
    </div>
  );
}
