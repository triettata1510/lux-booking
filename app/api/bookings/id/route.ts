import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseService";

type Params = { id: string };

export async function PATCH(
  req: NextRequest,
  { params }: { params: Params }
) {
  const id = params.id;
  const body = (await req.json().catch(() => null)) as
    | { status?: "pending" | "confirmed" | "cancelled" }
    | null;

  if (!body?.status) {
    return NextResponse.json({ error: "Missing status" }, { status: 400 });
  }

  const { error } = await supabaseService
    .from("bookings")
    .update({ status: body.status })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Params }
) {
  const id = params.id;
  const { error } = await supabaseService.from("bookings").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}