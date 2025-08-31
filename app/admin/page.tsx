"use client";
import { useEffect, useState } from "react";

type Row = { id:string; start_at:string; end_at:string; status:string; service_name:string; customer_name:string; customer_phone:string; technician_name:string|null };
type Tech = { id:string; full_name:string; phone:string|null; is_active:boolean };
type Hours = { dow:number; open_time:string; close_time:string };
const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// helper: luôn trả về mảng (hoặc []) nếu API lỗi
async function j<T=any>(url: string): Promise<T|[]> {
  try {
    const r = await fetch(url);
    if (!r.ok) return [];
    return await r.json();
  } catch { return []; }
}

export default function AdminPage() {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [rows, setRows] = useState<Row[]>([]);
  const [techs, setTechs] = useState<Tech[]>([]);
  const [hours, setHours] = useState<Hours[]>([]);
  const [newTech, setNewTech] = useState({ name:"", phone:"" });
  const [msg, setMsg] = useState("");

  async function loadAll() {
    const [b, t, h] = await Promise.all([
      j<Row[]>(`/api/admin/bookings?date=${date}`),
      j<Tech[]>(`/api/admin/technicians`),
      j<Hours[]>(`/api/admin/working-hours`),
    ]);
    setRows((b as Row[]) || []);
    setTechs((t as Tech[]) || []);
    setHours((h as Hours[]) || []);
  }
  useEffect(()=>{ loadAll(); }, [date]);

  async function addTech() {
    setMsg("");
    if (!newTech.name) return setMsg("Name is required");
    const res = await fetch(`/api/admin/technicians`, {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ full_name:newTech.name, phone:newTech.phone||null })
    });
    if (!res.ok) { setMsg("Failed to add"); return; }
    setNewTech({ name:"", phone:"" }); loadAll();
  }
  async function delTech(id:string) { await fetch(`/api/admin/technicians/${id}`, { method:"DELETE" }); loadAll(); }
  async function saveHours() {
    const body = hours.map(h=>({ dow:h.dow, open_time:h.open_time, close_time:h.close_time }));
    const res = await fetch(`/api/admin/working-hours`, { method:"PUT", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) });
    setMsg(res.ok ? "Saved hours ✔" : "Save hours failed");
  }

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-8">
      <h1 className="text-3xl font-semibold">Admin — Lux Spa Nails</h1>

      <section className="space-y-3">
        <div className="flex items-end gap-3">
          <div>
            <label className="text-sm font-medium">Date</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="border rounded p-2 ml-2" />
          </div>
          {!!msg && <span className="text-sm">{msg}</span>}
        </div>
        <div className="border rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2">Time</th>
                <th className="text-left p-2">Service</th>
                <th className="text-left p-2">Customer</th>
                <th className="text-left p-2">Phone</th>
                <th className="text-left p-2">Technician</th>
                <th className="text-left p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r)=>(
                <tr key={r.id} className="border-t">
                  <td className="p-2">{new Date(r.start_at).toLocaleTimeString([], { hour:"numeric", minute:"2-digit" })}</td>
                  <td className="p-2">{r.service_name}</td>
                  <td className="p-2">{r.customer_name}</td>
                  <td className="p-2">{r.customer_phone}</td>
                  <td className="p-2">{r.technician_name || "-"}</td>
                  <td className="p-2">{r.status}</td>
                </tr>
              ))}
              {!rows.length && <tr><td className="p-2" colSpan={6}>No bookings</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Technicians</h2>
          <div className="flex gap-2">
            <input className="border rounded p-2 flex-1" placeholder="Full name"
              value={newTech.name} onChange={e=>setNewTech(s=>({ ...s, name:e.target.value }))} />
            <input className="border rounded p-2 flex-1" placeholder="Phone (optional)"
              value={newTech.phone} onChange={e=>setNewTech(s=>({ ...s, phone:e.target.value }))} />
            <button onClick={addTech} className="px-3 py-2 rounded bg-black text-white">Add</button>
          </div>
          <ul className="border rounded divide-y">
            {techs.map(t=>(
              <li key={t.id} className="flex items-center justify-between p-2">
                <div>
                  <div className="font-medium">{t.full_name}</div>
                  <div className="text-xs text-gray-500">{t.phone || "-"}</div>
                </div>
                <button onClick={()=>delTech(t.id)} className="text-red-600 text-sm">Delete</button>
              </li>
            ))}
            {!techs.length && <li className="p-2 text-sm">No technicians</li>}
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Working Hours</h2>
          <div className="border rounded divide-y">
            {hours.map((h, idx)=>(
              <div key={idx} className="grid grid-cols-3 gap-2 items-center p-2">
                <div>{DOW[h.dow]}</div>
                <input className="border rounded p-2" value={h.open_time}
                  onChange={e=>{ const v=[...hours]; v[idx]={...h, open_time:e.target.value}; setHours(v); }} />
                <input className="border rounded p-2" value={h.close_time}
                  onChange={e=>{ const v=[...hours]; v[idx]={...h, close_time:e.target.value}; setHours(v); }} />
              </div>
            ))}
          </div>
          <button onClick={saveHours} className="px-3 py-2 rounded bg-black text-white">Save Hours</button>
        </div>
      </section>
    </main>
  );
}
