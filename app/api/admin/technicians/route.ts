import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseService";

export async function GET() {
  const { data, error } = await supabaseService
    .from("technicians").select("id,full_name,phone,is_active").order("full_name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { full_name, phone } = await req.json();
  if (!full_name) return NextResponse.json({ error: "Missing full_name" }, { status: 400 });
  const { data, error } = await supabaseService
    .from("technicians")
    .insert({ full_name, phone: phone ?? null, is_active: true })
    .select("id,full_name,phone,is_active").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
