import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseService";

export async function GET() {
  const { data, error } = await supabaseService
    .from("working_hours").select("dow,open_time,close_time").order("dow");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// Body: [{dow:0..6, open_time:"08:00", close_time:"19:00"}, ...]
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(()=>null);
  if (!Array.isArray(body)) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const rows = body.map((r:any)=>({ dow:r.dow, open_time:r.open_time, close_time:r.close_time }));
  const { error } = await supabaseService.from("working_hours").upsert(rows, { onConflict: "dow" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
