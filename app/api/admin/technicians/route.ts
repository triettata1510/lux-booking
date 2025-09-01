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

function toOutTech(t: RawTech): OutTech {
  const nm = (t.full_name ?? t.name ?? "").trim();
  return {
    id: t.id,
    full_name: nm,
    phone: t.phone ?? null,
    is_active: Boolean(t.is_active),
  };
}

// GET: danh sách technicians (cho Admin)
export async function GET() {
  const { data, error } = await supabaseService
    .from("technicians")
    .select("id, full_name, name, phone, is_active")
    .order("is_active", { ascending: false })
    .order("full_name", { ascending: true });

  if (error) return httpError(error.message, 500);

  const list: OutTech[] = ((data ?? []) as RawTech[]).map(toOutTech);
  return NextResponse.json(list);
}

// POST: thêm technician
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { full_name?: string; phone?: string | null }
    | null;

  const full = body?.full_name?.trim();
  if (!full) return httpError("Missing full_name");

  const row = {
    full_name: full,
    name: full, // đồng bộ nếu DB có cột name
    phone: body?.phone ?? null,
    is_active: true,
  };

  const { data, error } = await supabaseService
    .from("technicians")
    .insert(row)
    .select("id, full_name, name, phone, is_active")
    .single();

  if (error) return httpError(error.message, 500);

  const out = toOutTech(data as RawTech);
  return NextResponse.json(out);
}