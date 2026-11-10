"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { MotionValue } from "framer-motion";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

type SceneProps = {
  progress: MotionValue<number>;
  reduceMotion: boolean;
};

function noiseTexture(seed: number, repeat: [number, number]) {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  let state = seed;

  for (let index = 0; index < size * size; index += 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const coarse = 92 + ((state >>> 24) % 92);
    const grain = index % 11 === 0 ? 34 : 0;
    const value = Math.min(255, coarse + grain);
    data[index * 4] = value;
    data[index * 4 + 1] = value;
    data[index * 4 + 2] = value;
    data[index * 4 + 3] = 255;
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(...repeat);
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function SceneRig({ progress, reduceMotion }: SceneProps) {
  const { camera, size } = useThree();
  const lookAt = useMemo(() => new THREE.Vector3(), []);
  const desired = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const value = reduceMotion ? 0.18 : progress.get();
    const mobile = size.width < 640;
    desired.set(
      mobile ? 8.8 - value * 0.6 : 7.4 - value * 0.9,
      mobile ? 4.8 - value * 0.45 : 4.25 - value * 0.55,
      mobile ? 13.4 - value * 0.7 : 10.4 - value * 0.9,
    );
    camera.position.lerp(desired, reduceMotion ? 1 : 0.045);
    lookAt.set(mobile ? -0.25 : 0, 0.92 + value * 0.18, 0);
    camera.lookAt(lookAt);
  });

  return null;
}

