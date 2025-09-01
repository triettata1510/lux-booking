import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseService";

type DbRow = {
  id: string;
  start_at: string;                  // ISO
  service_name: string;
  customer_name: string;
  customer_phone: string | null;
  technician_name: string | null;
  status: string;
};

type OutRow = {
  id: string;
  start_at: string;
  time_label: string;
  service: string;
  customer: string;
  phone: string;
  technician: string | null;
  status: string;
};

function httpError(msg: string, code = 400) {
  return NextResponse.json({ error: msg }, { status: code });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (!date) return httpError("Missing date");

  // lọc theo ngày UTC đơn giản; nếu bạn đã có bản TZ-safe thì vẫn OK
  const from = `${date}T00:00:00.000Z`;
  const to = `${date}T23:59:59.999Z`;

  // Gợi ý: nếu bạn không có VIEW "bookings_view", thay select(...) bằng join cũ của bạn
  const { data, error } = await supabaseService
    .from("bookings_view")
    .select("id,start_at,service_name,customer_name,customer_phone,technician_name,status")
    .gte("start_at", from)
    .lte("start_at", to)
    .order("start_at", { ascending: true });

  if (error) return httpError(error.message, 500);

  const rows: OutRow[] = ((data ?? []) as unknown as DbRow[]).map((r) => {
    const t = new Date(r.start_at);
    const time_label = t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return {
      id: r.id,
      start_at: r.start_at,
      time_label,
      service: r.service_name,
      customer: r.customer_name,
      phone: r.customer_phone ?? "",
      technician: r.technician_name,
      status: r.status,
    };
  });

  return NextResponse.json({ rows });
}