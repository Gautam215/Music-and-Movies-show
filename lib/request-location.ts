export function getRequestLocation(requestHeaders: Headers) {
  const rawCity = requestHeaders.get("x-vercel-ip-city") || requestHeaders.get("x-forwarded-city");
  let city = "";
  if (rawCity?.trim()) {
    try {
      city = decodeURIComponent(rawCity).replace(/\+/g, " ").trim();
    } catch {
      city = rawCity.trim();
    }
  }
  if (city) return city;

  const country = requestHeaders.get("x-vercel-ip-country") || requestHeaders.get("cf-ipcountry");
  return country?.trim().toUpperCase() || null;
}
