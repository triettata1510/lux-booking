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

function toPublicTech(t: RawTech): OutTech | null {
  const nm = (t.full_name ?? t.name ?? "").trim();
  if (!nm) return null;
  return { id: t.id, full_name: nm, phone: t.phone ?? null };
}

export async function GET() {
  const { data, error } = await supabase
    .from("technicians")
    .select("id, full_name, name, phone, is_active")
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const out = (data ?? [])
    .map((t) => toPublicTech(t as RawTech))
    .filter((t): t is OutTech => t !== null);

  return NextResponse.json(out);
}