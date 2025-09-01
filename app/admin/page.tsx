"use client";
import { useEffect, useState } from "react";

type Booking = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  service_name?: string;
  customer_name?: string;
  customer_phone?: string;
  technician_name?: string | null;
};
type Technician = { id: string; full_name: string; phone?: string | null };

export default function AdminPage() {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [techs, setTechs] = useState<Technician[]>([]);
  const [newTechName, setNewTechName] = useState("");
  const [newTechPhone, setNewTechPhone] = useState("");

  async function loadBookings() {
    const r = await fetch(`/api/admin/bookings?date=${date}`, { cache: "no-store" });
    const d = await r.json();
    setBookings(d ?? []);
  }
  async function loadTechs() {
    const r = await fetch("/api/admin/technicians", { cache: "no-store" });
    const d = await r.json();
    setTechs(d ?? []);
  }

  useEffect(() => { loadBookings(); }, [date]);
  useEffect(() => { loadTechs(); }, []);

  async function addTech() {
    if (!newTechName.trim()) return;
    await fetch("/api/admin/technicians", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: newTechName.trim(), phone: newTechPhone.trim() || null })
    });
    setNewTechName(""); setNewTechPhone("");
    await loadTechs();
  }

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-8">
      <h1 className="text-3xl font-semibold">Admin — Lux Spa Nails</h1>

      {/* Bookings */}
      <section>
        <h2 className="text-2xl font-semibold">Bookings</h2>
        <div className="my-2">
          <label className="mr-2 text-sm">Date</label>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="border rounded px-2 py-1" />
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-3">Time</th>
                <th className="py-2 pr-3">Service</th>
                <th className="py-2 pr-3">Customer</th>
                <th className="py-2 pr-3">Phone</th>
                <th className="py-2 pr-3">Technician</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => {
                const t = new Date(b.start_at);
                const label = t.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
                return (
                  <tr key={b.id} className="border-b">
                    <td className="py-2 pr-3">{label}</td>
                    <td className="py-2 pr-3">{b.service_name}</td>
                    <td className="py-2 pr-3">{b.customer_name}</td>
                    <td className="py-2 pr-3">{b.customer_phone}</td>
                    <td className="py-2 pr-3">{b.technician_name || "-"}</td>
                    <td className="py-2">{b.status}</td>
                  </tr>
                );
              })}
              {bookings.length === 0 && (
                <tr><td className="py-2" colSpan={6}>No bookings</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Technicians */}
      <section>
        <h2 className="text-2xl font-semibold">Technicians</h2>
        <div className="flex gap-2 items-center my-3">
          <input
            value={newTechName}
            onChange={(e)=>setNewTechName(e.target.value)}
            className="border rounded px-2 py-1"
            placeholder="Full name"
          />
          <input
            value={newTechPhone}
            onChange={(e)=>setNewTechPhone(e.target.value)}
            className="border rounded px-2 py-1"
            placeholder="Phone (optional)"
          />
          <button onClick={addTech} className="px-3 py-1 rounded bg-black text-white">Add</button>
        </div>
        <ul className="list-disc pl-5">
          {techs.length === 0 ? (
            <li>No technicians</li>
          ) : (
            techs.map(t => (
              <li key={t.id}>{t.full_name}{t.phone ? ` — ${t.phone}` : ""}</li>
            ))
          )}
        </ul>
      </section>
    </main>
  );
}