function WaterVolume({ progress, reduceMotion }: SceneProps) {
  const volume = useRef<THREE.Mesh>(null);
  const surface = useRef<THREE.Mesh>(null);
  const geometry = useRef<THREE.PlaneGeometry>(null);

  useFrame(({ clock }) => {
    const value = reduceMotion ? 0.18 : progress.get();
    const height = 0.72 + value * 2.02;
    const bottom = -0.18;

    if (volume.current) {
      volume.current.scale.y = height;
      volume.current.position.y = bottom + height / 2;
    }

    if (surface.current) {
      surface.current.position.y = bottom + height + 0.015;
    }

    const positions = geometry.current?.attributes.position as THREE.BufferAttribute | undefined;
    if (!positions || reduceMotion) return;

    const time = clock.elapsedTime;
    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index);
      const y = positions.getY(index);
      const swell = Math.sin(x * 1.35 + time * 0.78) * 0.045;
      const ripple = Math.cos(y * 2.2 - time * 1.05 + x * 0.35) * 0.022;
      positions.setZ(index, swell + ripple);
    }
    positions.needsUpdate = true;
    geometry.current?.computeVertexNormals();
  });

  return (
    <group>
      <mesh ref={volume} position={[-3.28, 0.2, 0]} receiveShadow>
        <boxGeometry args={[6, 1, 4.12]} />
        <meshPhysicalMaterial
          color="#087c9c"
          roughness={0.18}
          metalness={0.05}
          transparent
          opacity={0.54}
          transmission={0.16}
          thickness={1.2}
          clearcoat={0.55}
          clearcoatRoughness={0.18}
          depthWrite={false}
        />
      </mesh>
      <mesh
        ref={surface}
        position={[-3.28, 0.55, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        frustumCulled={false}
      >
        <planeGeometry ref={geometry} args={[6, 4.12, 48, 30]} />
        <meshPhysicalMaterial
          color="#22b7d5"
          roughness={0.08}
          metalness={0.08}
          transparent
          opacity={0.82}
          transmission={0.12}
          clearcoat={1}
          clearcoatRoughness={0.06}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function ConcreteStructure() {
  const concrete = useMemo(() => noiseTexture(17, [4, 8]), []);

  useEffect(() => () => concrete.dispose(), [concrete]);

  const material = (
    <meshStandardMaterial
      color="#999d99"
      roughness={0.91}
      metalness={0.01}
      bumpMap={concrete}
      bumpScale={0.075}
    />
  );

  return (
    <group>
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.56, 3.4, 4.05]} />
        {material}
      </mesh>
      <mesh position={[0.08, -0.43, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.35, 0.48, 4.5]} />
        <meshStandardMaterial
          color="#858a86"
          roughness={0.94}
          bumpMap={concrete}
          bumpScale={0.06}
        />
      </mesh>

      {[0.38, 1.48, 2.58].flatMap((y) =>
        [-1.25, 0, 1.25].map((z) => (
          <mesh key={`${y}-${z}`} position={[0.286, y, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.045, 0.045, 0.018, 18]} />
            <meshStandardMaterial color="#59605e" roughness={0.95} />
          </mesh>
        )),
      )}

      <mesh position={[0.286, 0.92, 0]}>
        <boxGeometry args={[0.018, 0.016, 4.02]} />
        <meshStandardMaterial color="#5c6361" roughness={1} />
      </mesh>
      <mesh position={[0.286, 2.05, 0]}>
        <boxGeometry args={[0.018, 0.016, 4.02]} />
        <meshStandardMaterial color="#5c6361" roughness={1} />
      </mesh>
    </group>
  );
}

const rockPositions: Array<[number, number, number, number]> = [
  [1.1, 0.89, -1.45, 0.12],
  [1.72, 0.86, 1.22, 0.17],
  [2.35, 0.9, -0.4, 0.1],
  [3.1, 0.88, 1.55, 0.15],
  [3.72, 0.91, -1.2, 0.19],
  [4.15, 0.86, 0.42, 0.11],
];

function SoilBank() {
  const soil = useMemo(() => noiseTexture(83, [6, 5]), []);
  useEffect(() => () => soil.dispose(), [soil]);

  return (
    <group>
      <mesh position={[2.62, 0.31, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.68, 1.02, 4.48]} />
        <meshStandardMaterial
          color="#66513d"
          roughness={1}
          bumpMap={soil}
          bumpScale={0.16}
        />
      </mesh>
      <mesh position={[2.62, 0.835, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[4.68, 4.48, 18, 14]} />
        <meshStandardMaterial color="#7a6248" roughness={1} bumpMap={soil} bumpScale={0.12} />
      </mesh>
      {rockPositions.map(([x, y, z, scale], index) => (
        <mesh key={index} position={[x, y, z]} rotation={[index * 0.31, index * 0.58, 0]} castShadow>
          <dodecahedronGeometry args={[scale, 0]} />
          <meshStandardMaterial color={index % 2 ? "#80715f" : "#99866d"} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function Building({
  position,
  size,
  color,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
}) {
  const [width, height, depth] = size;
  const windowRows = height > 1.45 ? [0.42, 0.92] : [0.45];
  const windowColumns = width > 1.1 ? [-0.28, 0.28] : [0];

  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} roughness={0.82} />
      </mesh>
      <mesh position={[0, height + 0.055, 0]} castShadow>
        <boxGeometry args={[width + 0.12, 0.11, depth + 0.12]} />
        <meshStandardMaterial color="#3f4748" roughness={0.9} />
      </mesh>
      {windowRows.flatMap((y) =>
        windowColumns.map((x) => (
          <mesh key={`${x}-${y}`} position={[x, y, depth / 2 + 0.006]}>
            <planeGeometry args={[0.22, 0.22]} />
            <meshStandardMaterial
              color="#bfe8ef"
              emissive="#4b97a8"
              emissiveIntensity={0.45}
              roughness={0.28}
            />
          </mesh>
        )),
      )}
      <mesh position={[width * 0.28, 0.26, depth / 2 + 0.008]}>
        <planeGeometry args={[0.2, 0.42]} />
        <meshStandardMaterial color="#2b3131" roughness={0.9} />
      </mesh>
    </group>
  );
}

function RoadAndBuildings() {
  const dashPositions = [0.7, 1.35, 2, 2.65, 3.3, 3.95, 4.6];

  return (
    <group>
      <mesh position={[2.62, 0.87, 0]} receiveShadow>
        <boxGeometry args={[4.66, 0.08, 1.28]} />
        <meshStandardMaterial color="#252c2d" roughness={0.94} />
      </mesh>
      <mesh position={[2.62, 0.917, -0.54]}>
        <boxGeometry args={[4.58, 0.018, 0.035]} />
        <meshStandardMaterial color="#d5d7cf" roughness={0.8} />
      </mesh>
      <mesh position={[2.62, 0.917, 0.54]}>
        <boxGeometry args={[4.58, 0.018, 0.035]} />
        <meshStandardMaterial color="#d5d7cf" roughness={0.8} />
      </mesh>
      {dashPositions.map((x) => (
        <mesh key={x} position={[x, 0.919, 0]}>
          <boxGeometry args={[0.34, 0.02, 0.04]} />
          <meshStandardMaterial color="#e9c44d" roughness={0.74} />
        </mesh>
      ))}

      <Building position={[1.08, 0.84, -1.55]} size={[0.86, 1.18, 0.78]} color="#69777a" />
      <Building position={[2.18, 0.84, -1.62]} size={[1.02, 1.62, 0.86]} color="#8c8174" />
      <Building position={[3.52, 0.84, -1.52]} size={[1.18, 1.35, 0.82]} color="#657278" />
      <Building position={[4.55, 0.84, -1.48]} size={[0.72, 0.94, 0.72]} color="#948a7a" />
    </group>
  );
}

function PressureArrows() {
  const arrows = [
    { y: 0.3, length: 1.7 },
    { y: 0.82, length: 1.42 },
    { y: 1.34, length: 1.13 },
    { y: 1.86, length: 0.84 },
    { y: 2.38, length: 0.55 },
  ];

  return (
    <group position={[0, 0, 2.12]}>
      {arrows.map(({ y, length }) => (
        <group key={y} position={[-0.34 - length / 2, y, 0]}>
          <mesh rotation={[0, 0, -Math.PI / 2]}>
            <cylinderGeometry args={[0.018, 0.018, length, 12]} />
            <meshBasicMaterial color="#fb7b70" transparent opacity={0.72} />
          </mesh>
          <mesh position={[length / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.07, 0.2, 16]} />
            <meshBasicMaterial color="#ff8f82" transparent opacity={0.82} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function HydraulicModel(props: SceneProps) {
  return (
    <>
      <fog attach="fog" args={["#061923", 10, 22]} />
      <hemisphereLight args={["#bdeefa", "#2a211b", 1.35]} />
      <ambientLight intensity={0.42} />
      <directionalLight
        position={[-4, 9, 7]}
        intensity={3.2}
        color="#d9f8ff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-4, 2.8, 2]} intensity={18} distance={11} color="#23b8d7" />
      <pointLight position={[4, 3, 1]} intensity={8} distance={10} color="#d3a16f" />

      <group position={[0, -0.18, 0]}>
        <WaterVolume {...props} />
        <SoilBank />
        <RoadAndBuildings />
        <ConcreteStructure />
        <PressureArrows />
      </group>

      <mesh position={[0, -0.86, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[18, 13]} />
        <meshStandardMaterial color="#18211f" roughness={1} />
      </mesh>
      <SceneRig {...props} />
    </>
  );
}

export default function HydraulicScene3D(props: SceneProps) {
  return (
    <div className="absolute inset-0 z-10" aria-hidden="true">
      <Canvas
        shadows="basic"
        dpr={[1, 1.5]}
        camera={{ position: [7.4, 4.25, 10.4], fov: 36, near: 0.1, far: 40 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <HydraulicModel {...props} />
      </Canvas>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(3,17,25,.28)_0%,transparent_38%,rgba(1,9,15,.2)_100%)]" />
    </div>
  );
}
