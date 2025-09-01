// app/api/admin/bookings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

const TZ = process.env.TIMEZONE || "America/Chicago";
const err = (m: string, code = 400) =>
  NextResponse.json({ error: m }, { status: code });

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Trả về yyyy-mm-dd theo múi giờ TZ
function ymdInTz(d: Date, tz: string) {
  return d.toLocaleDateString("en-CA", { timeZone: tz });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date"); // "2025-09-01"
    if (!date) return err("Missing ?date=YYYY-MM-DD");

    // Lấy khung rộng (48h) quanh ngày để tránh lệch TZ
    const baseUtc = new Date(`${date}T00:00:00.000Z`);
    const startUtc = new Date(baseUtc.getTime() - 12 * 3600_000).toISOString(); // -12h
    const endUtc   = new Date(baseUtc.getTime() + 36 * 3600_000).toISOString(); // +36h

    const { data, error } = await supabase
      .from("bookings")
      .select(`
        id,
        start_at,
        status,
        services:service_id(name),
        customers:customer_id(full_name, phone),
        technicians:technician_id(full_name)
      `)
      .gte("start_at", startUtc)
      .lte("start_at", endUtc)
      .order("start_at", { ascending: true });

    if (error) return err(error.message, 500);

    // Lọc lại chính xác theo ngày trong múi giờ cửa hàng
    const items = (data ?? []).filter((b) => {
      const d = new Date(b.start_at as string);
      return ymdInTz(d, TZ) === date;
    });

    return NextResponse.json(
      { ok: true, items },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return err(e?.message || "Failed to load bookings", 500);
  }
}