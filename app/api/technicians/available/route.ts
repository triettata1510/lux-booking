import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseService";

type TechRow = { id: string; full_name: string; is_active: boolean };
type BookingRow = { technician_id: string | null; status: string; start_at: string };

function httpError(msg: string, code = 400) {
  return NextResponse.json({ error: msg }, { status: code });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start"); // ISO of selected slot start
  if (!start) return httpError("Missing start");

  const dt = new Date(start);
  if (Number.isNaN(dt.getTime())) return httpError("Invalid start");

  const dayStr = dt.toISOString().slice(0, 10);
  const hh = String(dt.getHours()).padStart(2, "0");
  const hourStart = `${dayStr}T${hh}:00:00`;
  const hourEnd   = `${dayStr}T${hh}:59:59`;

  // all active techs
  const { data: allTechs, error: tErr } = await supabaseService
    .from("technicians")
    .select("id,full_name,is_active")
    .eq("is_active", true);
  if (tErr) return httpError(tErr.message, 500);

  // bookings in the same hour
  const { data: busy, error: bErr } = await supabaseService
    .from("bookings")
    .select("technician_id,status,start_at")
    .gte("start_at", hourStart)
    .lte("start_at", hourEnd)
    .in("status", ["pending", "confirmed"]);
  if (bErr) return httpError(bErr.message, 500);

  const busyIds = new Set<string>();
  for (const b of (busy ?? []) as BookingRow[]) {
    if (b.technician_id) busyIds.add(b.technician_id);
  }

  const available = ((allTechs ?? []) as TechRow[])
    .filter(t => !busyIds.has(t.id))
    .map(t => ({ id: t.id, full_name: t.full_name }));

  return NextResponse.json({ technicians: available });
}