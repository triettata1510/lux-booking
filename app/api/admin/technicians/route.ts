import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseService";

// GET /api/admin/technicians  (Admin: list all technicians)
export async function GET() {
  const { data, error } = await supabaseService
    .from("technicians")
    .select("id, full_name, phone")
    .order("full_name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/admin/technicians  (Admin: create a technician)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.full_name) {
    return NextResponse.json({ error: "full_name is required" }, { status: 400 });
  }
  const { full_name, phone } = body as { full_name: string; phone?: string | null };

  const { data, error } = await supabaseService
    .from("technicians")
    .insert({ full_name, phone: phone ?? null })
    .select("id, full_name, phone")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}