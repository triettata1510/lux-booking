import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseService";

// GET /api/technicians -> [{ id, full_name }]
export async function GET() {
  const { data, error } = await supabaseService
    .from("technicians")
    .select("id, full_name")
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}