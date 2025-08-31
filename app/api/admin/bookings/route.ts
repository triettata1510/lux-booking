import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseService";

// Các hàng tối thiểu dùng để build map
type ServiceRow = { id: string; name: string };
type CustomerRow = { id: string; full_name: string; phone: string };
type TechnicianRow = { id: string; full_name: string };

// Hàng booking “thô” lấy từ DB (chỉ các trường cần thiết)
type BookingRaw = {
  id: string;
  service_id: string;
  customer_id: string;
  technician_id: string | null;
  start_at: string;
  end_at: string;
  status: "pending" | "confirmed" | "cancelled";
};

// Dòng đã “giải mã” tên, số điện thoại để hiển thị
export type BookingRow = {
  id: string;
  start_at: string;
  end_at: string;
  status: "pending" | "confirmed" | "cancelled";
  service_name: string;
  customer_name: string;
  customer_phone: string;
  technician_name: string | null;
};

export async function GET() {
  // Lấy danh mục để build map id->name
  const [svc, cus, tech] = await Promise.all([
    supabaseService.from("services").select("id,name"),
    supabaseService.from("customers").select("id,full_name,phone"),
    supabaseService.from("technicians").select("id,full_name"),
  ]);

  if (svc.error) return NextResponse.json({ error: svc.error.message }, { status: 500 });
  if (cus.error) return NextResponse.json({ error: cus.error.message }, { status: 500 });
  if (tech.error) return NextResponse.json({ error: tech.error.message }, { status: 500 });

  const sMap = Object.fromEntries(
    ((svc.data as ServiceRow[]) || []).map((s) => [s.id, s.name])
  );
  const cMapName = Object.fromEntries(
    ((cus.data as CustomerRow[]) || []).map((c) => [c.id, c.full_name])
  );
  const cMapPhone = Object.fromEntries(
    ((cus.data as CustomerRow[]) || []).map((c) => [c.id, c.phone])
  );
  const tMap = Object.fromEntries(
    ((tech.data as TechnicianRow[]) || []).map((t) => [t.id, t.full_name])
  );

  // Lấy danh sách booking (hôm nay trở đi hoặc theo phạm vi bạn muốn)
  const { data: bookings, error: bErr } = await supabaseService
    .from("bookings")
    .select("id, service_id, customer_id, technician_id, start_at, end_at, status")
    .order("start_at", { ascending: true });

  if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 });

  const out: BookingRow[] = ((bookings ?? []) as BookingRaw[]).map((b) => ({
    id: b.id,
    start_at: b.start_at,
    end_at: b.end_at,
    status: b.status,
    service_name: sMap[b.service_id] ?? "",
    customer_name: cMapName[b.customer_id] ?? "",
    customer_phone: cMapPhone[b.customer_id] ?? "",
    technician_name: b.technician_id ? tMap[b.technician_id] ?? null : null,
  }));

  return NextResponse.json(out);
}