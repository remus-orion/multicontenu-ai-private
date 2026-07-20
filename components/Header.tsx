import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";

export default async function Header() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  return (
    <header className="header">
      <Link className="brand" href="/">MultiContenu AI</Link>
      <nav className="nav">
        <Link href="/pricing">Tarifs</Link>
        {user ? (
          <>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/projects">Projets</Link>
            <Link href="/account">Compte</Link>
            <Link href="/settings">Settings</Link>
            <SignOutButton />
          </>
        ) : (
          <Link className="btn secondary" href="/login">Connexion</Link>
        )}
      </nav>
    </header>
  );
}