import { NextResponse } from "next/server";
import {
  clearPremiumTestFixtureCookie,
  isPremiumTestFixtureEnabled,
  PREMIUM_TEST_FIXTURE_USER,
  setPremiumTestFixtureCookie,
} from "@/lib/auth-session";
import { isSameOrigin, privateJsonHeaders } from "@/lib/request-security";

export const runtime = "nodejs";

function notFound() {
  return NextResponse.json(
    { error: "Not found." },
    { status: 404, headers: privateJsonHeaders() },
  );
}

function invalidOrigin() {
  return NextResponse.json(
    { error: "Invalid request origin." },
    { status: 403, headers: privateJsonHeaders() },
  );
}

export async function POST(request: Request) {
  if (!isPremiumTestFixtureEnabled()) return notFound();
  if (!isSameOrigin(request)) return invalidOrigin();

  const response = NextResponse.json(
    { user: PREMIUM_TEST_FIXTURE_USER },
    { headers: privateJsonHeaders() },
  );
  setPremiumTestFixtureCookie(response);
  return response;
}

export async function DELETE(request: Request) {
  if (!isPremiumTestFixtureEnabled()) return notFound();
  if (!isSameOrigin(request)) return invalidOrigin();

  const response = NextResponse.json(
    { ok: true },
    { headers: privateJsonHeaders() },
  );
  clearPremiumTestFixtureCookie(response);
  return response;
}
