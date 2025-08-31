"use client";

export default function SuccessPage() {
  return (
    <main className="mx-auto max-w-xl p-6 space-y-4 text-center">
      <h1 className="text-3xl font-semibold text-green-600">
        Booking Successful!
      </h1>
      <p className="text-lg">Your appointment has been confirmed. 🎉</p>

      <p className="text-sm text-gray-700">
        We’ve sent you a confirmation SMS. <br />
        📍 15838 U.S 63, Hayward, WI <br />
        📞 (715) 699-1258
      </p>

      <a
        href="/book"
        className="inline-block px-4 py-2 rounded bg-black text-white mt-4"
      >
        Book another appointment
      </a>
    </main>
  );
}