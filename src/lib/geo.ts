// Parosa — "Use current location": phone GPS → an Indian postal address.
// Reverse geocoding uses OpenStreetMap's free Nominatim service (no API key).

export type PinnedAddress = {
  latitude: number;
  longitude: number;
  address: string;  // shop / street / locality line
  area: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
};

/** Human-friendly message for why the GPS point couldn't be read. */
export function geoMessage(err: unknown): string {
  const code = (err as GeolocationPositionError)?.code;
  if (code === 1) return "Location permission is off. Allow location for this site in your browser, or type the address below.";
  if (code === 2) return "Couldn't get a GPS fix. Step outside or near a window and try again, or type the address below.";
  if (code === 3) return "Finding your location took too long. Try again, or type the address below.";
  if ((err as Error)?.message === "unsupported") return "This browser can't share location. Type the address below.";
  return "Couldn't look up the address for this spot. Please type it below.";
}

function currentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) { reject(new Error("unsupported")); return; }
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
  });
}

type NominatimAddress = Partial<Record<
  "house_number" | "house_name" | "building" | "shop" | "amenity" | "road" | "neighbourhood" | "residential" | "quarter"
  | "suburb" | "hamlet" | "village" | "town" | "city" | "city_district" | "county" | "state_district" | "state" | "postcode",
  string
>>;

/** Read the GPS point and turn it into address parts. Throws on failure — show `geoMessage(err)`. */
export async function pinCurrentAddress(): Promise<PinnedAddress> {
  const pos = await currentPosition();
  const latitude = +pos.coords.latitude.toFixed(6);
  const longitude = +pos.coords.longitude.toFixed(6);

  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&accept-language=en&lat=${latitude}&lon=${longitude}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("geocode");
  const a: NominatimAddress = (await res.json()).address ?? {};

  const area = a.suburb || a.neighbourhood || a.residential || a.quarter || a.hamlet || a.village || "";
  const city = a.city || a.town || a.village || a.county || "";
  const district = (a.state_district || a.county || a.city_district || city).replace(/\s+district$/i, "");
  const houseNo = a.house_number?.replace(/\s*;\s*/g, "/"); // OSM lists several as "963;964"
  const line = [houseNo || a.house_name || a.building || a.shop || a.amenity, a.road, a.neighbourhood, area]
    .filter((p, i, all): p is string => !!p && all.indexOf(p) === i); // drop blanks and repeats

  return {
    latitude, longitude,
    address: line.join(", "),
    area, city, district,
    state: a.state || "",
    pincode: (a.postcode || "").replace(/\s/g, ""),
  };
}
