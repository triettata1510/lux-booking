// app/api/admin/technicians/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseService";

type RouteParams = Promise<{ id: string }>;

export async function DELETE(_req: NextRequest, ctx: { params: RouteParams }) {
  const { id } = await ctx.params;

  const { error } = await supabaseService
    .from("technicians")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}