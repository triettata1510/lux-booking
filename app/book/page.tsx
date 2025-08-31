"use client";
import { useEffect, useMemo, useState } from "react";

type Service = {
  id: string;
  name: string;
  category: string;
  price_cents: number;
  duration_min: number;
  is_addon: boolean;
};
type Slot = { start: string; end: string };

export default function BookPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slot, setSlot] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/services");
      const d: Service[] = await r.json();
      const nonAddons = (d || []).filter((s) => !s.is_addon);
      setServices(nonAddons);
      if (nonAddons.length) setServiceId(nonAddons[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!date) return;
    (async () => {
      const r = await fetch(`/api/availability?date=${encodeURIComponent(date)}`);
      const d = await r.json();
      setSlots(d?.slots ?? []);
      setSlot("");
    })();
  }, [date]);

  const grouped = useMemo(() => {
    const g: Record<string, Service[]> = {};
    for (const s of services) (g[s.category] ||= []).push(s);
    return g;
  }, [services]);

  async function submit() {
    setErrorMsg("");
    if (!serviceId || !slot || !name || !phone) {
      setErrorMsg("Please fill all required fields.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: serviceId,
          start_at: slot,
          customer: { full_name: name, phone },
        }),
      });
      const data = await res.json();
      console.log("POST /api/bookings =>", res.status, data);

      if (!res.ok || !data?.booking_id) {
        throw new Error(data?.error || "Booking failed");
      }

      // ✅ Redirect chắc chắn sang trang thành công
      window.location.assign(
        `/book/success?booking_id=${encodeURIComponent(data.booking_id)}`
      );
      return;
    } catch (e: any) {
      setErrorMsg(e?.message || "Booking failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-3xl font-semibold">Book an Appointment</h1>

      {errorMsg && (
        <div className="rounded border border-red-500 bg-red-50 text-red-800 p-3">
          ❌ {errorMsg}
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-sm font-medium">Service *</label>
        <select
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          className="w-full border rounded p-2"
        >
          {Object.entries(grouped).map(([cat, list]) => (
            <optgroup key={cat} label={cat}>
              {list.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — ${(s.price_cents / 100).toFixed(2)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Date *</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border rounded p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Time *</label>
          <select
            value={slot}
            onChange={(e) => setSlot(e.target.value)}
            className="w-full border rounded p-2"
          >
            <option value="">Select a time</option>
            {slots.map((s, i) => {
              const t = new Date(s.start);
              const label = t.toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              });
              return (
                <option key={i} value={s.start}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Full name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded p-2"
            placeholder="Customer name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Phone *</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border rounded p-2"
            placeholder="1XXXXXXXXXX"
          />
        </div>
      </div>

      <button
        onClick={submit}
        disabled={loading}
        className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
      >
        {loading ? "Booking..." : "Confirm Booking"}
      </button>
    </main>
  );
}