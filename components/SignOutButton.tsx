import { signOut } from "@/app/login/actions";

export default function SignOutButton() {
  return (
    <form action={signOut}>
      <button className="btn secondary" type="submit">Déconnexion</button>
    </form>
  );
}
