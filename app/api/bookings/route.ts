import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseService";
import { supabase } from "@/lib/supabaseClient";
import { Vonage } from "@vonage/server-sdk";

const vonage = new Vonage({
  apiKey: process.env.VONAGE_API_KEY || "",
  apiSecret: process.env.VONAGE_API_SECRET || "",
});

function httpError(msg: string, code = 400) {
  return NextResponse.json({ error: msg }, { status: code });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return httpError("Invalid JSON");

  const { service_id, start_at, technician_id, customer } = body as {
    service_id?: string;
    start_at?: string;
    technician_id?: string | null;
    customer?: { full_name?: string; phone?: string };
  };

  if (!service_id || !start_at || !customer?.full_name || !customer?.phone)
    return httpError(
      "Missing fields: service_id, start_at, customer.full_name, customer.phone"
    );

  const { data: svc, error: svcErr } = await supabase
    .from("services")
    .select("name, duration_min")
    .eq("id", service_id)
    .maybeSingle();
  if (svcErr || !svc) return httpError("Service not found", 404);

  const start = new Date(start_at);
  const end = new Date(start.getTime() + (svc.duration_min ?? 60) * 60000);

  const dayStr = start.toISOString().slice(0, 10);
  const hh = String(start.getHours()).padStart(2, "0");
  const hourStart = `${dayStr}T${hh}:00:00`;
  const hourEnd = `${dayStr}T${hh}:59:59`;

  const q = supabase
    .from("bookings")
    .select("id, technician_id, status")
    .gte("start_at", hourStart)
    .lte("start_at", hourEnd)
    .in("status", ["pending", "confirmed"]);

  const { data: sameHour, error: hErr } = await q;
  if (hErr) return httpError(hErr.message, 500);

  const MAX = Number(process.env.MAX_BOOKINGS_PER_HOUR ?? 5);
  if ((sameHour?.length ?? 0) >= MAX) return httpError("This hour is fully booked", 409);
  if (technician_id && (sameHour ?? []).some((b) => b.technician_id === technician_id))
    return httpError("Technician is busy at this time", 409);

  const { data: existed } = await supabaseService
    .from("customers")
    .select("id")
    .eq("phone", customer.phone!)
    .maybeSingle();
  let customerId = existed?.id as string | undefined;
  if (!customerId) {
    const { data: cNew, error: cErr } = await supabaseService
      .from("customers")
      .insert({ full_name: customer.full_name!, phone: customer.phone! })
      .select("id")
      .single();
    if (cErr) return httpError(cErr.message, 500);
    customerId = cNew.id;
  }

  const { data: bNew, error: bErr } = await supabaseService
    .from("bookings")
    .insert({
      service_id,
      technician_id: technician_id ?? null,
      customer_id: customerId,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      status: "confirmed",
    })
    .select("id")
    .single();
  if (bErr) return httpError(bErr.message, 500);

  try {
    const from = process.env.VONAGE_FROM || "";
    if (from && process.env.VONAGE_API_KEY && process.env.VONAGE_API_SECRET) {
      let toUser = customer.phone.replace(/\D/g,"");

// Nếu khách chỉ nhập 9 hoặc 10 số, tự thêm +1 ở đầu (giả định Mỹ)
if (toUser.length === 9 || toUser.length === 10) {
  toUser = "1" + toUser;
}

toUser = "+" + toUser; // chuẩn E.164
      const when = start.toLocaleString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        month: "short",
        day: "2-digit",
      });

      await vonage.sms.send({
        to: toUser,
        from,
        text: `Lux Spa Nails: Your ${svc.name} at ${when} is confirmed. 15838 U.S 63, Hayward. Call 715-699-1258 to change.`,
      });

      const admin = (process.env.ADMIN_PHONE || "").replace(/\D/g, "");
      if (admin) {
        await vonage.sms.send({
          to: admin,
          from,
          text: `New booking: ${customer.full_name} ${customer.phone} - ${svc.name} at ${when}`,
        });
      }
    }
  } catch {
    // ignore sms errors in production path
  }

  return NextResponse.json({ ok: true, booking_id: bNew.id });
}