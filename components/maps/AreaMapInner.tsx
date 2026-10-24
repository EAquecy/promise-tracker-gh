"use client";
import { useEffect } from "react";
import { MapContainer, GeoJSON, CircleMarker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import type { GeoJsonObject } from "geojson";
import { MAP_BG, useGhanaGeo } from "./useGhanaGeo";

export interface MapMarker {
  lat: number;
  lng: number;
  color: string;
  label?: string;
}

function Fit({ geo, markers }: { geo?: GeoJsonObject | null; markers: MapMarker[] }) {
  const map = useMap();
  useEffect(() => {
    let b: L.LatLngBounds | null = null;
    if (geo) b = L.geoJSON(geo).getBounds();
    markers.forEach((m) => {
      const ll = L.latLng(m.lat, m.lng);
      b = b ? b.extend(ll) : L.latLngBounds(ll, ll);
    });
    if (b && b.isValid()) map.fitBounds(b, { padding: [28, 28], maxZoom: 12 });
  }, [geo, markers, map]);
  return null;
}

// Neighbouring districts in light grey give context; the area itself in Ghana green.
export default function AreaMapInner({
  geo,
  markers = [],
  height = 280,
  color = "#006B3F",
}: {
  geo?: GeoJsonObject | null;
  markers?: MapMarker[];
  height?: number;
  color?: string;
}) {
  const { districts, regions } = useGhanaGeo();
  return (
    <MapContainer
      center={[7.95, -1.03]}
      zoom={6}
      minZoom={6}
      maxZoom={13}
      scrollWheelZoom={false}
      style={{ height, width: "100%", background: MAP_BG }}
      attributionControl
    >
      {districts ? (
        <GeoJSON
          data={districts}
          interactive={false}
          attribution="Boundaries: geoBoundaries (CC BY 4.0)"
          style={{ color: "#ffffff", weight: 1, fillColor: "#EEF2EF", fillOpacity: 1 }}
        />
      ) : null}
      {regions ? <GeoJSON data={regions} interactive={false} style={{ color: "#9AA39E", weight: 1.4, fillOpacity: 0 }} /> : null}
      {geo ? (
        <GeoJSON key={JSON.stringify(geo).length} data={geo} interactive={false} style={{ color, weight: 3, fillColor: color, fillOpacity: 0.18 }} />
      ) : null}
      {markers.map((m, i) => (
        <CircleMarker key={i} center={[m.lat, m.lng]} radius={8} pathOptions={{ color: "#fff", weight: 3, fillColor: m.color, fillOpacity: 1 }}>
          {m.label ? <Tooltip>{m.label}</Tooltip> : null}
        </CircleMarker>
      ))}
      <Fit geo={geo} markers={markers} />
    </MapContainer>
  );
}
