"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { keptTier } from "@/lib/format";

type Props = {
  stats: Record<string, number | null>;
  selected: string | null;
  onSelect: (name: string) => void;
  height?: number;
};

function FlyTo({ layer }: { layer: L.Layer | null }) {
  const map = useMap();
  useEffect(() => {
    if (layer && "getBounds" in layer) {
      const b = (layer as L.Polygon).getBounds();
      if (b.isValid()) map.flyToBounds(b, { maxZoom: 10, duration: 0.6, padding: [40, 40] });
    }
  }, [layer, map]);
  return null;
}

export default function ExploreMapInner({ stats, selected, onSelect, height = 620 }: Props) {
  const [districts, setDistricts] = useState<FeatureCollection | null>(null);
  const [regions, setRegions] = useState<FeatureCollection | null>(null);
  const layers = useRef<Record<string, L.Layer>>({});
  const [selLayer, setSelLayer] = useState<L.Layer | null>(null);

  useEffect(() => {
    fetch("/geo/districts.json").then((r) => r.json()).then(setDistricts);
    fetch("/geo/regions.json").then((r) => r.json()).then(setRegions);
  }, []);

  useEffect(() => {
    Object.entries(layers.current).forEach(([name, layer]) => {
      const isSel = name === selected;
      (layer as L.Path).setStyle({
        weight: isSel ? 3.5 : 0.6,
        color: isSel ? "#13201A" : "#ffffff",
        fillColor: isSel ? "#FCD116" : keptTier(stats[name]),
        fillOpacity: isSel ? 0.95 : 0.8,
      });
      if (isSel) (layer as L.Path).bringToFront();
    });
    setSelLayer(selected ? layers.current[selected] ?? null : null);
  }, [selected, stats, districts]);

  const style = useMemo(
    () => (f?: Feature<Geometry, { name: string }>) => ({
      weight: 0.6,
      color: "#ffffff",
      fillColor: keptTier(f ? stats[f.properties.name] : null),
      fillOpacity: 0.8,
    }),
    [stats]
  );

  return (
    <MapContainer center={[7.95, -1.03]} zoom={7} minZoom={6} scrollWheelZoom style={{ height, width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · Boundaries: geoBoundaries'
        url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
      />
      {districts ? (
        <GeoJSON
          data={districts}
          style={style as L.StyleFunction}
          onEachFeature={(f, layer) => {
            const name = (f.properties as { name: string }).name;
            layers.current[name] = layer;
            const pct = stats[name];
            layer.bindTooltip(`${name}${pct != null ? ` · ${pct}% kept` : ""}`, { sticky: true });
            layer.on("click", () => onSelect(name));
          }}
        />
      ) : null}
      {regions ? (
        <GeoJSON data={regions} interactive={false} style={{ color: "#13201A", weight: 1.4, opacity: 0.6, fillOpacity: 0 }} />
      ) : null}
      <FlyTo layer={selLayer} />
    </MapContainer>
  );
}
