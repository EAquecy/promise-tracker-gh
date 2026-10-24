"use client";
import { useEffect, useState } from "react";
import type { FeatureCollection } from "geojson";

// Cached once per page load: district and region boundaries served from /public/geo.
let districtsP: Promise<FeatureCollection> | null = null;
let regionsP: Promise<FeatureCollection> | null = null;

export function useGhanaGeo() {
  const [districts, setDistricts] = useState<FeatureCollection | null>(null);
  const [regions, setRegions] = useState<FeatureCollection | null>(null);
  useEffect(() => {
    districtsP ??= fetch("/geo/districts.json").then((r) => r.json());
    regionsP ??= fetch("/geo/regions.json").then((r) => r.json());
    let live = true;
    districtsP.then((d) => live && setDistricts(d));
    regionsP.then((r) => live && setRegions(r));
    return () => {
      live = false;
    };
  }, []);
  return { districts, regions };
}

// Map background (the sea and neighbouring countries) when no tile service is used.
export const MAP_BG = "#DCE8EE";
