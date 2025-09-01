import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseService } from "@/lib/supabaseService";

const Query = z.object({
  date: z.string().min(10),                  // YYYY-MM-DD
  time: z.string().regex(/^\d{1,2}:\d{2}$/), // HH:mm
  duration_min: z.coerce.number().int().positive().default(60),
});

type TechnicianRow = {
  id: string;
  full_name: string;
  is_active: boolean | null;
};

type BookingPick = {
  technician_id: string | null;
  date: string;
  time: string;       // HH:mm
  duration_min: number;
  status: string;
};

const toMin = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const parsed = Query.safeParse({
    date: url.searchParams.get("date"),
    time: url.searchParams.get("time"),
    duration_min: url.searchParams.get("duration_min") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const { date, time, duration_min } = parsed.data;

  // 1) Active technicians
  const techRes = await supabaseService
    .from("technicians")
    .select("id, full_name, is_active")
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (techRes.error) {
    return NextResponse.json({ error: techRes.error.message }, { status: 500 });
  }
  const techs = (techRes.data ?? []) as TechnicianRow[];
  if (techs.length === 0) return NextResponse.json({ items: [] });

  // 2) Busy bookings in that date
  const busyRes = await supabaseService
    .from("bookings")
    .select("technician_id, date, time, duration_min, status")
    .eq("date", date)
    .in("status", ["confirmed", "pending"]);

  if (busyRes.error) {
    return NextResponse.json({ error: busyRes.error.message }, { status: 500 });
  }
  const busy = (busyRes.data ?? []) as BookingPick[];

  // 3) Filter by time overlap
  const start = toMin(time);
  const end = start + duration_min;
  const busyMap = new Map<string, boolean>();
  busy.forEach((b) => {
    if (!b.technician_id) return;
    const bs = toMin(b.time);
    const be = bs + b.duration_min;
    if (start < be && bs < end) busyMap.set(b.technician_id, true);
  });

  const available = techs
    .filter((t) => !busyMap.get(t.id))
    .map((t) => ({ id: t.id, full_name: t.full_name }));

  return NextResponse.json({ items: available });
}