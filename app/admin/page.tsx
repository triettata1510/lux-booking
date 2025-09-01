"use client";
import { useEffect, useMemo, useState } from "react";

type BookingRow = {
  id: string;
  start_at: string;
  time_label: string;
  service: string;
  customer: string;
  phone: string;
  technician: string | null;
  status: string;
};

type Tech = { id: string; full_name: string; phone?: string | null };

type Hours = {
  weekday: number; // 0-6
  open_min: number | null; // minutes from 00:00
  close_min: number | null;
  is_closed: boolean;
};

export default function AdminPage() {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [techs, setTechs] = useState<Tech[]>([]);
  const [newTechName, setNewTechName] = useState("");
  const [newTechPhone, setNewTechPhone] = useState("");

  // Working hours
  const [hours, setHours] = useState<Hours[]>([]);

  async function loadBookings(d: string) {
    const res = await fetch(`/api/admin/bookings?date=${d}`);
    const data = (await res.json()) as { rows: BookingRow[] };
    setRows(data.rows);
  }

  async function loadTechs() {
    const res = await fetch("/api/technicians");
    const data = (await res.json()) as { technicians: Tech[] };
    setTechs(data.technicians);
  }

  async function loadHours() {
    const res = await fetch("/api/admin/working-hours");
    const data = (await res.json()) as { hours: Hours[] };
    setHours(data.hours);
  }

  useEffect(() => {
    loadBookings(date);
    loadTechs();
    loadHours();
  }, [date]);

  async function addTech() {
    if (!newTechName.trim()) return;
    const res = await fetch("/api/admin/technicians", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: newTechName, phone: newTechPhone || null })
    });
    if (res.ok) {
      setNewTechName("");
      setNewTechPhone("");
      loadTechs();
    }
  }

  async function removeTech(id: string) {
    await fetch(`/api/admin/technicians/${id}`, { method: "DELETE" });
    loadTechs();
  }

  async function saveHours(next: Hours[]) {
    await fetch("/api/admin/working-hours", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hours: next })
    });
    setHours(next);
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-3xl font-semibold">Admin — Lux Spa Nails</h1>

      {/* Date filter */}
      <div className="mt-4">
        <label className="text-sm mr-2">Date</label>
        <input
          type="date"
          value={date}
          onChange={(ev) => setDate(ev.target.value)}
          className="border rounded px-2 py-1"
        />
      </div>

      {/* Bookings */}
      <section className="mt-6">
        <h2 className="text-2xl font-semibold mb-2">Bookings</h2>
        <table className="w-full text-sm">
          <thead className="text-left">
            <tr>
              <th className="py-1">Time</th>
              <th className="py-1">Service</th>
              <th className="py-1">Customer</th>
              <th className="py-1">Phone</th>
              <th className="py-1">Technician</th>
              <th className="py-1">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="py-1">{r.time_label}</td>
                <td className="py-1">{r.service}</td>
                <td className="py-1">{r.customer}</td>
                <td className="py-1">{r.phone}</td>
                <td className="py-1">{r.technician || "-"}</td>
                <td className="py-1">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Technicians */}
      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-2">Technicians</h2>
        <div className="flex gap-2 mb-3">
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
          <button onClick={addTech} className="px-3 py-1 rounded bg-black text-white">
            Add
          </button>
        </div>

        <ul className="space-y-1">
          {techs.map((t) => (
            <li key={t.id} className="text-sm">
              • {t.full_name} {t.phone ? `— ${t.phone}` : ""}
              <button
                className="ml-2 text-red-600 underline"
                onClick={() => removeTech(t.id)}
              >
                remove
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Working Hours (hiển thị/ghi đơn giản) */}
      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-2">Working Hours</h2>
        <table className="text-sm">
          <thead>
            <tr>
              <th className="py-1 pr-4">Weekday</th>
              <th className="py-1 pr-4">Open</th>
              <th className="py-1 pr-4">Close</th>
              <th className="py-1 pr-4">Closed?</th>
            </tr>
          </thead>
          <tbody>
            {hours.map((h, idx) => (
              <tr key={idx}>
                <td className="py-1 pr-4">{h.weekday}</td>
                <td className="py-1 pr-4">
                  <input
                    type="number"
                    className="w-24 border rounded px-1"
                    value={h.open_min ?? 600}
                    onChange={(ev) => {
                      const next = [...hours];
                      next[idx] = { ...h, open_min: Number(ev.target.value) };
                      setHours(next);
                    }}
                  />
                </td>
                <td className="py-1 pr-4">
                  <input
                    type="number"
                    className="w-24 border rounded px-1"
                    value={h.close_min ?? 1140}
                    onChange={(ev) => {
                      const next = [...hours];
                      next[idx] = { ...h, close_min: Number(ev.target.value) };
                      setHours(next);
                    }}
                  />
                </td>
                <td className="py-1 pr-4">
                  <input
                    type="checkbox"
                    checked={!!h.is_closed}
                    onChange={(ev) => {
                      const next = [...hours];
                      next[idx] = { ...h, is_closed: ev.target.checked };
                      setHours(next);
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          className="mt-3 px-3 py-1 rounded bg-black text-white"
          onClick={() => saveHours(hours)}
        >
          Save hours
        </button>
      </section>
    </main>
  );
}