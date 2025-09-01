"use client";

import { useEffect, useMemo, useState } from "react";

/** ===== Types khớp với JSON trả về từ API ===== */
type BookingRow = {
  id: string;
  start_at: string; // ISO
  status: "pending" | "confirmed" | "cancelled";
  services: { name: string } | null;
  customers: { full_name: string; phone: string | null } | null;
  technicians: { full_name: string } | null;
};

type BookingsResp = { ok: true; items: BookingRow[] };

type Technician = { id: string; full_name: string; phone: string | null };

type WorkingHours = {
  // 0=Sun ... 6=Sat
  weekday: number;
  open: string | null; // "09:00"
  close: string | null; // "19:00"
  is_closed: boolean;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Utility */
function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** ===== Page ===== */
export default function AdminPage() {
  /** Tab 1: Bookings theo ngày */
  const [date, setDate] = useState<string>(ymd(new Date()));
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const bookingsCount = rows.length;

  /** Tab 2: Technicians */
  const [techs, setTechs] = useState<Technician[]>([]);
  const [newTechName, setNewTechName] = useState("");
  const [newTechPhone, setNewTechPhone] = useState("");

  /** Tab 3: Working hours */
  const [hours, setHours] = useState<WorkingHours[]>([]);
  const [savingHours, setSavingHours] = useState(false);

  /** Load bookings theo ngày */
  useEffect(() => {
    let aborted = false;
    (async () => {
      setLoadingBookings(true);
      try {
        const r = await fetch(`/api/admin/bookings?date=${date}`, {
          cache: "no-store",
        });
        const d = (await r.json()) as BookingsResp;
        if (!aborted && r.ok && d.ok) setRows(d.items);
      } catch {}
      setLoadingBookings(false);
    })();
    return () => {
      aborted = true;
    };
  }, [date]);

  /** Load technicians */
  async function loadTechs() {
    const r = await fetch("/api/admin/technicians", { cache: "no-store" });
    if (!r.ok) return;
    const d = (await r.json()) as { ok: true; items: Technician[] };
    setTechs(d.items || []);
  }
  useEffect(() => {
    loadTechs();
  }, []);

  /** Load working hours */
  async function loadHours() {
    const r = await fetch("/api/admin/working-hours", { cache: "no-store" });
    if (!r.ok) return;
    const d = (await r.json()) as {
      ok: true;
      items: WorkingHours[];
    };
    // đảm bảo đủ 7 ngày
    const map = new Map<number, WorkingHours>();
    (d.items || []).forEach((x) => map.set(x.weekday, x));
    const full: WorkingHours[] = Array.from({ length: 7 }, (_, wd) => {
      return (
        map.get(wd) || {
          weekday: wd,
          open: "09:00",
          close: "19:00",
          is_closed: wd === 0 ? true : false, // CN đóng mặc định
        }
      );
    });
    setHours(full);
  }
  useEffect(() => {
    loadHours();
  }, []);

  /** Add tech */
  async function addTech() {
    const name = newTechName.trim();
    const phone = newTechPhone.trim() || null;
    if (!name) return;
    const r = await fetch("/api/admin/technicians", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: name, phone }),
    });
    if (r.ok) {
      setNewTechName("");
      setNewTechPhone("");
      loadTechs();
    }
  }
  /** Remove tech */
  async function removeTech(id: string) {
    if (!confirm("Remove this technician?")) return;
    const r = await fetch(`/api/admin/technicians/${id}`, { method: "DELETE" });
    if (r.ok) loadTechs();
  }

  /** Save hours */
  async function saveHours() {
    setSavingHours(true);
    try {
      const r = await fetch("/api/admin/working-hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: hours }),
      });
      if (!r.ok) throw new Error("Save failed");
      alert("Saved working hours!");
    } catch (e) {
      alert("Failed to save working hours.");
    } finally {
      setSavingHours(false);
    }
  }

  const grouped = useMemo(() => {
    // nhóm theo giờ hiển thị
    return rows.map((r) => ({
      id: r.id,
      time: fmtTime(r.start_at),
      service: r.services?.name ?? "-",
      customer: r.customers?.full_name ?? "-",
      phone: r.customers?.phone ?? "-",
      technician: r.technicians?.full_name ?? "-",
      status: r.status,
    }));
  }, [rows]);

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-10">
      <h1 className="text-3xl font-semibold">Admin — Lux Spa Nails</h1>

      {/* ====== BOOKING BY DATE ====== */}
      <section className="space-y-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-semibold">Bookings</h2>
          <div className="text-sm text-gray-600">
            (Date)
            <input
              type="date"
              className="ml-2 border rounded px-2 py-1"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="ml-auto text-sm">
            <span className="font-medium">Total:</span>{" "}
            {loadingBookings ? "…" : bookingsCount}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b font-medium">
                <th className="text-left py-2 pr-4">Time</th>
                <th className="text-left py-2 pr-4">Service</th>
                <th className="text-left py-2 pr-4">Customer</th>
                <th className="text-left py-2 pr-4">Phone</th>
                <th className="text-left py-2 pr-4">Technician</th>
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-2 pr-4">{r.time}</td>
                  <td className="py-2 pr-4">{r.service}</td>
                  <td className="py-2 pr-4">{r.customer}</td>
                  <td className="py-2 pr-4">{r.phone}</td>
                  <td className="py-2 pr-4">{r.technician}</td>
                  <td className="py-2">{r.status}</td>
                </tr>
              ))}
              {!loadingBookings && grouped.length === 0 && (
                <tr>
                  <td className="py-3 text-gray-500" colSpan={6}>
                    No bookings for this date.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ====== TECHNICIANS CRUD ====== */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Technicians</h2>
        <div className="flex gap-2">
          <input
            className="border rounded px-2 py-1"
            placeholder="Full name"
            value={newTechName}
            onChange={(e) => setNewTechName(e.target.value)}
          />
          <input
            className="border rounded px-2 py-1"
            placeholder="Phone (optional)"
            value={newTechPhone}
            onChange={(e) => setNewTechPhone(e.target.value)}
          />
          <button
            className="px-3 py-1 rounded bg-black text-white"
            onClick={addTech}
          >
            Add
          </button>
        </div>
        <ul className="space-y-1">
          {techs.map((t) => (
            <li key={t.id} className="flex items-center gap-3">
              <span className="min-w-[160px]">{t.full_name}</span>
              <span className="text-gray-600">{t.phone || "-"}</span>
              <button
                onClick={() => removeTech(t.id)}
                className="ml-3 text-red-600 hover:underline"
              >
                remove
              </button>
            </li>
          ))}
          {techs.length === 0 && (
            <li className="text-gray-500">No technicians yet.</li>
          )}
        </ul>
      </section>

      {/* ====== WORKING HOURS ====== */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Working Hours</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {hours.map((h, idx) => (
            <div
              key={h.weekday}
              className="border rounded p-3 flex items-center gap-3"
            >
              <div className="w-14 font-medium">{WEEKDAYS[h.weekday]}</div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={h.is_closed}
                  onChange={(e) => {
                    const next = [...hours];
                    next[idx] = { ...h, is_closed: e.target.checked };
                    setHours(next);
                  }}
                />
                Closed
              </label>
              {!h.is_closed && (
                <>
                  <input
                    type="time"
                    className="border rounded px-2 py-1"
                    value={h.open ?? "09:00"}
                    onChange={(e) => {
                      const next = [...hours];
                      next[idx] = { ...h, open: e.target.value };
                      setHours(next);
                    }}
                  />
                  <span>-</span>
                  <input
                    type="time"
                    className="border rounded px-2 py-1"
                    value={h.close ?? "19:00"}
                    onChange={(e) => {
                      const next = [...hours];
                      next[idx] = { ...h, close: e.target.value };
                      setHours(next);
                    }}
                  />
                </>
              )}
            </div>
          ))}
        </div>
        <button
          disabled={savingHours}
          onClick={saveHours}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          {savingHours ? "Saving..." : "Save working hours"}
        </button>
      </section>
    </main>
  );
}