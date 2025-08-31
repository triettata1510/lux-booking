import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseService";

type WorkingHour = {
  dow: number;          // 0..6
  open_time: string;    // "08:00:00"
  close_time: string;   // "19:00:00"
};

export async function GET() {
  const { data, error } = await supabaseService
    .from("working_hours")
    .select("dow, open_time, close_time")
    .order("dow", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data as WorkingHour[]);
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { hours?: WorkingHour[] } | null;
  if (!Array.isArray(body?.hours)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // upsert theo khóa (dow)
  const { error } = await supabaseService
    .from("working_hours")
    .upsert(body.hours, { onConflict: "dow" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}