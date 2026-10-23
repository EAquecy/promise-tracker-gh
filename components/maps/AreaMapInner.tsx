"use client";
import { useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import type { GeoJsonObject } from "geojson";

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
    if (b && b.isValid()) map.fitBounds(b, { padding: [24, 24], maxZoom: 14 });
  }, [geo, markers, map]);
  return null;
}

export default function AreaMapInner({
  geo,
  outer,
  markers = [],
  height = 280,
  color = "#006B3F",
}: {
  geo?: GeoJsonObject | null;
  outer?: GeoJsonObject | null;
  markers?: MapMarker[];
  height?: number;
  color?: string;
}) {
  return (
    <MapContainer
      center={[7.95, -1.03]}
      zoom={6}
      scrollWheelZoom={false}
      style={{ height, width: "100%" }}
      attributionControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {outer ? <GeoJSON data={outer} style={{ color: "#5B6660", weight: 1.6, dashArray: "6 5", fillOpacity: 0 }} /> : null}
      {geo ? <GeoJSON key={JSON.stringify(geo).length} data={geo} style={{ color, weight: 3, fillColor: color, fillOpacity: 0.14 }} /> : null}
      {markers.map((m, i) => (
        <CircleMarker key={i} center={[m.lat, m.lng]} radius={8} pathOptions={{ color: "#fff", weight: 3, fillColor: m.color, fillOpacity: 1 }}>
          {m.label ? <Tooltip>{m.label}</Tooltip> : null}
        </CircleMarker>
      ))}
      <Fit geo={geo} markers={markers} />
    </MapContainer>
  );
}
