// app/api/admin/technicians/route.ts
import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseService";

function httpError(msg: string, code = 400) {
  return NextResponse.json({ error: msg }, { status: code });
}

type RawTech = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  phone?: string | null;
  is_active?: boolean | null;
};

type OutTech = {
  id: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
};

// GET: danh sách technicians (cho Admin)
export async function GET() {
  const { data, error } = await supabaseService
    .from("technicians")
    .select("id, full_name, name, phone, is_active")
    .order("is_active", { ascending: false })
    .order("full_name", { ascending: true });

  if (error) return httpError(error.message, 500);

  const list = (data ?? []).map((t: RawTech): OutTech => ({
    id: t.id,
    full_name: (t.full_name ?? t.name ?? "").trim(),
    phone: t.phone ?? null,
    is_active: Boolean(t.is_active),
  }));

  return NextResponse.json(list);
}

// POST: thêm technician
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { full_name?: string; phone?: string | null }
    | null;
  if (!body?.full_name || !body.full_name.trim()) {
    return httpError("Missing full_name");
  }

  const row = {
    full_name: body.full_name.trim(),
    name: body.full_name.trim(),
    phone: body.phone ?? null,
    is_active: true,
  };

  const { data, error } = await supabaseService
    .from("technicians")
    .insert(row)
    .select("id, full_name, name, phone, is_active")
    .single();

  if (error) return httpError(error.message, 500);

  const t = data as RawTech;
  const out: OutTech = {
    id: t.id,
    full_name: (t.full_name ?? t.name ?? "").trim(),
    phone: t.phone ?? null,
    is_active: Boolean(t.is_active),
  };

  return NextResponse.json(out);
}