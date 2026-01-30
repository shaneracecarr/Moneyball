import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { MockDraftSetupNew } from "@/components/mock-draft/mock-draft-setup-new";

export default async function MockDraftPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return <MockDraftSetupNew />;
}
