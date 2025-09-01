// app/admin/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type BookingRow = {
  id: string;
  start_at: string; // ISO
  status: string;
  services?: { name: string | null } | null;
  customers?: { full_name: string | null; phone: string | null } | null;
  technicians?: { full_name: string | null } | null;
};

export default function AdminPage() {
  const [date, setDate] = useState<string>(() => {
    // mặc định hôm nay theo local
    return new Date().toISOString().slice(0, 10);
    // YYYY-MM-DD
  });
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr("");
    fetch(`/api/admin/bookings?date=${date}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (!d?.ok) throw new Error(d?.error || "Load failed");
        setRows(d.items || []);
      })
      .catch((e) => alive && setErr(e?.message || "Load failed"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [date]);

  const niceRows = useMemo(() => {
    return rows.map((r) => {
      const t = new Date(r.start_at);
      const timeLabel = t.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      return {
        id: r.id,
        time: timeLabel,
        service: r.services?.name || "",
        customer: r.customers?.full_name || "",
        phone: r.customers?.phone || "",
        technician: r.technicians?.full_name || "-",
        status: r.status,
      };
    });
  }, [rows]);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-3xl font-semibold mb-4">Admin — Lux Spa Nails</h1>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Bookings</h2>

        <div className="flex items-center gap-3 mb-3">
          <label className="text-sm">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border rounded p-1"
          />
          {loading && <span className="text-sm">Loading…</span>}
          {!!err && <span className="text-sm text-red-600">{err}</span>}
        </div>

        <div className="overflow-auto">
          <table className="min-w-[720px] w-full border">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-2 py-1">Time</th>
                <th className="text-left px-2 py-1">Service</th>
                <th className="text-left px-2 py-1">Customer</th>
                <th className="text-left px-2 py-1">Phone</th>
                <th className="text-left px-2 py-1">Technician</th>
                <th className="text-left px-2 py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {niceRows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-2 py-1">{r.time}</td>
                  <td className="px-2 py-1">{r.service}</td>
                  <td className="px-2 py-1">{r.customer}</td>
                  <td className="px-2 py-1">{r.phone}</td>
                  <td className="px-2 py-1">{r.technician}</td>
                  <td className="px-2 py-1">{r.status}</td>
                </tr>
              ))}
              {!loading && niceRows.length === 0 && (
                <tr>
                  <td className="px-2 py-3 text-gray-500" colSpan={6}>
                    No bookings for this date.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}