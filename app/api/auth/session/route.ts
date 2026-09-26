import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { getRequestLocation } from "@/lib/request-location";
import { headers } from "next/headers";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  const requestHeaders = await headers();
  return NextResponse.json({
    user: user ? { ...user, location: getRequestLocation(requestHeaders) } : null,
  });
}
