import { APP } from "@shared/lib/routes";
import { redirect } from "next/navigation";

export default function Home() {
  return redirect(APP.DISCOVER);
}
