"use client";

import { useEffect, useState, ChangeEvent, FormEvent } from "react";

type Service = {
  id: string;
  category: string;
  name: string;
  price_cents: number;
  duration_min: number;
  is_addon: boolean;
};

type Technician = { id: string; full_name: string };

type CreateBookingPayload = {
  service_id: string;
  date: string;          // YYYY-MM-DD (input[type="date"])
  time: string;          // HH:mm       (input[type="time"])
  customer_name: string;
  phone: string;
  technician_id?: string | null;
};

export default function BookPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [techs, setTechs] = useState<Technician[]>([]);
  const [techId, setTechId] = useState<string>(""); // "" = Any technician
  const [customerName, setCustomerName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [loadingTechs, setLoadingTechs] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Load services on first render
  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json() as Promise<{ items: Service[] }>)
      .then((d) => {
        setServices(d.items || []);
        if (d.items?.length) setServiceId(d.items[0].id);
      })
      .catch((err: unknown) => setErrorMsg(String(err)));
  }, []);

  // Load available technicians whenever date/time/service changes
  useEffect(() => {
    const svc = services.find((s) => s.id === serviceId);
    if (!date || !time || !svc) {
      setTechs([]);
      setTechId("");
      return;
    }
    const run = async () => {
      setLoadingTechs(true);
      try {
        const params = new URLSearchParams({
          date,
          time,
          duration_min: String(svc.duration_min),
        });
        const res = await fetch(`/api/technicians/available?${params.toString()}`);
        const json = (await res.json()) as { items: Technician[] };
        setTechs(json.items || []);
        // nếu thợ đang chọn không còn trong danh sách, reset về Any
        if (json.items.findIndex((t) => t.id === techId) === -1) {
          setTechId("");
        }
      } catch (err: unknown) {
        setErrorMsg(String(err));
      } finally {
        setLoadingTechs(false);
      }
    };
    run();
  }, [date, time, serviceId, services, techId]);

  const onChangeService = (e: ChangeEvent<HTMLSelectElement>) => {
    setServiceId(e.target.value);
  };
  const onChangeDate = (e: ChangeEvent<HTMLInputElement>) => {
    setDate(e.target.value);
  };
  const onChangeTime = (e: ChangeEvent<HTMLInputElement>) => {
    setTime(e.target.value);
  };
  const onChangeTech = (e: ChangeEvent<HTMLSelectElement>) => {
    setTechId(e.target.value);
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");

    const payload: CreateBookingPayload = {
      service_id: serviceId,
      date,
      time,
      customer_name: customerName.trim(),
      phone: phone.trim(),
      technician_id: techId || undefined,
    };

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        throw new Error(j.error || "Failed to create booking");
      }
      // chuyển tới trang success
      window.location.href = "/book/success";
    } catch (err: unknown) {
      setErrorMsg(String(err));
    } finally {
      setSaving(false);
    }
  };

  const currentService = services.find((s) => s.id === serviceId);

  return (
    <form onSubmit={onSubmit} className="max-w-2xl p-4 space-y-3">
      <h1 className="text-3xl font-semibold mb-4">Book an Appointment</h1>

      <label className="block">
        <div>Service *</div>
        <select value={serviceId} onChange={onChangeService}>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — ${(s.price_cents / 100).toFixed(2)}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <div>Date *</div>
        <input type="date" value={date} onChange={onChangeDate} />
      </label>

      <label className="block">
        <div>Time *</div>
        <input type="time" value={time} onChange={onChangeTime} />
      </label>

      <label className="block">
        <div>Technician (optional)</div>
        <select value={techId} onChange={onChangeTech} disabled={loadingTechs || !currentService || !date || !time}>
          <option value="">Any technician</option>
          {techs.map((t) => (
            <option key={t.id} value={t.id}>
              {t.full_name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <div>Full name *</div>
        <input
          placeholder="Customer name"
          value={customerName}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setCustomerName(e.target.value)}
        />
      </label>

      <label className="block">
        <div>Phone *</div>
        <input
          placeholder="e.g. 9993332222"
          value={phone}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
        />
      </label>

      {errorMsg && <div className="text-red-600">{errorMsg}</div>}

      <button type="submit" disabled={saving}>
        {saving ? "Saving..." : "Confirm Booking"}
      </button>
    </form>
  );
}