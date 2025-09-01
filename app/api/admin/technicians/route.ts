// app/api/admin/technicians/route.ts
import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseService";

function httpError(msg: string, code = 400) {
  return NextResponse.json({ error: msg }, { status: code });
}

// GET: trả về danh sách technician (kể cả inactive) cho màn hình Admin
export async function GET() {
  // alias full_name:name để hỗ trợ DB đặt tên cột là "name"
  const { data, error } = await supabaseService
    .from("technicians")
    .select("id, full_name:full_name, name, phone, is_active")
    .order("is_active", { ascending: false })
    .order("full_name", { ascending: true });

  if (error) return httpError(error.message, 500);

  // chuẩn hoá: ưu tiên full_name, fallback name
  const out = (data || []).map((t) => ({
    id: t.id as string,
    full_name: (t as any).full_name ?? (t as any).name ?? "",
    phone: (t as any).phone ?? null,
    is_active: Boolean((t as any).is_active),
  }));

  return NextResponse.json(out);
}

// POST: thêm technician mới
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.full_name) return httpError("Missing full_name");

  // Nếu DB dùng cột "name", cứ insert cả hai để an toàn
  const row = {
    full_name: body.full_name,
    name: body.full_name,
    phone: body.phone ?? null,
    is_active: true,
  };

  const { data, error } = await supabaseService
    .from("technicians")
    .insert(row)
    .select("id, full_name, name, phone, is_active")
    .single();

  if (error) return httpError(error.message, 500);

  const out = {
    id: data.id as string,
    full_name: (data as any).full_name ?? (data as any).name ?? "",
    phone: (data as any).phone ?? null,
    is_active: Boolean((data as any).is_active),
  };
  return NextResponse.json(out);
}