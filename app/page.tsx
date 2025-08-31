"use client";
import { useEffect, useState } from "react";
type Service = { id:string; category:string; name:string; price_cents:number; duration_min:number; is_addon:boolean; };

export default function Home() {
  const [items, setItems] = useState<Service[]>([]);
  useEffect(() => { fetch("/api/services").then(r=>r.json()).then(setItems); }, []);
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-semibold mb-4">Lux Spa Nails — Services</h1>
      <ul className="space-y-2">
        {items.map(s => (
          <li key={s.id} className="flex justify-between border-b py-2">
            <span>{s.category} — {s.name}</span>
            <span>${(s.price_cents/100).toFixed(2)}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
