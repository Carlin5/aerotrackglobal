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

const MAX_TRAIL_POINTS = 220;
const PLANE_ALT_MIN = 0.012; // minimum altitude (in globe radii) so the plane is visible above the surface
const PLANE_ALT_SCALE = 1 / 180_000; // metres -> globe units, tuned for visibility

/** Build a stylised cargo-jet mesh oriented forward along -Z, up along +Y. */
function buildPlaneMesh(emergency: boolean) {
  const group = new THREE.Group();
  const bodyColor = emergency ? 0xff5252 : 0xe6faff;
  const accent = emergency ? 0xff2d2d : 0x22d3ee;
  const matBody = new THREE.MeshStandardMaterial({
    color: bodyColor,
    metalness: 0.4,
    roughness: 0.45,
    emissive: emergency ? 0x66050a : 0x041924,
    emissiveIntensity: 0.6,
  });
  const matAccent = new THREE.MeshStandardMaterial({
    color: accent,
    metalness: 0.6,
    roughness: 0.3,
    emissive: accent,
    emissiveIntensity: 1.4,
  });
  // Fuselage (long axis along -Z)
  const fuselage = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.45, 6.2, 16),
    matBody,
  );
  fuselage.rotation.x = Math.PI / 2;
  group.add(fuselage);
  // Nose cone
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.2, 16), matBody);
  nose.rotation.x = -Math.PI / 2;
  nose.position.set(0, 0, -3.7);
  group.add(nose);
  // Wings (long axis along X)
  const wing = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.18, 1.6), matBody);
  wing.position.set(0, 0, 0.2);
  group.add(wing);
  // Wing tips accent
  const wingTipL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.16, 1.4), matAccent);
  wingTipL.position.set(-3.55, 0, 0.2);
  group.add(wingTipL);
  const wingTipR = wingTipL.clone();
  wingTipR.position.set(3.55, 0, 0.2);
  group.add(wingTipR);
  // Tail
  const tailWing = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.14, 0.9),
    matBody,
  );
  tailWing.position.set(0, 0.05, 2.6);
  group.add(tailWing);
  const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.3, 1.0), matBody);
  tailFin.position.set(0, 0.65, 2.55);
  group.add(tailFin);
  // Engines
  const engineGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 12);
  const engineL = new THREE.Mesh(engineGeo, matAccent);
  engineL.rotation.x = Math.PI / 2;
  engineL.position.set(-1.6, -0.3, 0.6);
  group.add(engineL);
  const engineR = engineL.clone();
  engineR.position.set(1.6, -0.3, 0.6);
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
        color: ["#22D3EE", "#F97316"],
      })),
    [sequence],
  );

  const points = useMemo(
    () => [
      {
        lat: origin.lat,
        lng: origin.lng,
        size: 0.6,
        color: "#22D3EE",
        label: `${origin.code} · ${origin.city}`,
      },
      ...waypoints.map((w) => ({
        lat: w.lat,
        lng: w.lng,
        size: 0.5,
        color: "#22D3EE",
        label: `${w.code} · ${w.city}`,
      })),
      {
        lat: destination.lat,
        lng: destination.lng,
        size: 0.7,
        color: "#F97316",
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

  // First-frame camera + controls tuning
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
      className="relative overflow-hidden rounded-xl border border-line bg-bg-1"
      style={{ height }}
    >
      <Globe
        ref={globeRef}
        width={undefined}
        height={height}
        backgroundColor="rgba(3,6,11,1)"
        globeImageUrl="https://unpkg.com/three-globe@2.31.1/example/img/earth-night.jpg"
        bumpImageUrl="https://unpkg.com/three-globe@2.31.1/example/img/earth-topology.png"
        showAtmosphere
        atmosphereColor={isEmergency ? "#FF5252" : "#22D3EE"}
        atmosphereAltitude={0.18}
        arcsData={arcs}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        arcColor={(d: any) => d.color}
        arcAltitudeAutoScale={0.4}
        arcStroke={0.5}
        arcDashLength={0.4}
        arcDashGap={0.15}
        arcDashAnimateTime={3500}
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
            : ["rgba(34, 211, 238, 0.05)", "rgba(34, 211, 238, 0.95)"]
        }
        pathStroke={0.7}
        pathTransitionDuration={0}
        // Pulsing ring at plane location
        ringsData={planeData}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ringLat={(d: any) => d.lat}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ringLng={(d: any) => d.lng}
        ringColor={() =>
          isEmergency ? "rgba(255, 82, 82, 0.85)" : "rgba(34, 211, 238, 0.7)"
        }
        ringMaxRadius={isEmergency ? 5 : 3}
        ringPropagationSpeed={isEmergency ? 6 : 4}
        ringRepeatPeriod={isEmergency ? 800 : 1200}
        // Aircraft mesh — driven through the customLayer API so we can
        // update both position AND bearing rotation every tick.
        customLayerData={planeData}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        customThreeObject={(d: any) => {
          const mesh = buildPlaneMesh(d.emergency);
          mesh.scale.setScalar(0.55);
          planeMeshRef.current = mesh;
          return mesh;
        }}
        customThreeObjectUpdate={(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          obj: any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          d: any,
        ) => {
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
      <div className="pointer-events-none absolute right-3 top-3 rounded-md bg-bg-0/70 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-cyan-400 backdrop-blur-md ring-1 ring-cyan-500/30">
        Orbital view · 3D
      </div>
      {isEmergency ? (
        <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-bg-0/80 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-signal-red backdrop-blur-md ring-1 ring-signal-red/40">
          • Emergency hold
        </div>
      ) : null}
    </div>
  );
}
