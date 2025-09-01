"use client";
import { useEffect, useMemo, useState } from "react";

/** ===== Types ===== */
type BookingRow = {
  id: string;
  start_at: string; // ISO
  time_label: string;
  service: string;
  customer: string;
  phone: string;
  technician: string | null;
  status: string;
};

type Technician = { id: string; full_name: string; phone: string | null };

type WorkingHours = {
  // 0=Sun ... 6=Sat
  weekday: number;
  open_min: number | null;   // minutes from 00:00 (e.g. 540 = 09:00)
  close_min: number | null;  // (e.g. 1140 = 19:00)
  is_closed: boolean;
};

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function AdminPage() {
  /** Bookings by day */
  const [date, setDate] = useState<string>(ymd(new Date()));
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loadingBookings, setLoadingBookings] = useState<boolean>(false);

  /** Technicians CRUD */
  const [techs, setTechs] = useState<Technician[]>([]);
  const [newTechName, setNewTechName] = useState<string>("");
  const [newTechPhone, setNewTechPhone] = useState<string>("");

  /** Working hours */
  const [hours, setHours] = useState<WorkingHours[]>([]);
  const [savingHours, setSavingHours] = useState<boolean>(false);

  /** Load bookings (server đã lọc theo ?date) */
  async function loadBookings(d: string) {
    setLoadingBookings(true);
    try {
      const r = await fetch(`/api/admin/bookings?date=${encodeURIComponent(d)}`, { cache: "no-store" });
      const j: { rows: BookingRow[] } = await r.json();
      setRows(j.rows ?? []);
    } finally {
      setLoadingBookings(false);
    }
  }

  /** Load techs */
  async function loadTechs() {
    const r = await fetch("/api/admin/technicians", { cache: "no-store" });
    if (!r.ok) return;
    const j: { ok?: boolean; items?: Technician[]; technicians?: Technician[] } = await r.json();
    // chấp nhận cả keys: items | technicians
    const list = (j.items ?? j.technicians) ?? [];
    setTechs(list);
  }

  /** Load hours */
  async function loadHours() {
    const r = await fetch("/api/admin/working-hours", { cache: "no-store" });
    if (!r.ok) return;
    const j: { ok?: boolean; items?: WorkingHours[]; hours?: WorkingHours[] } = await r.json();
    const list = (j.items ?? j.hours) ?? [];
    setHours(list);
  }

  useEffect(() => {
    loadBookings(date);
  }, [date]);

  useEffect(() => {
    // load 1 lần khi vào trang
    loadTechs();
    loadHours();
  }, []);

  /** Add / remove tech */
  async function addTech() {
    const name = newTechName.trim();
    if (!name) return;
    const phone = newTechPhone.trim() || null;
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
  async function removeTech(id: string) {
    if (!confirm("Remove this technician?")) return;
    const r = await fetch(`/api/admin/technicians/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (r.ok) loadTechs();
  }

  /** Save hours */
  async function saveHours() {
    setSavingHours(true);
    try {
      const r = await fetch("/api/admin/working-hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours }),
      });
      if (!r.ok) throw new Error("Save failed");
      alert("Saved working hours!");
    } catch {
      alert("Failed to save working hours.");
    } finally {
      setSavingHours(false);
    }
  }

  const tableRows = useMemo(() => rows, [rows]);

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-10">
      <h1 className="text-3xl font-semibold">Admin — Lux Spa Nails</h1>

      {/* BOOKING BY DATE */}
      <section className="space-y-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-semibold">Bookings</h2>
          <div className="text-sm text-gray-600">
            (Date)
            <input
              type="date"
              className="ml-2 border rounded px-2 py-1"
              value={date}
              onChange={(ev) => setDate(ev.target.value)}
            />
          </div>
          <div className="ml-auto text-sm">
            <span className="font-medium">Total:</span>{" "}
            {loadingBookings ? "…" : tableRows.length}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b font-medium text-left">
                <th className="py-2 pr-4">Time</th>
                <th className="py-2 pr-4">Service</th>
                <th className="py-2 pr-4">Customer</th>
                <th className="py-2 pr-4">Phone</th>
                <th className="py-2 pr-4">Technician</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-1 pr-4">{r.time_label}</td>
                  <td className="py-1 pr-4">{r.service}</td>
                  <td className="py-1 pr-4">{r.customer}</td>
                  <td className="py-1 pr-4">{r.phone}</td>
                  <td className="py-1 pr-4">{r.technician ?? "-"}</td>
                  <td className="py-1">{r.status}</td>
                </tr>
              ))}
              {!loadingBookings && tableRows.length === 0 && (
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

      {/* TECHNICIANS CRUD */}
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
          <button className="px-3 py-1 rounded bg-black text-white" onClick={addTech}>
            Add
          </button>
        </div>
        <ul className="space-y-1">
          {techs.map((t) => (
            <li key={t.id} className="flex items-center gap-3 text-sm">
              <span className="min-w-[160px]">{t.full_name}</span>
              <span className="text-gray-600">{t.phone ?? "-"}</span>
              <button onClick={() => removeTech(t.id)} className="ml-3 text-red-600 hover:underline">
                remove
              </button>
            </li>
          ))}
          {techs.length === 0 && <li className="text-gray-500">No technicians yet.</li>}
        </ul>
      </section>

      {/* WORKING HOURS */}
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Working Hours</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {hours.map((h, idx) => (
            <div key={h.weekday} className="border rounded p-3 flex items-center gap-3">
              <div className="w-14 font-medium">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][h.weekday]}</div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={h.is_closed}
                  onChange={(ev) => {
                    const next = [...hours];
                    next[idx] = { ...h, is_closed: ev.target.checked };
                    setHours(next);
                  }}
                />
                Closed
              </label>
              {!h.is_closed && (
                <>
                  <input
                    type="number"
                    className="w-24 border rounded px-2 py-1"
                    value={h.open_min ?? 600}
                    onChange={(ev) => {
                      const next = [...hours];
                      next[idx] = { ...h, open_min: Number(ev.target.value) };
                      setHours(next);
                    }}
                  />
                  <span>-</span>
                  <input
                    type="number"
                    className="w-24 border rounded px-2 py-1"
                    value={h.close_min ?? 1140}
                    onChange={(ev) => {
                      const next = [...hours];
                      next[idx] = { ...h, close_min: Number(ev.target.value) };
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