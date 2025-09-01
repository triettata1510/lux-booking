// app/api/admin/bookings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseService } from "@/lib/supabaseService";

const Query = z.object({
  date: z.string().min(10, "date is required (YYYY-MM-DD)"),
});

type ServiceRef = { name: string } | null;
type TechnicianRef = { full_name: string } | null;

export type BookingRow = {
  id: string;
  date: string;         // YYYY-MM-DD
  time: string;         // HH:mm
  customer_name: string;
  phone: string | null;
  status: string;
  service: ServiceRef;
  technician: TechnicianRef;
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const parsed = Query.safeParse({ date: url.searchParams.get("date") ?? "" });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const { date } = parsed.data;

  const { data, error } = await supabaseService
  .from("bookings")
  .select(
    [
      "id",
      "date",
      "time",
      "customer_name",
      "phone",
      "status",
      "service:services(name)",
      "technician:technicians(full_name)",
    ].join(",")
  )
  .eq("date", date)
  .order("time", { ascending: true });

const rows = (data ?? []) as BookingRow[];

const items: BookingRow[] = rows.map((b) => ({
  id: b.id,
  date: b.date,
  time: b.time,
  customer_name: b.customer_name,
  phone: b.phone,
  status: b.status,
  service: b.service ? { name: b.service.name } : null,
  technician: b.technician ? { full_name: b.technician.full_name } : null,
}));

  return NextResponse.json({ items });
}