import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseService";

type Tech = { id: string; full_name: string };

function httpError(msg: string, code = 400) {
  return NextResponse.json({ error: msg }, { status: code });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start"); // ISO start time của slot
  if (!start) return httpError("Missing start");

  const startDt = new Date(start);
  const dayStr = startDt.toISOString().slice(0, 10);

  // Lấy tất cả thợ active
  const { data: allTechs, error: tErr } = await supabaseService
    .from("technicians")
    .select("id,full_name,is_active")
    .eq("is_active", true);

  if (tErr) return httpError(tErr.message, 500);

  // Lấy booking của giờ đó
  const hh = String(startDt.getHours()).padStart(2, "0");
  const hourStart = `${dayStr}T${hh}:00:00`;
  const hourEnd = `${dayStr}T${hh}:59:59`;

  const { data: hourBookings, error: bErr } = await supabaseService
    .from("bookings")
    .select("technician_id,status,start_at")
    .gte("start_at", hourStart)
    .lte("start_at", hourEnd)
    .in("status", ["pending", "confirmed"]);

  if (bErr) return httpError(bErr.message, 500);

  const busyIds = new Set<string>();
  for (const b of hourBookings ?? []) {
    if (b.technician_id) busyIds.add(b.technician_id as string);
  }

  const available: Tech[] = (allTechs ?? [])
    .filter((t) => !busyIds.has(t.id))
    .map((t) => ({ id: t.id as string, full_name: t.full_name as string }));

  return NextResponse.json({ technicians: available });
}