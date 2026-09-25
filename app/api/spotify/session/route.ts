import { NextResponse } from "next/server";
import { refreshSpotifyToken } from "@/lib/spotify-auth";
import {
  clearSpotifyTokenCookies,
  getSpotifyServerToken,
  persistSpotifyToken,
  spotifyPrivateHeaders,
} from "@/lib/spotify-server";

type SpotifyProfile = {
  display_name?: string;
  product?: string;
};

export async function GET() {
  let { accessToken, refreshToken, refreshedToken } = await getSpotifyServerToken();

  if (!accessToken) {
    const response = NextResponse.json(
      { connected: false },
      { headers: spotifyPrivateHeaders() },
    );
    return clearSpotifyTokenCookies(response);
  }

  let profileResponse = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (profileResponse.status === 401 && refreshToken) {
    refreshedToken = await refreshSpotifyToken(refreshToken);
    accessToken = refreshedToken?.access_token;
    if (accessToken) {
      profileResponse = await fetch("https://api.spotify.com/v1/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
    }
  }

  if (!profileResponse.ok) {
    const response = NextResponse.json(
      { connected: false },
      { headers: spotifyPrivateHeaders() },
    );
    if (profileResponse.status === 401) {
      return clearSpotifyTokenCookies(response);
    }
    return persistSpotifyToken(response, refreshedToken);
  }

  const profile = (await profileResponse.json()) as SpotifyProfile;
  const response = NextResponse.json({
    connected: true,
    displayName: profile.display_name ?? "Spotify listener",
    product: profile.product ?? null,
  }, { headers: spotifyPrivateHeaders() });

  return persistSpotifyToken(response, refreshedToken);
}
