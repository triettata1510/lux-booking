import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  // Chỉ bảo vệ UI /admin (KHÔNG chặn /api/admin)
  if (!path.startsWith("/admin")) return NextResponse.next();

  const header = req.headers.get("authorization") || "";
  const u = process.env.ADMIN_USER || "admin";
  const p = process.env.ADMIN_PASS || "";
  if (header.startsWith("Basic ")) {
    const [user, pass] = Buffer.from(header.slice(6), "base64").toString().split(":");
    if (user === u && pass === p) return NextResponse.next();
  }
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Admin Area"' },
  });
}

export const config = { matcher: ["/admin/:path*"] };
