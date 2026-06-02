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

// Clean top-down aviation silhouette
function planeIcon(bearing: number, emergency: boolean) {
  const color = emergency ? "#FF5252" : "#EF4444";
  const fill = emergency ? "#FFE6E6" : "#FEE2E2";
  const html = `
    <span class="pulse ${emergency ? "emergency" : ""}"></span>
    <span class="pulse pulse-2 ${emergency ? "emergency" : ""}"></span>
    <div class="body ${emergency ? "emergency" : ""}" style="transform: rotate(${bearing}deg);">
      <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
        <path
          d="M16 1.6 L17.5 12 L29.6 18.4 L29.6 21 L17.5 17.4 L17.5 24.6 L21.4 27.2 L21.4 29.4 L16 27.7 L10.6 29.4 L10.6 27.2 L14.5 24.6 L14.5 17.4 L2.4 21 L2.4 18.4 L14.5 12 Z"
          fill="${fill}"
          stroke="${color}"
          stroke-width="1.1"
          stroke-linejoin="round"
        />
      </svg>
    </div>`;
  return L.divIcon({
    className: "plane-icon",
    html,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

type AirportKind = "origin" | "waypoint" | "destination";
function airportIcon(kind: AirportKind, pulsing = false) {
  // origin = red, destination = green, waypoint = neutral
  const color =
    kind === "destination" ? "#22C55E" : kind === "origin" ? "#EF4444" : "#8A9AB3";
  const inner = kind === "waypoint" ? 2.2 : 3.4;
  const outerHalo = kind === "waypoint" ? 6 : 9;
  const html = `
    <div style="position:relative;width:22px;height:22px;color:${color};">
      ${pulsing ? `<span class="ring"></span>` : ""}
      <svg viewBox="0 0 22 22" width="22" height="22" style="filter: drop-shadow(0 0 6px ${color}80);">
        <circle cx="11" cy="11" r="${outerHalo}" fill="${color}" opacity="0.18"/>
        <circle cx="11" cy="11" r="${inner + 1.4}" fill="${color}" opacity="0.35"/>
        <circle cx="11" cy="11" r="${inner}" fill="${color}"/>
      </svg>
    </div>`;
  return L.divIcon({
    className: "airport-icon",
    html,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function FitOnce({ points }: { points: [number, number][] }) {
  const map = useMap();
  const didFit = useRef(false);
  useEffect(() => {
    if (didFit.current || points.length === 0) return;
    const bounds = L.latLngBounds(points.map((p) => L.latLng(p[0], p[1])));
    map.fitBounds(bounds, { padding: [48, 48], animate: false });
    didFit.current = true;
  }, [map, points]);
  return null;
}

/** Split great-circle polyline at antimeridian crossings so Leaflet doesn't draw straight across. */
function splitOnAntimeridian(pts: { lat: number; lng: number }[]) {
  const segments: [number, number][][] = [];
  if (pts.length === 0) return segments;
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
  const isEmergency = position.state === "emergency";
  const inFlight =
    position.state !== "scheduled" &&
    position.state !== "boarding" &&
    position.state !== "delivered";
  const palette = useMemo(
    () =>
      isEmergency
        ? { line: "#FF5252", glow: "#FF5252", soft: "#FF8A8A" }
        : { line: "#EF4444", glow: "#EF4444", soft: "#FCA5A5" }, // Red for flown distance
    [isEmergency],
  );

  // Split polyline by progress: flown (red + glow) vs remaining (green dashed)
  const { flownSegs, remainingSegs, fitPoints } = useMemo(() => {
    const N = polyline.length;
    const cutRaw =
      position.state === "delivered" ? N : Math.round((position.progress ?? 0) * N);
    const cut = Math.max(0, Math.min(N, cutRaw));
    const flown = polyline.slice(0, cut);
    // include the cut-1 point so the two segments visually touch
    const remaining =
      cut > 0 ? polyline.slice(cut - 1) : polyline.slice(0);
    const fit = polyline.map((p) => [p.lat, p.lng] as [number, number]);
    return {
      flownSegs: splitOnAntimeridian(flown),
      remainingSegs: splitOnAntimeridian(remaining),
      fitPoints: fit,
    };
  }, [polyline, position.progress, position.state]);

  // Show destination pulse only while flight is active / scheduled / delivering
  const destinationPulsing = position.state !== "delivered";

  return (
    <div
      className="hud-reticle relative overflow-hidden rounded-xl border border-line bg-bg-1"
      style={{ height }}
    >
      <span className="hud-reticle-tr" aria-hidden />
      <span className="hud-reticle-bl" aria-hidden />

      <MapContainer
        center={[origin.lat, origin.lng]}
        zoom={3}
        scrollWheelZoom={true}
        attributionControl={false}
        worldCopyJump
        className="h-full w-full"
      >
        <TileLayer
          url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_nolabels/{z}/{x}/{y}{r}.png"
          subdomains={["a", "b", "c", "d"]}
          maxZoom={19}
        />
        <TileLayer
          url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_only_labels/{z}/{x}/{y}{r}.png"
          subdomains={["a", "b", "c", "d"]}
          maxZoom={19}
          opacity={0.7}
        />

        {/* Remaining route — green dashed guide line */}
        {remainingSegs.map((seg, i) => (
          <Polyline
            key={`rem-${i}`}
            positions={seg}
            pathOptions={{
              color: "#22C55E", // Green for remaining distance
              weight: 1.6,
              opacity: 0.45,
              dashArray: "4 8",
              lineCap: "round",
            }}
          />
        ))}

        {/* Flown route — red glow + crisp top stroke */}
        {flownSegs.map((seg, i) => (
          <Polyline
            key={`fg-glow-${i}`}
            positions={seg}
            pathOptions={{
              color: palette.glow,
              weight: 8,
              opacity: 0.18,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        ))}
        {flownSegs.map((seg, i) => (
          <Polyline
            key={`fg-mid-${i}`}
            positions={seg}
            pathOptions={{
              color: palette.glow,
              weight: 3.4,
              opacity: 0.45,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        ))}
        {flownSegs.map((seg, i) => (
          <Polyline
            key={`fg-top-${i}`}
            positions={seg}
            pathOptions={{
              color: "#FEE2E2",
              weight: 1.6,
              opacity: 0.95,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        ))}

        <Marker position={[origin.lat, origin.lng]} icon={airportIcon("origin")}>
          <Tooltip direction="top" offset={[0, -10]} opacity={1}>
            <strong>{origin.code}</strong> · {origin.city}
          </Tooltip>
        </Marker>
        {waypoints.map((w) => (
          <Marker
            key={`wp-${w.code}`}
            position={[w.lat, w.lng]}
            icon={airportIcon("waypoint")}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={1}>
              Waypoint · <strong>{w.code}</strong> · {w.city}
            </Tooltip>
          </Marker>
        ))}
        <Marker
          position={[destination.lat, destination.lng]}
          icon={airportIcon("destination", destinationPulsing)}
        >
          <Tooltip direction="top" offset={[0, -10]} opacity={1}>
            <strong>{destination.code}</strong> · {destination.city}
          </Tooltip>
        </Marker>

        {/* Live aircraft */}
        {inFlight ? (
          <>
            {/* faint range halo */}
            <CircleMarker
              center={[position.lat, position.lng]}
              radius={32}
              pathOptions={{
                color: palette.line,
                weight: 1,
                opacity: 0.25,
                fillColor: palette.line,
                fillOpacity: 0.04,
              }}
            />
            <Marker
              position={[position.lat, position.lng]}
              icon={planeIcon(position.bearing, isEmergency)}
              zIndexOffset={500}
            >
              <Tooltip
                direction="top"
                offset={[0, -16]}
                opacity={1}
                permanent={false}
              >
                <div className="leading-tight">
                  <div>
                    <strong>{Math.round(position.groundSpeedKmh)}</strong> km/h
                  </div>
                  <div>
                    <strong>
                      {Math.round(position.altitudeM / 0.3048 / 100) * 100}
                    </strong>{" "}
                    ft
                  </div>
                  {isEmergency ? (
                    <div className="mt-1 text-[#FF5252]">EMERGENCY HOLD</div>
                  ) : null}
                </div>
              </Tooltip>
            </Marker>
          </>
        ) : null}

        <FitOnce points={fitPoints} />
      </MapContainer>

      {/* HUD overlays */}
      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-md border border-cyan-500/30 bg-bg-0/75 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.25em]">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.9)]" />
        Tactical · 2D
      </div>

      {inFlight ? (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-line bg-bg-0/80 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-1 backdrop-blur-md">
          <span className="text-ink-3">Pos </span>
          <span className="text-ink-0">
            {position.lat.toFixed(2)}°, {position.lng.toFixed(2)}°
          </span>
          <span className="mx-2 text-ink-3">·</span>
          <span className="text-ink-3">Hdg </span>
          <span className="text-ink-0">
            {Math.round(position.bearing).toString().padStart(3, "0")}°
          </span>
          <span className="mx-2 text-ink-3">·</span>
          <span className="text-ink-3">Trk </span>
          <span className="text-ink-0">
            {Math.round((position.progress ?? 0) * 100)}%
          </span>
        </div>
      ) : null}

      {isEmergency ? (
        <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-1.5 rounded-md border border-signal-red/40 bg-bg-0/85 px-2 py-1 font-mono text-[10px] uppercase tracking-wider">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-signal-red shadow-[0_0_6px_rgba(239,68,68,0.95)]" />
          Emergency hold
        </div>
      ) : null}
    </div>
  );
}