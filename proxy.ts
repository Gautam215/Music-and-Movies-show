import { NextRequest, NextResponse } from "next/server";
import { consumeApiRateLimit, rateLimitHeaders } from "@/lib/rate-limit";

export default async function proxy(request: NextRequest) {
  const result = await consumeApiRateLimit(request);
  const headers = rateLimitHeaders(result);

  if (!result.allowed) {
    const status = result.status ?? 429;
    return NextResponse.json(
      {
        error: status === 503
          ? "The API is temporarily unavailable. Please try again."
          : "Too many requests. Please try again later.",
        retryAfterSeconds: result.retryAfterSec,
      },
      { status, headers },
    );
  }

  const response = NextResponse.next();
  Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
