import { getPersonal } from "@/server/db";
import { PersonalView } from "./personal-view";

export default async function PersonalPage() {
  const personal = await getPersonal();
  return <PersonalView personal={personal} />;
}
