/**
 * Free weather for the jobsite — Open-Meteo (no API key, no paid plan).
 * Guidance only; not a safety system of record.
 */

export interface JobsiteWeather {
  label: string;
  tempF: number;
  windMph: number;
  precipProb: number;
  code: number;
  summary: string;
  fetchedAt: string;
}

function weatherCodeSummary(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow / ice";
  if (code <= 82) return "Showers";
  if (code <= 86) return "Snow showers";
  if (code >= 95) return "Thunderstorm";
  return "Mixed conditions";
}

/** Geocode a free-text US city/state via Open-Meteo geocoding. */
export async function fetchJobsiteWeather(
  cityState: string,
): Promise<JobsiteWeather | null> {
  const q = cityState.trim();
  if (!q) return null;
  try {
    const geoUrl =
      "https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name=" +
      encodeURIComponent(q);
    const geoRes = await fetch(geoUrl);
    if (!geoRes.ok) return null;
    const geo = (await geoRes.json()) as {
      results?: { name: string; admin1?: string; latitude: number; longitude: number }[];
    };
    const hit = geo.results?.[0];
    if (!hit) return null;

    const wxUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${hit.latitude}&longitude=${hit.longitude}` +
      "&current=temperature_2m,precipitation_probability,weather_code,wind_speed_10m" +
      "&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto";
    const wxRes = await fetch(wxUrl);
    if (!wxRes.ok) return null;
    const wx = (await wxRes.json()) as {
      current?: {
        temperature_2m?: number;
        precipitation_probability?: number;
        weather_code?: number;
        wind_speed_10m?: number;
      };
    };
    const c = wx.current;
    if (!c || c.temperature_2m == null) return null;
    const code = c.weather_code ?? 0;
    return {
      label: [hit.name, hit.admin1].filter(Boolean).join(", "),
      tempF: Math.round(c.temperature_2m),
      windMph: Math.round(c.wind_speed_10m ?? 0),
      precipProb: Math.round(c.precipitation_probability ?? 0),
      code,
      summary: weatherCodeSummary(code),
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
