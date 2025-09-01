// app/api/technicians/available/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseService } from "@/lib/supabaseService";

const Query = z.object({
  date: z.string().min(10, "date is required (YYYY-MM-DD)"),
  time: z.string().min(4, "time is required (HH:mm)"),
  duration_min: z.coerce.number().min(1),
});

type Technician = {
  id: string;
  full_name: string;
  is_active: boolean;
};

type BusyRow = {
  technician_id: string | null;
  time: string; // HH:mm
  service: { duration_min: number }[] | null;
};

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((n) => Number(n));
  return h * 60 + (isNaN(m) ? 0 : m);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const parsed = Query.safeParse({
    date: url.searchParams.get("date") ?? "",
    time: url.searchParams.get("time") ?? "",
    duration_min: url.searchParams.get("duration_min") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const { date, time, duration_min } = parsed.data;

  // 1) all active technicians
  const techRes = await supabaseService
    .from("technicians")
    .select("id, full_name, is_active")
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (techRes.error) {
    return NextResponse.json({ error: techRes.error.message }, { status: 500 });
  }
  const techs = (techRes.data ?? []) as Technician[];

  // 2) fetch busy slots for that day
  const busyRes = await supabaseService
    .from("bookings")
    .select("technician_id, time, service:services(duration_min)")
    .eq("date", date);

  if (busyRes.error) {
    return NextResponse.json({ error: busyRes.error.message }, { status: 500 });
  }
  const busy = (busyRes.data ?? []) as BusyRow[];

  const start = toMin(time);
  const end = start + duration_min;

  const busySet = new Set<string>();
  for (const b of busy) {
    if (!b.technician_id) continue;
    const bs = toMin(b.time);
    const be = bs + (b.service?.[0]?.duration_min ?? 0);
    if (start < be && end > bs) {
      busySet.add(b.technician_id);
    }
  }

  const available = techs
    .filter((t) => !busySet.has(t.id))
    .map((t) => ({ id: t.id, full_name: t.full_name }));

  return NextResponse.json({ items: available });
}

// app/api/admin/bookings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseService } from "@/lib/supabaseService";

// query: ?date=YYYY-MM-DD
const Query = z.object({
  date: z.string().min(10, "date is required (YYYY-MM-DD)"),
});

// Raw row as returned by Supabase when embedding relations
// (embedded relations come back as arrays)
type RawBooking = {
  id: string;
  date: string;
  time: string; // HH:mm
  customer_name: string;
  phone: string | null;
  status: string;
  service: { name: string }[] | null; // services table
  technician: { full_name: string }[] | null; // technicians table
};

// The normalized shape we return to the client
export type BookingRow = {
  id: string;
  date: string;
  time: string;
  customer_name: string;
  phone: string | null;
  status: string;
  service: { name: string | null };
  technician: { full_name: string | null };
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const parsed = Query.safeParse({ date: url.searchParams.get("date") ?? "" });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const { date } = parsed.data;

  const res = await supabaseService
    .from("bookings")
    .select(
      "id, date, time, customer_name, phone, status, " +
        "service:services(name), " +
        "technician:technicians(full_name)"
    )
    .eq("date", date)
    .order("time", { ascending: true });

  if (res.error) {
    return NextResponse.json({ error: res.error.message }, { status: 500 });
  }

  const items: BookingRow[] = ((res.data ?? []) as RawBooking[]).map((b) => ({
    id: b.id,
    date: b.date,
    time: b.time,
    customer_name: b.customer_name,
    phone: b.phone,
    status: b.status,
    service: { name: b.service?.[0]?.name ?? null },
    technician: { full_name: b.technician?.[0]?.full_name ?? null },
  }));

  return NextResponse.json({ items });
}