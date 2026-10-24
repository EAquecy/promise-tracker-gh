"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import type { Feature, Geometry } from "geojson";
import { keptTier } from "@/lib/format";
import { MAP_BG, useGhanaGeo } from "./useGhanaGeo";

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
  const { districts, regions } = useGhanaGeo();
  const layers = useRef<Record<string, L.Layer>>({});
  const [selLayer, setSelLayer] = useState<L.Layer | null>(null);

  useEffect(() => {
    Object.entries(layers.current).forEach(([name, layer]) => {
      const isSel = name === selected;
      (layer as L.Path).setStyle({
        weight: isSel ? 3.5 : 0.7,
        color: isSel ? "#13201A" : "#ffffff",
        fillColor: isSel ? "#FCD116" : keptTier(stats[name]),
        fillOpacity: 1,
      });
      if (isSel) (layer as L.Path).bringToFront();
    });
    setSelLayer(selected ? layers.current[selected] ?? null : null);
  }, [selected, stats, districts]);

  const style = useMemo(
    () => (f?: Feature<Geometry, { name: string }>) => ({
      weight: 0.7,
      color: "#ffffff",
      fillColor: keptTier(f ? stats[f.properties.name] : null),
      fillOpacity: 1,
    }),
    [stats]
  );

  return (
    <MapContainer
      center={[7.95, -1.03]}
      zoom={7}
      minZoom={6}
      maxZoom={12}
      maxBounds={[[3.5, -4.5], [12, 2.5]]}
      scrollWheelZoom
      style={{ height, width: "100%", background: MAP_BG }}
      attributionControl
    >
      {districts ? (
        <GeoJSON
          data={districts}
          style={style as L.StyleFunction}
          attribution="Boundaries: geoBoundaries (CC BY 4.0)"
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
