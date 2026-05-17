import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ProfileClient from "./ProfileClient";

export const dynamic = "force-dynamic"; // Prevent static generation

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }
  return <ProfileClient session={session} />;
}