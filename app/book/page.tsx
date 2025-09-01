"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Service = {
  id: string;
  name: string;
  category: string;
  price_cents: number;
  duration_min: number;
  is_addon: boolean;
};
type Slot = { start: string; end: string };
type Tech = { id: string; full_name: string; phone?: string | null };

export default function BookPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [techs, setTechs] = useState<Tech[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slot, setSlot] = useState("");
  const [technicianId, setTechnicianId] = useState<string>("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  // load services
  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then((d: Service[]) => {
        setServices(d);
        if (d?.length) setServiceId(d[0].id);
      });
  }, []);

  // load technicians (active)
  useEffect(() => {
    fetch("/api/technicians")
      .then((r) => r.json())
      .then((d: Tech[]) => {
        setTechs(d || []);
      });
  }, []);

  // load slots theo ngày
  useEffect(() => {
    if (!date) return;
    fetch(`/api/availability?date=${date}`)
      .then((r) => r.json())
      .then((d) => {
        setSlots(d?.slots ?? []);
        setSlot("");
      });
  }, [date]);

  const grouped = useMemo(() => {
    const g: Record<string, Service[]> = {};
    for (const s of services) {
      if (s.is_addon) continue;
      (g[s.category] ||= []).push(s);
    }
    return g;
  }, [services]);

  async function submit() {
    setMsg("");
    if (!serviceId || !slot || !name || !phone) {
      setMsg("Please fill all required fields.");
      return;
    }
    setLoading(true);
    try {
      const payload: any = {
        service_id: serviceId,
        start_at: slot,
        customer: { full_name: name, phone },
      };
      if (technicianId) payload.technician_id = technicianId;

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Booking failed");
      router.push(`/book/success`);
    } catch (e: any) {
      setMsg("❌ " + (e?.message || "Booking failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-3xl font-semibold">Book an Appointment</h1>

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

      <div className="space-y-2">
        <label className="block text-sm font-medium">
          Technician (optional)
        </label>
        <select
          value={technicianId}
          onChange={(e) => setTechnicianId(e.target.value)}
          className="w-full border rounded p-2"
        >
          <option value="">No preference</option>
          {techs.map((t) => (
            <option key={t.id} value={t.id}>
              {t.full_name}
            </option>
          ))}
        </select>
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
            placeholder="9–10 digits"
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

      {!!msg && <p className="text-sm">{msg}</p>}
    </main>
  );
}