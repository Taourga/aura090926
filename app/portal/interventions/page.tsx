import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { InterventionWorkspace } from "@/components/intervention-workspace";
import { requireProfile } from "@/lib/auth";

export const dynamic="force-dynamic";

export default async function InterventionsPage(){
  const profile=await requireProfile();
  if(!["provider","psychologist","coach"].includes(profile.role))redirect("/portal");
  return <PortalShell profile={profile}><InterventionWorkspace/></PortalShell>;
}
