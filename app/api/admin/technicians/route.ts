import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseService";

type Technician = {
  id: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
};

function httpError(msg: string, code = 400) {
  return NextResponse.json({ error: msg }, { status: code });
}

// 📌 GET: lấy danh sách technicians
export async function GET() {
  const { data, error } = await supabaseService
    .from("technicians")
    .select("id, full_name, phone, is_active")
    .order("full_name");

  if (error) return httpError(error.message, 500);
  return NextResponse.json({ technicians: (data ?? []) as Technician[] });
}

// 📌 POST: thêm technician mới
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    full_name?: string;
    phone?: string | null;
  } | null;

  if (!body?.full_name) return httpError("Missing full_name");

  const { data, error } = await supabaseService
    .from("technicians")
    .insert({
      full_name: body.full_name,
      phone: body.phone ?? null,
      is_active: true,
    })
    .select("id, full_name, phone, is_active")
    .single();

  if (error) return httpError(error.message, 500);
  return NextResponse.json({ technician: data as Technician });
}

// 📌 PUT: cập nhật technician
export async function PUT(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    id?: string;
    full_name?: string;
    phone?: string | null;
    is_active?: boolean;
  } | null;

  if (!body?.id) return httpError("Missing id");

  const update: Partial<Technician> = {};
  if (body.full_name !== undefined) update.full_name = body.full_name;
  if (body.phone !== undefined) update.phone = body.phone;
  if (body.is_active !== undefined) update.is_active = body.is_active;

  const { data, error } = await supabaseService
    .from("technicians")
    .update(update)
    .eq("id", body.id)
    .select("id, full_name, phone, is_active")
    .single();

  if (error) return httpError(error.message, 500);
  return NextResponse.json({ technician: data as Technician });
}

// 📌 DELETE: xóa technician
export async function DELETE(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { id?: string } | null;
  if (!body?.id) return httpError("Missing id");

  const { error } = await supabaseService.from("technicians").delete().eq("id", body.id);
  if (error) return httpError(error.message, 500);

  return NextResponse.json({ ok: true });
}