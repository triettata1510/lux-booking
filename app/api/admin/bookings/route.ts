import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseService";

export async function GET(req: NextRequest) {
  const date = new URL(req.url).searchParams.get("date");
  if (!date) return NextResponse.json({ error: "Missing ?date=" }, { status: 400 });

  const from = `${date}T00:00:00`, to = `${date}T23:59:59`;
  const { data, error } = await supabaseService
    .from("bookings")
    .select("id,start_at,end_at,status,service_id,customer_id,technician_id")
    .gte("start_at", from).lte("start_at", to)
    .order("start_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const svcIds = [...new Set((data??[]).map(b=>b.service_id))];
  const cusIds = [...new Set((data??[]).map(b=>b.customer_id))];
  const techIds = [...new Set((data??[]).map(b=>b.technician_id).filter(Boolean))];

  const [svc, cus, tech] = await Promise.all([
    supabaseService.from("services").select("id,name").in("id", svcIds),
    supabaseService.from("customers").select("id,full_name,phone").in("id", cusIds),
    techIds.length ? supabaseService.from("technicians").select("id,full_name").in("id", techIds) : Promise.resolve({ data: [] }) as any,
  ]);

  const sMap = Object.fromEntries((svc.data||[]).map((s:any)=>[s.id,s.name]));
  const cMap = Object.fromEntries((cus.data||[]).map((c:any)=>[c.id,c]));
  const tMap = Object.fromEntries((tech.data||[]).map((t:any)=>[t.id,t.full_name]));

  const out = (data||[]).map((b:any)=>({
    id: b.id,
    start_at: b.start_at,
    end_at: b.end_at,
    status: b.status,
    service_name: sMap[b.service_id],
    customer_name: cMap[b.customer_id]?.full_name,
    customer_phone: cMap[b.customer_id]?.phone,
    technician_name: b.technician_id ? tMap[b.technician_id] : null,
  }));

  return NextResponse.json(out);
}
