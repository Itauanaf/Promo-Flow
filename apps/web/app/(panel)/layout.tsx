import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const demoAllowed = process.env.NODE_ENV !== "production" && process.env.ENABLE_DEMO_MODE === "true";
  if (configured) await requireAdmin();
  else if (!demoAllowed) redirect("/login");
  return <AppShell>{children}</AppShell>;
}
