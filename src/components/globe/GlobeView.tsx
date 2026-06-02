"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { LivePosition } from "@/types";

const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

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
  position: LivePosition;
  height?: number;
}

const MAX_TRAIL_POINTS = 240;
const PLANE_ALT_MIN = 0.014; // minimum altitude (in globe radii) so the plane is visible above the surface
const PLANE_ALT_SCALE = 1 / 170_000; // metres -> globe units, tuned for visibility

/** Build a stylised cargo-jet mesh oriented forward along -Z, up along +Y. */
function buildPlaneMesh(emergency: boolean) {
  const group = new THREE.Group();
  const bodyColor = emergency ? 0xff7575 : 0xfee2e2;
  const accent = emergency ? 0xff3030 : 0xef4444;
  const matBody = new THREE.MeshStandardMaterial({
    color: bodyColor,
    metalness: 0.55,
    roughness: 0.32,
    emissive: emergency ? 0x7a0710 : 0x3f0f0f,
    emissiveIntensity: 0.85,
  });
  const matAccent = new THREE.MeshStandardMaterial({
    color: accent,
    metalness: 0.7,
    roughness: 0.25,
    emissive: accent,
    emissiveIntensity: 2.0,
  });
  // Fuselage (long axis along -Z)
  const fuselage = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.5, 6.6, 20),
    matBody,
  );
  fuselage.rotation.x = Math.PI / 2;
  group.add(fuselage);
  // Nose cone
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.4, 20), matBody);
  nose.rotation.x = -Math.PI / 2;
  nose.position.set(0, 0, -4.0);
  group.add(nose);
  // Wings (long axis along X)
  const wing = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.22, 1.7), matBody);
  wing.position.set(0, -0.05, 0.2);
  group.add(wing);
  // Glowing wing-tip lights
  const tipGeo = new THREE.BoxGeometry(0.55, 0.2, 1.3);
  const wingTipL = new THREE.Mesh(tipGeo, matAccent);
  wingTipL.position.set(-3.95, -0.05, 0.2);
  group.add(wingTipL);
  const wingTipR = wingTipL.clone();
  wingTipR.position.set(3.95, -0.05, 0.2);
  group.add(wingTipR);
  // Tail
  const tailWing = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 0.16, 1.0),
    matBody,
  );
  tailWing.position.set(0, 0.05, 2.8);
  group.add(tailWing);
  const tailFin = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 1.45, 1.1),
    matBody,
  );
  tailFin.position.set(0, 0.72, 2.75);
  group.add(tailFin);
  // Engines (glowing nacelles)
  const engineGeo = new THREE.CylinderGeometry(0.32, 0.32, 1.35, 16);
  const engineL = new THREE.Mesh(engineGeo, matAccent);
  engineL.rotation.x = Math.PI / 2;
  engineL.position.set(-1.75, -0.35, 0.65);
  group.add(engineL);
  const engineR = engineL.clone();
  engineR.position.set(1.75, -0.35, 0.65);
  group.add(engineR);
  return group;
}

