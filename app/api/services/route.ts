import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  const { data, error } = await supabase
    .from("services")
    .select("id,category,name,price_cents,duration_min,is_addon,is_active")
    .eq("is_active", true)
    .order("category, name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
