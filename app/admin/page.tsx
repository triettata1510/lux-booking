"use client";

import { useEffect, useMemo, useState } from "react";

// ===== Types =====
type Booking = {
  id: string;
  start_at: string; // ISO
  end_at: string;   // ISO
  status: "pending" | "confirmed" | "cancelled";
  service_name: string;
  customer_name: string | null;
  customer_phone: string | null;
  technician_name: string | null;
};

type Technician = {
  id: string;
  full_name: string;
  phone: string | null;
};

type WHour = { dow: number; open_time: string; close_time: string }; // 0..6, "HH:MM:SS"

// ===== Helpers =====
function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export default function AdminPage() {
  // Date filter
  const [date, setDate] = useState<string>(ymd(new Date()));

  // Bookings
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Technicians
  const [techs, setTechs] = useState<Technician[]>([]);
  const [newTechName, setNewTechName] = useState("");
  const [newTechPhone, setNewTechPhone] = useState("");

  // Working hours
  const [hours, setHours] = useState<WHour[]>([]);
  const [savingHours, setSavingHours] = useState(false);

  // Messages
  const [msg, setMsg] = useState<string>("");

  // ----- Load bookings for date -----
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingBookings(true);
        const r = await fetch(`/api/admin/bookings?date=${encodeURIComponent(date)}`);
        const data = (await r.json()) as Booking[];
        if (!r.ok) throw new Error("Load bookings failed");
        if (alive) setBookings(data ?? []);
      } catch (e) {
        setMsg("⚠️ Cannot load bookings.");
      } finally {
        setLoadingBookings(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [date]);

  // ----- Load technicians + working hours -----
  async function loadTechs() {
    const r = await fetch("/api/admin/technicians");
    const data = (await r.json()) as Technician[];
    if (!r.ok) throw new Error("Load technicians failed");
    setTechs(data ?? []);
  }
  async function loadHours() {
    const r = await fetch("/api/admin/working-hours");
    const data = (await r.json()) as WHour[];
    if (!r.ok) throw new Error("Load working hours failed");
    // ensure all 0..6 present
    const byDow = new Map<number, WHour>(data.map(h => [h.dow, h]));
    const full: WHour[] = [];
    for (let i = 0; i < 7; i++) {
      const v = byDow.get(i) ?? { dow: i, open_time: "08:00:00", close_time: "19:00:00" };
      full.push(v);
    }
    setHours(full);
  }
  useEffect(() => {
    loadTechs().catch(() => setMsg("⚠️ Cannot load technicians."));
    loadHours().catch(() => setMsg("⚠️ Cannot load working hours."));
  }, []);

  // ----- Add technician -----
  async function addTech() {
    setMsg("");
    if (!newTechName.trim()) {
      setMsg("Please enter technician name.");
      return;
    }
    const payload = { full_name: newTechName.trim(), phone: newTechPhone.trim() || null };
    const r = await fetch("/api/admin/technicians", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      setMsg("❌ Cannot add technician.");
      return;
    }
    setNewTechName("");
    setNewTechPhone("");
    await loadTechs();
  }

  // ----- Delete technician -----
  async function deleteTech(id: string) {
    setMsg("");
    const r = await fetch(`/api/admin/technicians/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!r.ok) {
      setMsg("❌ Cannot delete technician.");
      return;
    }
    await loadTechs();
  }

  // ----- Save working hours -----
  async function saveHours() {
    setMsg("");
    setSavingHours(true);
    try {
      const r = await fetch("/api/admin/working-hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.error || "Save failed");
      setMsg("✅ Working hours saved.");
    } catch (e: unknown) {
      setMsg("❌ Cannot save working hours.");
    } finally {
      setSavingHours(false);
    }
  }

  const bookingsSorted = useMemo(
    () => [...bookings].sort((a, b) => a.start_at.localeCompare(b.start_at)),
    [bookings]
  );

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-10">
      <h1 className="text-3xl font-semibold">Admin — Lux Spa Nails</h1>

      {/* ===== Bookings ===== */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Bookings</h2>

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full border-collapse">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-3">Time</th>
                <th className="py-2 pr-3">Service</th>
                <th className="py-2 pr-3">Customer</th>
                <th className="py-2 pr-3">Phone</th>
                <th className="py-2 pr-3">Technician</th>
                <th className="py-2 pr-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {loadingBookings ? (
                <tr>
                  <td colSpan={6} className="py-3 text-sm">Loading…</td>
                </tr>
              ) : bookingsSorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-3 text-sm">No bookings.</td>
                </tr>
              ) : (
                bookingsSorted.map((b) => (
                  <tr key={b.id} className="border-b">
                    <td className="py-2 pr-3">{fmtTime(b.start_at)}</td>
                    <td className="py-2 pr-3">{b.service_name}</td>
                    <td className="py-2 pr-3">{b.customer_name ?? "-"}</td>
                    <td className="py-2 pr-3">{b.customer_phone ?? "-"}</td>
                    <td className="py-2 pr-3">{b.technician_name ?? "-"}</td>
                    <td className="py-2 pr-3">{b.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ===== Technicians ===== */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Technicians</h2>

        <div className="flex gap-2 max-w-xl">
          <input
            placeholder="Full name"
            value={newTechName}
            onChange={(e) => setNewTechName(e.target.value)}
            className="border rounded px-2 py-1 flex-1"
          />
          <input
            placeholder="Phone (optional)"
            value={newTechPhone}
            onChange={(e) => setNewTechPhone(e.target.value)}
            className="border rounded px-2 py-1 flex-1"
          />
          <button
            onClick={addTech}
            className="px-3 py-1 rounded bg-black text-white"
          >
            Add
          </button>
        </div>

        {techs.length === 0 ? (
          <p className="text-sm">No technicians.</p>
        ) : (
          <ul className="space-y-1">
            {techs.map((t) => (
              <li key={t.id} className="flex items-center gap-3">
                <span>• {t.full_name}{t.phone ? ` — ${t.phone}` : ""}</span>
                <button
                  onClick={() => deleteTech(t.id)}
                  className="text-xs px-2 py-1 rounded border"
                  title="Remove"
                >
                  remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ===== Working Hours ===== */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Working Hours</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-w-3xl">
          {hours.map((h, idx) => (
            <div key={h.dow} className="flex items-center gap-2">
              <div className="w-10 text-sm">{DOW[h.dow]}</div>
              <input
                type="time"
                value={h.open_time.slice(0, 5)}
                onChange={(e) => {
                  const next = [...hours];
                  next[idx] = { ...h, open_time: `${e.target.value}:00` };
                  setHours(next);
                }}
                className="border rounded px-2 py-1"
              />
              <span>–</span>
              <input
                type="time"
                value={h.close_time.slice(0, 5)}
                onChange={(e) => {
                  const next = [...hours];
                  next[idx] = { ...h, close_time: `${e.target.value}:00` };
                  setHours(next);
                }}
                className="border rounded px-2 py-1"
              />
            </div>
          ))}
        </div>

        <button
          onClick={saveHours}
          disabled={savingHours}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
        >
          {savingHours ? "Saving…" : "Save Hours"}
        </button>
      </section>

      {!!msg && <p className="text-sm">{msg}</p>}
    </main>
  );
}