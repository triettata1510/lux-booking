// app/api/admin/bookings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseService } from "@/lib/supabaseService";

/** Query: ?date=YYYY-MM-DD */
const Query = z.object({
  date: z.string().min(10, "date is required (YYYY-MM-DD)"),
});

/** Các cột cơ bản của bảng bookings (flatten) */
type BookingRow = {
  id: string;
  date: string;        // YYYY-MM-DD
  time: string;        // HH:mm
  customer_name: string;
  phone: string | null;
  status: string;
  service_id?: string;
  technician_id?: string | null;
};

/** Kết quả join từ select(...) */
type BookingJoined = BookingRow & {
  service: { name: string } | null;
  technician: { full_name: string } | null;
};

/** Kiểu item trả về cho UI admin */
type AdminBookingItem = {
  id: string;
  time: string;
  service: string;
  customer: string;
  phone: string;
  technician: string | null;
  status: string;
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const parsed = Query.safeParse({ date: url.searchParams.get("date") ?? "" });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  const date = parsed.data.date;

  const { data, error } = await supabaseService
    .from("bookings")
    .select(
      `
      id,
      date,
      time,
      customer_name,
      phone,
      status,
      service:services(name),
      technician:technicians(full_name)
    `
    )
    .eq("date", date)
    .order("time", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Ép kiểu rõ ràng cho mảng rows
  const rows: BookingJoined[] = (data ?? []) as unknown as BookingJoined[];

  const items: AdminBookingItem[] = rows.map((r) => ({
    id: r.id,
    time: r.time,
    service: r.service?.name ?? "",
    customer: r.customer_name,
    phone: r.phone ?? "",
    technician: r.technician?.full_name ?? null,
    status: r.status,
  }));

  return NextResponse.json({ items });
}