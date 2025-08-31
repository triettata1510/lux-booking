"use client";
import { useEffect, useMemo, useState } from "react";

type Service = {
  id: string;
  name: string;
  category: string;
  price_cents: number;
  duration_min: number;
  is_addon: boolean;
};
type Slot = { start: string; end: string };

// Toast DOM thuần – luôn hiển thị được kể cả khi Tailwind/React trục trặc
function showToast(text: string, ok = true) {
  try {
    let el = document.getElementById("lux-toast") as HTMLDivElement | null;
    if (!el) {
      el = document.createElement("div");
      el.id = "lux-toast";
      Object.assign(el.style, {
        position: "fixed",
        top: "12px",
        right: "12px",
        zIndex: "99999",
        padding: "12px 16px",
        borderRadius: "10px",
        background: ok ? "#ecfdf5" : "#fef2f2",
        color: ok ? "#065f46" : "#991b1b",
        boxShadow: "0 6px 20px rgba(0,0,0,.15)",
        fontWeight: "600",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        border: ok ? "1px solid #34d399" : "1px solid #f87171",
        maxWidth: "80vw",
      } as CSSStyleDeclaration);
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.style.display = "block";
    // ẩn sau 5s
    window.setTimeout(() => {
      if (el) el.style.display = "none";
    }, 5000);
  } catch {}
}

export default function BookPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slot, setSlot] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  // Đọc “ok” từ URL/localStorage để hiện banner nếu cần
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("ok") === "1") {
        setMsg("✅ Booking confirmed! We’ll text you a confirmation.");
        showToast("Booking confirmed!", true);
        sp.delete("ok");
        history.replaceState(null, "", `${location.pathname}${sp.toString() ? "?" + sp.toString() : ""}`);
      } else {
        const ls = localStorage.getItem("lux_last_booking_ok");
        if (ls === "1") {
          setMsg("✅ Booking confirmed! We’ll text you a confirmation.");
          showToast("Booking confirmed!", true);
          localStorage.removeItem("lux_last_booking_ok");
        }
      }
    } catch {}
  }, []);

  // Load services (lọc add-on)
  useEffect(() => {
    (async () => {
      const r = await fetch("/api/services");
      const d: Service[] = await r.json();
      const nonAddons = (d || []).filter((s) => !s.is_addon);
      setServices(nonAddons);
      if (nonAddons.length) setServiceId(nonAddons[0].id);
    })();
  }, []);

  // Load slots theo ngày
  useEffect(() => {
    if (!date) return;
    (async () => {
      const r = await fetch(`/api/availability?date=${encodeURIComponent(date)}`);
      const d = await r.json();
      setSlots(d?.slots ?? []);
      setSlot("");
    })();
  }, [date]);

  // Gom theo category
  const grouped = useMemo(() => {
    const g: Record<string, Service[]> = {};
    for (const s of services) (g[s.category] ||= []).push(s);
    return g;
  }, [services]);

  // Auto clear banner
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(""), 6000);
    return () => clearTimeout(t);
  }, [msg]);

  async function submit() {
    setMsg("⏳ Processing...");
    showToast("Processing...", true);
    if (!serviceId || !slot || !name || !phone) {
      setMsg("❌ Please fill all required fields.");
      showToast("Please fill all required fields.", false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: serviceId,
          start_at: slot,
          customer: { full_name: name, phone },
        }),
      });

      const data = await res.json();
      console.log("POST /api/bookings =>", res.status, data);

      if (!res.ok || !data?.booking_id) {
        throw new Error(data?.error || "Booking failed (no booking_id)");
      }

      // ✅ Thành công – vừa banner, vừa toast, vừa dự phòng URL/localStorage
      setMsg("✅ Booking confirmed! We’ll text you a confirmation.");
      showToast("Booking confirmed!", true);
      try {
        localStorage.setItem("lux_last_booking_ok", "1");
      } catch {}
      try {
        const sp = new URLSearchParams(window.location.search);
        sp.set("ok", "1");
        history.replaceState(null, "", `${location.pathname}?${sp.toString()}`);
      } catch {}

      // dọn form
      setName("");
      setPhone("");
      setSlot("");
      try {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {}
    } catch (e: any) {
      console.error(e);
      const text = "❌ " + (e?.message || "Booking failed");
      setMsg(text);
      showToast(text, false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-3xl font-semibold">Book an Appointment</h1>

      {/* Banner trạng thái */}
      {msg && (
        <div
          id="booking-status"
          className={`rounded border p-4 text-base font-medium ${
            msg.startsWith("✅")
              ? "border-green-500 bg-green-50 text-green-800"
              : msg.startsWith("⏳")
              ? "border-blue-400 bg-blue-50 text-blue-800"
              : "border-red-500 bg-red-50 text-red-800"
          }`}
          role="status"
          aria-live="polite"
        >
          {msg}
        </div>
      )}

      {/* Service */}
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

      {/* Date & Time */}
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
              const label = t.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
              return (
                <option key={i} value={s.start}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Customer */}
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
            placeholder="1XXXXXXXXXX"
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
    </main>
  );
}