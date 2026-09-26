import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";
import { getNotificationGroups } from "@/lib/notification-recommendations";
import { headers } from "next/headers";
import { privateJsonHeaders } from "@/lib/request-security";

export const runtime = "nodejs";

export async function GET() {
  try {
    const requestHeaders = await headers();
    const country = requestHeaders.get("x-vercel-ip-country") || requestHeaders.get("cf-ipcountry");
    const region = country && /^[A-Za-z]{2}$/.test(country) ? country.toUpperCase() : undefined;
    const user = await getCurrentUser();
    const groups = await getNotificationGroups({ userId: user?.id, name: user?.name, region });
    return NextResponse.json({ personalized: Boolean(user), groups }, { headers: privateJsonHeaders() });
  } catch (error) {
    console.error("Notification feed failed", error);
    return NextResponse.json({ error: "Notifications are unavailable right now." }, { status: 500, headers: privateJsonHeaders() });
  }
}
