import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const { password } = await request.json();

  console.log("Password reçu:", password);
  console.log("Password attendu:", process.env.ADMIN_SECRET_PASSWORD);

  if (password !== process.env.ADMIN_SECRET_PASSWORD) {
    return NextResponse.json({ 
      error: "Mot de passe incorrect",
      received: password.length,
      expected: process.env.ADMIN_SECRET_PASSWORD?.length
    }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set("admin_auth", "true", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
    path: "/",
  });

  return NextResponse.json({ success: true });
}