import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseService";

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await supabaseService.from("technicians").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
