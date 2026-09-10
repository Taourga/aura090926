import { redirect } from "next/navigation";

export default function SportRoomPage() {
  redirect("/portal/activities?section=sport");
}
