// app/api/technicians/available/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseService";

/**
 * Input JSON:
 * { start_at: string }  // ISO-8601 của slot người dùng chọn (ví dụ "2025-09-01T11:00:00.000Z")
 *
 * Trả về danh sách technicians đang rảnh trong "giờ" chứa start_at.
 * Quy tắc bận: có booking (pending/confirmed) trong cùng giờ (00..59) => coi là bận.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const startISO: string | undefined = body?.start_at;
    if (!startISO) {
      return NextResponse.json({ error: "Missing start_at" }, { status: 400 });
    }

    const start = new Date(startISO);
    if (isNaN(start.getTime())) {
      return NextResponse.json({ error: "Invalid start_at" }, { status: 400 });
    }

    // 1) lấy tất cả technicians đang active
    const { data: allTechs, error: techErr } = await supabaseService
      .from("technicians")
      .select("id, full_name, is_active")
      .eq("is_active", true);

    if (techErr) {
      return NextResponse.json({ error: techErr.message }, { status: 500 });
    }

    // 2) tìm các booking trùng "giờ" này
    const dayStr = start.toISOString().slice(0, 10); // YYYY-MM-DD
    const hh = String(start.getUTCHours()).padStart(2, "0");
    const hourStart = `${dayStr}T${hh}:00:00Z`;
    const hourEnd = `${dayStr}T${hh}:59:59Z`;

    const { data: sameHour, error: bErr } = await supabaseService
      .from("bookings")
      .select("technician_id, status, start_at")
      .gte("start_at", hourStart)
      .lte("start_at", hourEnd)
      .in("status", ["pending", "confirmed"]);

    if (bErr) {
      return NextResponse.json({ error: bErr.message }, { status: 500 });
    }

    const busyIds = new Set(
      (sameHour ?? [])
        .map(b => b.technician_id)
        .filter((x): x is string => !!x)
    );

    // 3) lọc ra thợ rảnh
    const available = (allTechs ?? []).filter(t => !busyIds.has(t.id));

    return NextResponse.json(available);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}