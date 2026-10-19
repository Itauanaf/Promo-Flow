import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

function loginRedirect(request: NextRequest, error?: string) {
  const url = new URL("/login", request.url);
  if (error) url.searchParams.set("error", error);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const expectedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!url || !key || !expectedEmail) return loginRedirect(request, "configuration");

  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (email !== expectedEmail || !password) return loginRedirect(request, "credentials");

  const response = NextResponse.redirect(new URL("/dashboard", request.url), 303);
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || data.user?.email?.toLowerCase() !== expectedEmail) {
    return loginRedirect(request, "credentials");
  }

  return response;
}
