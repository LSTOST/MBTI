"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const STAR_POSITIONS = new Float32Array(
  Array.from({ length: 3000 }, (_, i) => {
    const seed = i * 12345.6789;
    const pseudoRandom = (n: number) => {
      const x = Math.sin(seed + n) * 10000;
      return x - Math.floor(x);
    };
    const theta = pseudoRandom(1) * Math.PI * 2;
    const phi = Math.acos(2 * pseudoRandom(2) - 1);
    const r = 15 + pseudoRandom(3) * 50;
    return [
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi),
    ];
  }).flat()
);

const PLANETS: {
  orbitRadius: number;
  size: number;
  color: string;
  speed: number;
  initialAngle: number;
  emissiveColor: string;
  hasRing?: boolean;
  ringColor?: string;
  ringTilt?: number;
}[] = [
  { orbitRadius: 2.2, size: 0.07, color: "#b0b0b0", speed: 0.48, initialAngle: 1.2, emissiveColor: "#808080" },
  { orbitRadius: 2.7, size: 0.11, color: "#e8c870", speed: 0.38, initialAngle: 3.8, emissiveColor: "#b09840" },
  { orbitRadius: 3.2, size: 0.12, color: "#4090d0", speed: 0.30, initialAngle: 0.5, emissiveColor: "#2060a0" },
  { orbitRadius: 3.7, size: 0.09, color: "#c04020", speed: 0.24, initialAngle: 5.2, emissiveColor: "#901510" },
  { orbitRadius: 4.4, size: 0.28, color: "#c89050", speed: 0.14, initialAngle: 2.8, emissiveColor: "#a07030" },
  { orbitRadius: 5.2, size: 0.24, color: "#d4a860", speed: 0.10, initialAngle: 4.5, emissiveColor: "#b08840", hasRing: true, ringColor: "#c8b080", ringTilt: Math.PI / 3 },
  { orbitRadius: 5.9, size: 0.16, color: "#60c8d0", speed: 0.065, initialAngle: 1.8, emissiveColor: "#40a0a8" },
  { orbitRadius: 6.5, size: 0.15, color: "#3060c0", speed: 0.04, initialAngle: 3.5, emissiveColor: "#1840a0" },
];

const ORBIT_COLORS: { color: string; glowColor: string }[] = [
  { color: "#aab8ff", glowColor: "#9070FC" },
  { color: "#a0bcff", glowColor: "#8568FC" },
  { color: "#96c0ff", glowColor: "#7C5CFC" },
  { color: "#90c0ff", glowColor: "#7060FC" },
  { color: "#88c4ff", glowColor: "#6478FC" },
  { color: "#80c8ff", glowColor: "#5890FC" },
  { color: "#78ccff", glowColor: "#50A0FC" },
  { color: "#70d0ff", glowColor: "#48B0FC" },
];

function Starfield() {
  const starsRef = useRef<THREE.Points>(null);

  useFrame((state) => {
    if (starsRef.current) {
      starsRef.current.rotation.y = state.clock.elapsedTime * 0.005;
    }
  });

  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[STAR_POSITIONS, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        color="#ffffff"
        transparent
        opacity={0.9}
        sizeAttenuation
      />
    </points>
  );
}

function Sun() {
  const coreRef = useRef<THREE.Mesh>(null);
  const surfaceRef = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (coreRef.current) coreRef.current.rotation.y += 0.001;
    if (surfaceRef.current) surfaceRef.current.rotation.y -= 0.0015;
    if (coronaRef.current) {
      coronaRef.current.scale.setScalar(1.15 + Math.sin(t * 2) * 0.03);
    }
  });

  return (
    <group>
      <mesh ref={coreRef}>
        <sphereGeometry args={[1.2, 64, 64]} />
        <meshBasicMaterial color="#fff4d0" />
      </mesh>

      <mesh ref={surfaceRef}>
        <sphereGeometry args={[1.22, 48, 48]} />
        <meshBasicMaterial color="#ffaa40" transparent opacity={0.5} />
      </mesh>

      <mesh ref={coronaRef} scale={1.15}>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshBasicMaterial color="#ff8800" transparent opacity={0.25} />
      </mesh>

      <pointLight color="#ffaa44" intensity={3} distance={20} />
      <pointLight color="#ff8800" intensity={2} distance={25} />
    </group>
  );
}