export default function GlobeView({
  origin,
  destination,
  waypoints,
  position,
  height = 480,
}: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);
  const planeMeshRef = useRef<THREE.Group | null>(null);
  const trailRef = useRef<{ lat: number; lng: number }[]>([]);

  const sequence = useMemo(
    () => [origin, ...waypoints, destination],
    [origin, waypoints, destination],
  );

  const arcs = useMemo(
    () =>
      sequence.slice(0, -1).map((a, i) => ({
        startLat: a.lat,
        startLng: a.lng,
        endLat: sequence[i + 1].lat,
        endLng: sequence[i + 1].lng,
        color: ["#EF4444", "#22C55E"], // Red to green gradient
      })),
    [sequence],
  );

  const points = useMemo(
    () => [
      {
        lat: origin.lat,
        lng: origin.lng,
        size: 0.6,
        color: "#EF4444", // Red for origin
        label: `${origin.code} · ${origin.city}`,
      },
      ...waypoints.map((w) => ({
        lat: w.lat,
        lng: w.lng,
        size: 0.5,
        color: "#A78BFA", // Purple for waypoints
        label: `${w.code} · ${w.city}`,
      })),
      {
        lat: destination.lat,
        lng: destination.lng,
        size: 0.7,
        color: "#22C55E", // Green for destination
        label: `${destination.code} · ${destination.city}`,
      },
    ],
    [origin, destination, waypoints],
  );

  const showPlane =
    position.state !== "scheduled" &&
    position.state !== "boarding" &&
    position.state !== "delivered";

  const isEmergency = position.state === "emergency";

  const planeData = showPlane
    ? [
        {
          lat: position.lat,
          lng: position.lng,
          altitude: Math.max(
            PLANE_ALT_MIN,
            position.altitudeM * PLANE_ALT_SCALE,
          ),
          bearing: position.bearing,
          emergency: isEmergency,
        },
      ]
    : [];

  // Trail data: append current position each render, decimate to MAX_TRAIL_POINTS
  const trailData = useMemo(() => {
    if (!showPlane) {
      trailRef.current = [];
      return [] as { coords: [number, number, number][] }[];
    }
    const arr = trailRef.current;
    const last = arr[arr.length - 1];
    if (!last || last.lat !== position.lat || last.lng !== position.lng) {
      arr.push({ lat: position.lat, lng: position.lng });
      if (arr.length > MAX_TRAIL_POINTS) arr.shift();
    }
    if (arr.length < 2) return [];
    return [
      {
        coords: arr.map(
          (p) => [p.lat, p.lng, PLANE_ALT_MIN * 0.6] as [number, number, number],
        ),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position.lat, position.lng, showPlane]);

  // Reset trail whenever the route itself changes
  useEffect(() => {
    trailRef.current = [];
  }, [origin.code, destination.code, waypoints.map((w) => w.code).join(",")]);

  // First-frame camera + controls + scene tuning
  useEffect(() => {
    if (!globeRef.current) return;
    const controls = globeRef.current.controls?.();
    if (controls) {
      controls.autoRotate = false;
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 180;
      controls.maxDistance = 700;
    }
    // Brighter, slightly warm-tinted scene lighting for a cleaner Earth look
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scene: any = globeRef.current.scene?.();
    if (scene && !scene.userData.atgLitTuned) {
      scene.traverse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (obj: any) => {
          if (obj.isAmbientLight) {
            obj.intensity = 0.55;
            obj.color = new THREE.Color(0xa6c8ff);
          }
          if (obj.isDirectionalLight) {
            obj.intensity = 1.25;
            obj.color = new THREE.Color(0xffe6c4);
          }
        },
      );
      // Subtle cyan rim light
      const rim = new THREE.DirectionalLight(0x22d3ee, 0.35);
      rim.position.set(-1, -0.4, 1).normalize();
      scene.add(rim);
      scene.userData.atgLitTuned = true;
    }
    const midLat = (origin.lat + destination.lat) / 2;
    const midLng = (origin.lng + destination.lng) / 2;
    globeRef.current.pointOfView(
      { lat: midLat, lng: midLng, altitude: 2.4 },
      1500,
    );
  }, [origin.code, destination.code, origin.lat, origin.lng, destination.lat, destination.lng]);

  // Gentle camera follow: only re-aim every ~5° of movement to avoid jitter.
  const followKey =
    Math.round(position.lat / 5) + ":" + Math.round(position.lng / 5);
  useEffect(() => {
    if (!globeRef.current || !showPlane) return;
    globeRef.current.pointOfView(
      { lat: position.lat, lng: position.lng, altitude: 2.0 },
      1800,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followKey, showPlane]);

  return (
    <div
      className="hud-reticle relative overflow-hidden rounded-xl border border-line bg-bg-1"
      style={{ height }}
    >
      <Globe
        ref={globeRef}
        width={undefined}
        height={height}
        backgroundColor="rgba(3,6,11,1)"
        backgroundImageUrl="https://unpkg.com/three-globe@2.31.1/example/img/night-sky.png"
        globeImageUrl="https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg"
        bumpImageUrl="https://unpkg.com/three-globe@2.31.1/example/img/earth-topology.png"
        showAtmosphere
        atmosphereColor={isEmergency ? "#FF5252" : "#22D3EE"}
        atmosphereAltitude={0.22}
        arcsData={arcs}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        arcColor={(d: any) => d.color}
        arcAltitudeAutoScale={0.5}
        arcStroke={0.9}
        arcDashLength={0.45}
        arcDashGap={0.18}
        arcDashAnimateTime={2600}
        pointsData={points}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pointLat={(d: any) => d.lat}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pointLng={(d: any) => d.lng}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pointColor={(d: any) => d.color}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pointAltitude={(d: any) => d.size * 0.02}
        pointRadius={0.45}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pointLabel={(d: any) => d.label}
        // Trail
        pathsData={trailData}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pathPoints={(d: any) => d.coords}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pathPointLat={(p: any) => p[0]}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pathPointLng={(p: any) => p[1]}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pathPointAlt={(p: any) => p[2]}
        pathColor={() =>
          isEmergency
            ? ["rgba(255, 90, 90, 0.05)", "rgba(255, 90, 90, 0.95)"]
            : ["rgba(239, 68, 68, 0.05)", "rgba(239, 68, 68, 0.95)"]
        }
        pathStroke={1.1}
        pathTransitionDuration={0}
        // Pulsing ring at plane location
        ringsData={planeData}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ringLat={(d: any) => d.lat}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ringLng={(d: any) => d.lng}
        ringColor={() =>
          isEmergency
            ? (t: number) => `rgba(255, 82, 82, ${1 - t})`
            : (t: number) => `rgba(239, 68, 68, ${0.85 * (1 - t)})`
        }
        ringMaxRadius={isEmergency ? 6 : 4.5}
        ringPropagationSpeed={isEmergency ? 5 : 3.5}
        ringRepeatPeriod={isEmergency ? 750 : 1500}
        // Aircraft mesh — driven through the customLayer API so we can
        // update both position AND bearing rotation every tick.
        customLayerData={planeData}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        customThreeObject={(d: any) => {
          const mesh = buildPlaneMesh(d.emergency);
          mesh.scale.setScalar(0.65);
          planeMeshRef.current = mesh;
          return mesh;
        }}
        customThreeObjectUpdate={({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          obj,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          d,
        }: any) => {
          if (!globeRef.current) return;
          const xyz = globeRef.current.getCoords(d.lat, d.lng, d.altitude);
          const position = new THREE.Vector3(xyz.x, xyz.y, xyz.z);
          obj.position.copy(position);
          // Build a local frame on the globe surface and orient the plane
          const normal = position.clone().normalize();
          const worldUp = new THREE.Vector3(0, 1, 0);
          let east = new THREE.Vector3().crossVectors(worldUp, normal);
          if (east.lengthSq() < 1e-6) east.set(1, 0, 0);
          east.normalize();
          const north = new THREE.Vector3().crossVectors(normal, east).normalize();
          const bearingRad = ((d.bearing ?? 0) * Math.PI) / 180;
          const forward = north
            .clone()
            .multiplyScalar(Math.cos(bearingRad))
            .add(east.clone().multiplyScalar(Math.sin(bearingRad)))
            .normalize();
          const target = position.clone().add(forward);
          obj.up.copy(normal);
          obj.lookAt(target);
        }}
      />
      {/* HUD overlays */}
      <span className="hud-reticle-tr" aria-hidden />
      <span className="hud-reticle-bl" aria-hidden />
      <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-2 rounded-md border border-cyan-500/30 bg-bg-0/75 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.25em]">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.9)]" />
        Orbital · 3D
      </div>
      {showPlane ? (
        <div className="pointer-events-none absolute bottom-3 right-3 rounded-md border border-line bg-bg-0/80 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-1 backdrop-blur-md">
          <span className="text-ink-3">Pos </span>
          <span className="text-ink-0">
            {position.lat.toFixed(2)}°, {position.lng.toFixed(2)}°
          </span>
          <span className="mx-2 text-ink-3">·</span>
          <span className="text-ink-3">Alt </span>
          <span className="text-ink-0">
            {Math.round(position.altitudeM / 0.3048 / 100) * 100} ft
          </span>
        </div>
      ) : null}
      {isEmergency ? (
        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-md border border-signal-red/40 bg-bg-0/85 px-2 py-1 font-mono text-[10px] uppercase tracking-wider">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-signal-red shadow-[0_0_6px_rgba(239,68,68,0.95)]" />
          Emergency hold
        </div>
      ) : null}
    </div>
  );
}