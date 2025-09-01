import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// Public endpoint for booking page (no auth)
export async function GET() {
  const { data, error } = await supabase
    .from("technicians")
    .select("id, full_name, phone")
    .order("full_name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}