function GlowingOrbitRing({
  radius,
  color,
  glowColor,
}: {
  radius: number;
  color: string;
  glowColor: string;
}) {
  const pulseRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (pulseRef.current) {
      const mat = pulseRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.06 + Math.sin(state.clock.elapsedTime * 0.8 + radius * 2) * 0.025;
    }
  });

  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh>
        <ringGeometry args={[radius - 0.006, radius + 0.006, 128]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.45}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <ringGeometry args={[radius - 0.04, radius + 0.04, 128]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={pulseRef}>
        <ringGeometry args={[radius - 0.1, radius + 0.1, 128]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={0.06}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function Planet({
  orbitRadius,
  size,
  color,
  speed,
  initialAngle,
  emissiveColor,
  hasRing = false,
  ringColor = "#d4a574",
  ringTilt = Math.PI / 4,
}: {
  orbitRadius: number;
  size: number;
  color: string;
  speed: number;
  initialAngle: number;
  emissiveColor?: string;
  hasRing?: boolean;
  ringColor?: string;
  ringTilt?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (groupRef.current) {
      const angle = initialAngle + state.clock.elapsedTime * speed;
      groupRef.current.position.x = Math.cos(angle) * orbitRadius;
      groupRef.current.position.z = Math.sin(angle) * orbitRadius;
      groupRef.current.position.y = 0;
    }
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.008;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={emissiveColor || "#000000"}
          emissiveIntensity={emissiveColor ? 0.4 : 0}
          roughness={0.5}
          metalness={0.15}
        />
      </mesh>
      <mesh scale={1.25}>
        <sphereGeometry args={[size, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} />
      </mesh>
      {hasRing && (
        <mesh rotation={[ringTilt, 0.15, 0]}>
          <ringGeometry args={[size * 1.4, size * 2.0, 64]} />
          <meshBasicMaterial color={ringColor} transparent opacity={0.85} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function AstronautFigure({ scale }: { scale: number }) {
  return (
    <group scale={scale}>
      <mesh position={[0, 2, 0]}>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshStandardMaterial color="#e8e8e8" roughness={0.2} metalness={0.6} />
      </mesh>
      <mesh position={[0, 2, 0.45]}>
        <sphereGeometry args={[0.55, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#1a1a40" roughness={0.05} metalness={0.9} />
      </mesh>
      <mesh position={[0.15, 2.1, 0.55]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshBasicMaterial color="#7C5CFC" transparent opacity={0.5} />
      </mesh>
      <mesh position={[0, 0.7, 0]}>
        <capsuleGeometry args={[0.55, 1.3, 8, 16]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.9, -0.55]}>
        <boxGeometry args={[0.9, 1.1, 0.45]} />
        <meshStandardMaterial color="#d5d5d5" roughness={0.5} />
      </mesh>
      <group position={[-0.85, 1.1, 0]} rotation={[0.5, 0, Math.PI / 3]}>
        <mesh>
          <capsuleGeometry args={[0.2, 0.7, 8, 16]} />
          <meshStandardMaterial color="#f5f5f5" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.55, 0]}>
          <sphereGeometry args={[0.18, 8, 8]} />
          <meshStandardMaterial color="#f5f5f5" roughness={0.4} />
        </mesh>
      </group>
      <mesh position={[0.85, 0.8, 0.15]} rotation={[0.4, 0, -Math.PI / 5]}>
        <capsuleGeometry args={[0.2, 0.7, 8, 16]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.4} />
      </mesh>
      <mesh position={[-0.35, -0.5, 0.1]} rotation={[0.25, 0, 0.1]}>
        <capsuleGeometry args={[0.22, 0.85, 8, 16]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.4} />
      </mesh>
      <mesh position={[0.35, -0.6, 0]} rotation={[-0.15, 0, -0.1]}>
        <capsuleGeometry args={[0.22, 0.85, 8, 16]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.4} />
      </mesh>
    </group>
  );
}

function OrbitingAstronaut() {
  const orbitRef = useRef<THREE.Group>(null);
  const wobbleRef = useRef<THREE.Group>(null);

  const orbitRadius = 3.45;
  const speed = 0.27;
  const initialAngle = 1.5;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (orbitRef.current) {
      const angle = initialAngle + t * speed;
      orbitRef.current.position.x = Math.cos(angle) * orbitRadius;
      orbitRef.current.position.z = Math.sin(angle) * orbitRadius;
      orbitRef.current.position.y = 0;
      orbitRef.current.rotation.y = -angle + Math.PI / 2;
    }
    if (wobbleRef.current) {
      wobbleRef.current.rotation.z = Math.sin(t * 0.82) * 0.12;
      wobbleRef.current.rotation.x = Math.sin(t * 0.52) * 0.08;
    }
  });

  return (
    <group ref={orbitRef}>
      <group ref={wobbleRef}>
        <AstronautFigure scale={0.21} />
      </group>
    </group>
  );
}

function ShootingStar({ seed }: { seed: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const trailMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const headMatRef = useRef<THREE.MeshBasicMaterial>(null);

  const config = useMemo(() => {
    const pr = (n: number) => {
      const x = Math.sin(seed * 9301 + n * 49297) * 10000;
      return x - Math.floor(x);
    };
    return {
      startX: 4 + pr(1) * 16,
      startY: 5 + pr(2) * 16,
      startZ: -2 - pr(3) * 10,
      dirX: -(0.5 + pr(4) * 0.4),
      dirY: -(0.4 + pr(5) * 0.4),
      speed: 10 + pr(6) * 10,
      interval: 2.5 + pr(7) * 4.5,
      offset: pr(8) * 12,
      length: 1.0 + pr(9) * 1.5,
    };
  }, [seed]);

  const trailGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const len = config.length;
    const w = 0.018;
    const positions = new Float32Array([0, w, 0, 0, -w, 0, -len, 0, 0]);
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [config.length]);

  useFrame((state) => {
    if (!groupRef.current || !trailMatRef.current || !headMatRef.current) return;

    const t = (state.clock.elapsedTime + config.offset) % config.interval;
    const duration = 1.0;

    if (t > duration) {
      trailMatRef.current.opacity = 0;
      headMatRef.current.opacity = 0;
      return;
    }

    const progress = t / duration;
    const fade =
      progress < 0.12 ? progress / 0.12 : Math.max(0, (1 - progress) / 0.88);

    trailMatRef.current.opacity = fade * 0.5;
    headMatRef.current.opacity = fade * 0.9;

    const dist = config.speed * t;
    const angle = Math.atan2(config.dirY, config.dirX);

    groupRef.current.position.set(
      config.startX + config.dirX * dist,
      config.startY + config.dirY * dist,
      config.startZ
    );
    groupRef.current.rotation.z = angle;
  });

  return (
    <group ref={groupRef}>
      <mesh geometry={trailGeo}>
        <meshBasicMaterial
          ref={trailMatRef}
          color="#c8d8ff"
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial
          ref={headMatRef}
          color="#ffffff"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

const SHOOTING_STAR_SEEDS = Array.from({ length: 16 }, (_, i) => i + 1);

function SolarSystem() {
  return (
    <group position={[0, 0.6, 0]} rotation={[0.56, 0.19, 0.2]} scale={0.45}>
      <Sun />

      {PLANETS.map((p, i) => (
        <GlowingOrbitRing
          key={`ring-${i}`}
          radius={p.orbitRadius}
          color={ORBIT_COLORS[i].color}
          glowColor={ORBIT_COLORS[i].glowColor}
        />
      ))}

      {PLANETS.map((p, i) => (
        <Planet key={`planet-${i}`} {...p} />
      ))}

      <OrbitingAstronaut />
    </group>
  );
}

export function GalaxyScene() {
  return (
    <div className="absolute inset-0">
      <Canvas camera={{ position: [0, 1, 8], fov: 55 }} gl={{ antialias: true, alpha: true }}>
        <color attach="background" args={["#050510"]} />
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 5, 5]} intensity={0.5} />

        <Starfield />
        <SolarSystem />
        {SHOOTING_STAR_SEEDS.map((s) => (
          <ShootingStar key={s} seed={s} />
        ))}
      </Canvas>
    </div>
  );
}
