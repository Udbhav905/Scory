import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ProfileClient from "./ProfileClient";

// CRITICAL: Prevent static generation
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }
  return <ProfileClient session={session} />;
}