import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const { password } = await request.json();

  if (password !== process.env.ADMIN_SECRET_PASSWORD) {
    return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set("admin_auth", "true", {
    httpOnly: true,
    secure: true,
    maxAge: 60 * 60 * 8,
    path: "/",
  });

  return NextResponse.json({ success: true });
}