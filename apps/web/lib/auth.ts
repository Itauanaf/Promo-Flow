import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase/server";

export async function requireAdmin() {
  const expectedEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  if (!expectedEmail) throw new Error("ADMIN_EMAIL is required");
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || user.email?.toLowerCase() !== expectedEmail) redirect("/login");
  return user;
}
