// app/api/technician/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

type RawTech = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  phone?: string | null;
  is_active?: boolean | null;
};

type OutTech = {
  id: string;
  full_name: string;
  phone: string | null;
};

export async function GET() {
  const { data, error } = await supabase
    .from("technicians")
    .select("id, full_name, name, phone, is_active")
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const out: OutTech[] = (data ?? [])
    .map((t: RawTech): OutTech => ({
      id: t.id,
      full_name: (t.full_name ?? t.name ?? "").trim(),
      phone: t.phone ?? null,
    }))
    .filter((t) => t.full_name.length > 0);

  return NextResponse.json(out);
}