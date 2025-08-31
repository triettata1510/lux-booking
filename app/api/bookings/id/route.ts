// app/api/bookings/[id]/route.ts
import { NextResponse, NextRequest } from "next/server";
// ❗️Đổi đường dẫn import này theo helper bạn đang dùng ở các route khác
import { supabaseService } from "@/lib/supabaseService";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  try {
    // 1) lấy bản ghi booking
    const { data: b, error: e1 } = await supabaseService
      .from("bookings")
      .select("*")
      .eq("id", id)
      .single();

    if (e1 || !b) return NextResponse.json({ error: e1?.message || "Not found" }, { status: 404 });

    // 2) lấy service / customer / technician (nếu có)
    const [svc, cus, tech] = await Promise.all([
      supabaseService.from("services").select("name,category,price_cents,duration_min").eq("id", b.service_id).single(),
      supabaseService.from("customers").select("full_name,phone").eq("id", b.customer_id).single(),
      b.technician_id
        ? supabaseService.from("technicians").select("full_name").eq("id", b.technician_id).single()
        : Promise.resolve({ data: null, error: null } as any),
    ]);

    if (svc.error) return NextResponse.json({ error: svc.error.message }, { status: 500 });
    if (cus.error) return NextResponse.json({ error: cus.error.message }, { status: 500 });
    if (tech.error) return NextResponse.json({ error: tech.error.message }, { status: 500 });

    const out = {
      id: b.id,
      status: b.status,
      start_at: b.start_at,
      end_at: b.end_at,
      service: svc.data,
      customer: cus.data,
      technician: tech.data, // có thể null
    };

    return NextResponse.json(out);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}