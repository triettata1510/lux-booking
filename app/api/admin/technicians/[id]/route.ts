import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseService";

/**
 * DELETE /api/admin/technicians/:id
 * Xoá technician theo id
 */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = params?.id;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const { error } = await supabaseService
    .from("technicians")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}