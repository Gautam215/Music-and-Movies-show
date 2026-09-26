import { NextResponse } from "next/server";
import {
  clearSpotifyTokenCookies,
  getSpotifyServerToken,
  persistSpotifyToken,
  spotifyApiFetch,
  spotifyPrivateHeaders,
} from "@/lib/spotify-server";

type SpotifyProfile = {
  display_name?: string;
  product?: string;
};

export async function GET() {
  const tokenState = await getSpotifyServerToken();

  if (!tokenState.accessToken) {
    const response = NextResponse.json(
      { connected: false },
      { headers: spotifyPrivateHeaders() },
    );
    return clearSpotifyTokenCookies(response);
  }

  const profileResponse = await spotifyApiFetch(tokenState, "https://api.spotify.com/v1/me", {
    cache: "no-store",
  });

  if (!profileResponse.ok) {
    const response = NextResponse.json(
      { connected: false },
      { headers: spotifyPrivateHeaders() },
    );
    if (profileResponse.status === 401) {
      return clearSpotifyTokenCookies(response);
    }
    return persistSpotifyToken(response, tokenState.refreshedToken);
  }

  const profile = (await profileResponse.json()) as SpotifyProfile;
  const response = NextResponse.json({
    connected: true,
    displayName: profile.display_name ?? "Spotify listener",
    product: profile.product ?? null,
  }, { headers: spotifyPrivateHeaders() });

  return persistSpotifyToken(response, tokenState.refreshedToken);
}
