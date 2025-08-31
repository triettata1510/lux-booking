"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

type BookingRow = {
  id: string;
  start_at: string;
  end_at: string;
  status: "pending" | "confirmed" | "cancelled";
  service_name: string;
  customer_name: string;
  customer_phone: string;
  technician_name: string | null;
};

type WorkingHour = { dow: number; open_time: string; close_time: string };

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export default function AdminPage() {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [techName, setTechName] = useState("");
  const [techPhone, setTechPhone] = useState("");
  const [hours, setHours] = useState<WorkingHour[]>(
    Array.from({ length: 7 }, (_, i) => ({
      dow: i,
      open_time: "08:00:00",
      close_time: "19:00:00",
    }))
  );
  const [msg, setMsg] = useState("");

  const loadBookings = useCallback(async () => {
    const res = await fetch("/api/admin/bookings");
    const data: BookingRow[] = await res.json();
    // Nếu bạn muốn lọc theo ngày hiện tại:
    const dayOnly = data.filter((b) => b.start_at.startsWith(date));
    setBookings(dayOnly);
  }, [date]);

  const loadHours = useCallback(async () => {
    const res = await fetch("/api/admin/working-hours");
    const data: WorkingHour[] = await res.json();
    if (Array.isArray(data) && data.length) {
      // merge vào state mặc định theo dow
      setHours((prev) =>
        prev.map((h) => data.find((d) => d.dow === h.dow) ?? h)
      );
    }
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([loadBookings(), loadHours()]);
  }, [loadBookings, loadHours]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const addTech = useCallback(async () => {
    setMsg("");
    if (!techName.trim()) {
      setMsg("Enter technician full name");
      return;
    }
    const res = await fetch("/api/admin/technicians", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: techName.trim(),
        phone: techPhone.trim() || null,
        is_active: true,
      }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => null);
      setMsg(e?.error || "Failed to add technician");
      return;
    }
    setTechName("");
    setTechPhone("");
    setMsg("Technician added");
  }, [techName, techPhone]);

  const saveHours = useCallback(async () => {
    setMsg("");
    const res = await fetch("/api/admin/working-hours", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hours }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => null);
      setMsg(e?.error || "Failed to save working hours");
      return;
    }
    setMsg("Working hours saved");
  }, [hours]);

  const rows = useMemo(() => {
    return bookings.map((b) => ({
      ...b,
      timeLabel: new Date(b.start_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));
  }, [bookings]);

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <h1 className="text-3xl font-semibold">Admin — Lux Spa Nails</h1>

      <div className="flex items-center gap-3">
        <span>Date</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border rounded p-1"
        />
      </div>

      <section>
        <div className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr] gap-2 font-medium">
          <div>Time</div>
          <div>Service</div>
          <div>Customer</div>
          <div>Phone</div>
          <div>Technician</div>
          <div>Status</div>
        </div>
        {rows.length === 0 && <div className="mt-2">No bookings</div>}
        <div className="divide-y">
          {rows.map((r) => (
            <div
              key={r.id}
              className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr] gap-2 py-2"
            >
              <div>{r.timeLabel}</div>
              <div>{r.service_name}</div>
              <div>{r.customer_name}</div>
              <div>{r.customer_phone}</div>
              <div>{r.technician_name ?? "-"}</div>
              <div>{r.status}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Technicians</h2>
        <div className="flex gap-2">
          <input
            placeholder="Full name"
            value={techName}
            onChange={(e) => setTechName(e.target.value)}
            className="border rounded p-2 flex-1"
          />
          <input
            placeholder="Phone (optional)"
            value={techPhone}
            onChange={(e) => setTechPhone(e.target.value)}
            className="border rounded p-2 flex-1"
          />
          <button
            onClick={addTech}
            className="px-3 py-2 rounded bg-black text-white"
          >
            Add
          </button>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Working Hours</h2>
        <div className="grid gap-2">
          {hours.map((h, idx) => (
            <div key={h.dow} className="flex items-center gap-2">
              <div className="w-10">{DOW[h.dow]}</div>
              <input
                className="border rounded p-1"
                value={h.open_time}
                onChange={(e) => {
                  const v = [...hours];
                  v[idx] = { ...h, open_time: e.target.value };
                  setHours(v);
                }}
              />
              <span>→</span>
              <input
                className="border rounded p-1"
                value={h.close_time}
                onChange={(e) => {
                  const v = [...hours];
                  v[idx] = { ...h, close_time: e.target.value };
                  setHours(v);
                }}
              />
            </div>
          ))}
        </div>
        <button onClick={saveHours} className="px-3 py-2 rounded bg-black text-white">
          Save Hours
        </button>
      </section>

      {!!msg && <p className="text-sm">{msg}</p>}
    </main>
  );
}