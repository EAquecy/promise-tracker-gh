"use client";

export type Fix = { lat: number; lng: number };

export class LocationError extends Error {
  constructor(public kind: "unsupported" | "denied" | "unavailable") {
    super(kind);
  }
}

// Ask the device for its position. Coordinates are sent to our server only to look up the district; they are never stored.
export function getFix(): Promise<Fix> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return reject(new LocationError("unsupported"));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => reject(new LocationError(e.code === e.PERMISSION_DENIED ? "denied" : "unavailable")),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 5 * 60 * 1000 }
    );
  });
}

export function locationMessage(err: unknown) {
  if (err instanceof LocationError) {
    if (err.kind === "denied") return "Turn on location for this site to confirm, dispute or comment. We only keep your district, never your exact position.";
    if (err.kind === "unsupported") return "This browser can't share location, so you can't confirm, dispute or comment from it.";
    return "We couldn't get your location. Check that location is on and try again.";
  }
  const msg = (err as { message?: string })?.message ?? "";
  if (msg.includes("outside Ghana")) return "Your location is outside Ghana's districts, so you can read but not confirm, dispute or comment.";
  if (msg.includes("location required")) return "Location is required to confirm, dispute or comment.";
  return "Something went wrong. Please try again.";
}
