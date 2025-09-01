import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseService";

type Row = {
  id: string;
  start_at: string;
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

  const from = `${date}T00:00:00`;
  const to = `${date}T23:59:59`;

  const { data, error } = await supabaseService
    .from("bookings_view") // hoặc join thủ công nếu bạn không có view
    .select("id,start_at,service_name,customer_name,customer_phone,technician_name,status")
    .gte("start_at", from)
    .lte("start_at", to)
    .order("start_at", { ascending: true });

  if (error) return httpError(error.message, 500);

  const rows: Row[] = (data ?? []).map((r: any) => {
    const start = new Date(r.start_at);
    const time_label = start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return {
      id: r.id as string,
      start_at: r.start_at as string,
      service: r.service_name as string,
      customer: r.customer_name as string,
      phone: r.customer_phone as string,
      technician: (r.technician_name as string) ?? null,
      status: r.status as string,
      // phụ để hiển thị: time_label (client có thể tự format, nhưng thêm cho tiện)
      time_label,
    };
  });

  return NextResponse.json({ rows });
}