"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Marker,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LivePosition } from "@/types";

interface AirportPoint {
  code: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
}

interface Props {
  origin: AirportPoint;
  destination: AirportPoint;
  waypoints: AirportPoint[];
  polyline: { lat: number; lng: number }[];
  position: LivePosition;
  height?: number;
}

function planeIcon(bearing: number, color = "#22D3EE") {
  const html = `
    <div class="plane-marker" style="transform: rotate(${bearing}deg);">
      <svg viewBox="0 0 24 24" width="32" height="32">
        <path fill="${color}" d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V18l-2 1.5V21l3.5-1L15 21v-1.5L13 18v-4.5L21 16z"/>
      </svg>
    </div>`;
  return L.divIcon({
    className: "plane-icon",
    html,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function airportIcon(highlight = false) {
  const color = highlight ? "#F97316" : "#22D3EE";
  const html = `
    <div style="display:flex;align-items:center;justify-content:center;">
      <svg viewBox="0 0 24 24" width="20" height="20" style="filter: drop-shadow(0 0 4px ${color});">
        <circle cx="12" cy="12" r="5" fill="${color}" opacity="0.25"/>
        <circle cx="12" cy="12" r="2.6" fill="${color}"/>
      </svg>
    </div>`;
  return L.divIcon({
    className: "airport-icon",
    html,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function FitOnce({ points }: { points: [number, number][] }) {
  const map = useMap();
  const didFit = useRef(false);
  useEffect(() => {
    if (didFit.current || points.length === 0) return;
    const bounds = L.latLngBounds(points.map((p) => L.latLng(p[0], p[1])));
    map.fitBounds(bounds, { padding: [40, 40], animate: false });
    didFit.current = true;
  }, [map, points]);
  return null;
}

/** Split great-circle polyline at antimeridian crossings so Leaflet doesn't draw straight across. */
function splitOnAntimeridian(pts: { lat: number; lng: number }[]) {
  const segments: [number, number][][] = [];
  let cur: [number, number][] = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (cur.length === 0) {
      cur.push([p.lat, p.lng]);
      continue;
    }
    const prev = cur[cur.length - 1];
    const dLng = p.lng - prev[1];
    if (Math.abs(dLng) > 180) {
      // wrap detected
      segments.push(cur);
      cur = [[p.lat, p.lng]];
    } else {
      cur.push([p.lat, p.lng]);
    }
  }
  if (cur.length) segments.push(cur);
  return segments;
}

export default function FlightMap({
  origin,
  destination,
  waypoints,
  polyline,
  position,
  height = 480,
}: Props) {
  const segs = useMemo(() => splitOnAntimeridian(polyline), [polyline]);
  const fitPoints = useMemo<[number, number][]>(
    () => polyline.map((p) => [p.lat, p.lng] as [number, number]),
    [polyline],
  );

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-line bg-bg-1"
      style={{ height }}
    >
      <MapContainer
        center={[origin.lat, origin.lng]}
        zoom={3}
        scrollWheelZoom={true}
        attributionControl={false}
        worldCopyJump
        className="h-full w-full"
      >
        <TileLayer
          url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}{r}.png"
          subdomains={["a", "b", "c", "d"]}
          maxZoom={19}
        />
        {segs.map((seg, i) => (
          <Polyline
            key={`bg-${i}`}
            positions={seg}
            pathOptions={{
              color: "#22D3EE",
              weight: 1.5,
              opacity: 0.35,
              dashArray: "4 6",
            }}
          />
        ))}
        {segs.map((seg, i) => (
          <Polyline
            key={`fg-${i}`}
            positions={seg}
            pathOptions={{ color: "#22D3EE", weight: 0.6, opacity: 0.9 }}
          />
        ))}

        <Marker position={[origin.lat, origin.lng]} icon={airportIcon()}>
          <Tooltip direction="top" offset={[0, -6]} opacity={1}>
            <strong>{origin.code}</strong> · {origin.city}
          </Tooltip>
        </Marker>
        {waypoints.map((w) => (
          <Marker
            key={`wp-${w.code}`}
            position={[w.lat, w.lng]}
            icon={airportIcon()}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={1}>
              Waypoint · <strong>{w.code}</strong> · {w.city}
            </Tooltip>
          </Marker>
        ))}
        <Marker
          position={[destination.lat, destination.lng]}
          icon={airportIcon(true)}
        >
          <Tooltip direction="top" offset={[0, -6]} opacity={1}>
            <strong>{destination.code}</strong> · {destination.city}
          </Tooltip>
        </Marker>

        {/* Live aircraft */}
        {position.state !== "scheduled" &&
        position.state !== "boarding" &&
        position.state !== "delivered" ? (
          <>
            <CircleMarker
              center={[position.lat, position.lng]}
              radius={position.state === "emergency" ? 22 : 14}
              pathOptions={{
                color: position.state === "emergency" ? "#FF5252" : "#22D3EE",
                fillColor:
                  position.state === "emergency" ? "#FF5252" : "#22D3EE",
                fillOpacity: position.state === "emergency" ? 0.18 : 0.1,
                weight: 1.4,
                className:
                  position.state === "emergency" ? "animate-pulse" : undefined,
              }}
            />
            <Marker
              position={[position.lat, position.lng]}
              icon={planeIcon(
                position.bearing,
                position.state === "emergency" ? "#FF5252" : "#22D3EE",
              )}
              zIndexOffset={500}
            >
              <Tooltip
                direction="top"
                offset={[0, -14]}
                opacity={1}
                permanent={false}
              >
                <div className="font-mono text-[11px] leading-tight">
                  <div>
                    <strong>{Math.round(position.groundSpeedKmh)}</strong> km/h
                  </div>
                  <div>
                    <strong>
                      {Math.round((position.altitudeM / 0.3048) / 100) * 100}
                    </strong>{" "}
                    ft
                  </div>
                  {position.state === "emergency" ? (
                    <div className="mt-1 text-[#FF5252]">EMERGENCY HOLD</div>
                  ) : null}
                </div>
              </Tooltip>
            </Marker>
          </>
        ) : null}
        <FitOnce points={fitPoints} />
      </MapContainer>
      <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-bg-0/70 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-cyan-400 backdrop-blur-md ring-1 ring-cyan-500/30">
        Tactical view · 2D
      </div>
      {position.state === "emergency" ? (
        <div className="pointer-events-none absolute right-3 top-3 rounded-md bg-bg-0/80 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-signal-red backdrop-blur-md ring-1 ring-signal-red/40">
          • Emergency hold
        </div>
      ) : null}
    </div>
  );
}
