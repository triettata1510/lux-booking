// app/api/technicians/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  const { data, error } = await supabase
    .from("technicians")
    .select("id, full_name:full_name, name, phone, is_active")
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const out = (data || [])
    .map((t) => ({
      id: t.id as string,
      full_name: (t as any).full_name ?? (t as any).name ?? "",
      phone: (t as any).phone ?? null,
    }))
    .filter((t) => t.full_name);

  return NextResponse.json(out);
}