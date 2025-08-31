import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

function toDate(d: string) { const [y, m, day] = d.split("-").map(Number); return new Date(y, m - 1, day); }
function pad(n: number) { return n.toString().padStart(2, "0"); }

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date");
  const technicianId = searchParams.get("technician_id");
  if (!dateStr) return NextResponse.json({ error: "Missing ?date=YYYY-MM-DD" }, { status: 400 });

  // 1) Lấy giờ mở cửa theo ngày trong tuần
  const d = toDate(dateStr);
  const dow = d.getDay(); // 0=Sun..6=Sat
  const { data: hours, error: hoursErr } = await supabase
    .from("working_hours").select("open_time, close_time").eq("dow", dow).maybeSingle();
  if (hoursErr) return NextResponse.json({ error: hoursErr.message }, { status: 500 });
  if (!hours) return NextResponse.json({ date: dateStr, slots: [] });

  // 2) Sinh slot 60'
  const [oh, om] = hours.open_time.split(":").map(Number);
  const [ch, cm] = hours.close_time.split(":").map(Number);
  const open = new Date(d); open.setHours(oh, om, 0, 0);
  const close = new Date(d); close.setHours(ch, cm, 0, 0);
  const slotMin = Number(process.env.DEFAULT_SLOT_MIN ?? 60);

  const slots: { start: string; end: string }[] = [];
  for (let t = new Date(open); t < close; t = new Date(t.getTime() + slotMin * 60000)) {
    const end = new Date(t.getTime() + slotMin * 60000);
    if (end <= close) {
      const startIso = `${dateStr}T${pad(t.getHours())}:${pad(t.getMinutes())}:00`;
      const endIso   = `${dateStr}T${pad(end.getHours())}:${pad(end.getMinutes())}:00`;
      slots.push({ start: startIso, end: endIso });
    }
  }

  // 3) Lấy booking trong ngày (pending/confirmed)
  const dayStart = `${dateStr}T00:00:00`, dayEnd = `${dateStr}T23:59:59`;
  let q = supabase.from("bookings")
    .select("start_at, technician_id, status")
    .gte("start_at", dayStart).lte("start_at", dayEnd)
    .in("status", ["pending", "confirmed"]);
  if (technicianId) q = q.eq("technician_id", technicianId);

  const { data: bookings, error: bErr } = await q;
  if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 });

  // 4) Đếm theo giờ và chặn > MAX/giờ + trùng technician
  const countByHour = new Map<string, number>();
  const techBusy = new Map<string, Set<string>>(); // hour -> set(tech)
  for (const b of bookings ?? []) {
    const dt = new Date(b.start_at);
    const key = `${pad(dt.getHours())}:00`;
    countByHour.set(key, (countByHour.get(key) ?? 0) + 1);
    if (b.technician_id) {
      const s = techBusy.get(key) ?? new Set<string>(); s.add(b.technician_id); techBusy.set(key, s);
    }
  }

  const MAX = Number(process.env.MAX_BOOKINGS_PER_HOUR ?? 5);
  const available = slots.filter(({ start }) => {
    const hourKey = start.substring(11, 13) + ":00";
    const total = countByHour.get(hourKey) ?? 0;
    if (total >= MAX) return false;
    if (technicianId) {
      const s = techBusy.get(hourKey);
      if (s && s.has(technicianId)) return false;
    }
    return true;
  });

  return NextResponse.json({ date: dateStr, slots: available });
}
