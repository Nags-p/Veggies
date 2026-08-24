import { redirect } from "next/navigation";

export default function OtpRedirect() {
  redirect("/login");
}
