// app/api/admin/bookings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

function httpError(msg: string, code = 400) {
  return NextResponse.json({ error: msg }, { status: code });
}

// Đảm bảo không cache ở Edge/CDN
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date"); // "2025-09-01"

    if (!date) return httpError("Missing ?date=YYYY-MM-DD");

    // Lấy TIMEZONE từ env (mặc định America/Chicago)
    const tz = process.env.TIMEZONE || "America/Chicago";

    // Tạo khoảng thời gian theo timezone (ngày đó từ 00:00:00 -> 23:59:59)
    // Supabase/Postgres lưu UTC => so sánh bằng ISO UTC theo start_of_day/end_of_day tz
    const day = new Date(`${date}T00:00:00`);
    // chuyển mốc tz -> UTC bằng trick lấy offset tz theo Intl
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const toUTCISO = (d: Date) => new Date(
      // parse lại theo tz -> get UTC ISO
      Date.parse(
        new Date(
          fmt.format(d)
            .replace(/(\d+)\/(\d+)\/(\d+), /, "$3-$1-$2T") // MM/DD/YYYY, -> YYYY-MM-DDT
        ).toISOString()
      )
    ).toISOString();

    const start = toUTCISO(day);
    const end = toUTCISO(new Date(day.getTime() + 24 * 60 * 60 * 1000 - 1));

    // Query: lấy bookings trong [start, end] kèm join thông tin
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
      .gte("start_at", start)
      .lte("start_at", end)
      .order("start_at", { ascending: true });

    if (error) return httpError(error.message, 500);

    return NextResponse.json({ ok: true, items: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return httpError(e?.message || "Failed to load bookings", 500);
  }
}