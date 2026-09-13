"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { BRIDGES, createMonogramGeometry, createMotes, createStudio } from "./monogram-geometry";
import { moteFragment, moteVertex } from "./shaders";

type Props = {
  theme: "light" | "dark";
  active: boolean;
  reduced: boolean;
  low: boolean;
  pointer: RefObject<{ x: number; y: number }>;
  onReady: () => void;
  onUnavailable: () => void;
};

const smooth = (value: number) => {
  const x = THREE.MathUtils.clamp(value, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
};

function Monogram({ theme, active, reduced, pointer, onReady, onUnavailable }: Props) {
  const root = useRef<THREE.Group>(null);
  const front = useRef<THREE.Mesh>(null);
  const back = useRef<THREE.Mesh>(null);
  const bridges = useRef<(THREE.Mesh | null)[]>([]);
  const elapsed = useRef(0);
  const prepared = useRef(false);
  const { gl, scene, camera, invalidate } = useThree();
  const geometry = useMemo(createMonogramGeometry, []);
  const motes = useMemo(createMotes, []);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 }, uPixelRatio: { value: 1 }, uOpening: { value: 0 },
    uColor: { value: new THREE.Color("#b6dfff") },
  }), []);
  const materials = useMemo(() => ({
    face: new THREE.MeshPhysicalMaterial({ color: "#8d98ae", metalness: 1, roughness: 0.29, clearcoat: 0.6, clearcoatRoughness: 0.18, envMapIntensity: 1.25 }),
    edge: new THREE.MeshPhysicalMaterial({ color: "#cbd7e8", metalness: 1, roughness: 0.22, clearcoat: 0.7, clearcoatRoughness: 0.15, envMapIntensity: 1.4 }),
    motes: new THREE.ShaderMaterial({ uniforms, vertexShader: moteVertex, fragmentShader: moteFragment, transparent: true, depthWrite: false }),
  }), [uniforms]);
  const rimMaterials = useMemo(() => [materials.face, materials.edge], [materials]);

  useEffect(() => {
    materials.face.color.set(theme === "dark" ? "#8d98ae" : "#6e7b91");
    materials.edge.color.set(theme === "dark" ? "#cbd7e8" : "#a5b3c8");
    uniforms.uColor.value.set(theme === "dark" ? "#b6dfff" : "#4b607f");
    invalidate();
  }, [theme, materials, uniforms, invalidate]);

  useEffect(() => {
    let cancelled = false;
    const studio = createStudio(gl);
    scene.environment = studio.texture;
    // Compile while the SVG is visible; the first visible frame has its materials ready.
    gl.compileAsync(scene, camera).then(() => {
      if (cancelled) return;
      prepared.current = true;
      onReady();
      invalidate();
    }).catch(() => { if (!cancelled) onUnavailable(); });
    const canvas = gl.domElement;
    const lost = (event: Event) => { event.preventDefault(); onUnavailable(); };
    canvas.addEventListener("webglcontextlost", lost);
    return () => {
      cancelled = true;
      canvas.removeEventListener("webglcontextlost", lost);
      scene.environment = null;
      studio.dispose();
    };
  }, [gl, scene, camera, invalidate, onReady, onUnavailable]);

  useEffect(() => () => {
    Object.values(geometry).forEach((item) => item.dispose());
    Object.values(materials).forEach((item) => item.dispose());
    motes.dispose();
  }, [geometry, materials, motes]);
  useEffect(() => { invalidate(); }, [active, reduced, invalidate]);

  useFrame((state, delta) => {
    if (!prepared.current) return;
    const dt = Math.min(delta, 0.04);
    if (active && !reduced) elapsed.current += dt;
    const t = reduced ? 0 : elapsed.current;
    // 18-second choreography: hold the signature, unfold, turn, reassemble, rest.
    const cycle = t % 18;
    const opening = reduced ? 0 : smooth((cycle - 4.5) / 3) * (1 - smooth((cycle - 11.2) / 3.8));
    const arrival = reduced ? 1 : smooth(t / 2.4);
    const spread = Math.max(opening, (1 - arrival) * 0.65);
    uniforms.uTime.value = t;
    uniforms.uOpening.value = spread;
    uniforms.uPixelRatio.value = state.viewport.dpr;

    if (root.current) {
      root.current.rotation.y = THREE.MathUtils.damp(root.current.rotation.y, -0.2 + Math.sin(t * 0.22) * 0.16 + opening * 0.22 + (reduced ? 0 : pointer.current.x * 0.1), 3, dt);
      root.current.rotation.z = reduced ? 0 : Math.sin(t * 0.29) * 0.045;
      root.current.rotation.x = THREE.MathUtils.damp(root.current.rotation.x, reduced ? 0 : pointer.current.y * 0.07, 3, dt);
      root.current.position.y = reduced ? 0 : Math.sin(t * 0.7) * 0.055;
    }
    if (front.current && back.current) {
      front.current.position.set(spread * 0.34, spread * 0.2, 0.68 + spread * 0.62);
      back.current.position.set(-spread * 0.34, -spread * 0.16, -0.68 - spread * 0.62);
      front.current.rotation.y = -spread * 0.42;
      back.current.rotation.y = spread * 0.42;
      front.current.rotation.z = spread * 0.055;
      back.current.rotation.z = -spread * 0.055;
    }
    bridges.current.forEach((mesh, i) => {
      if (!mesh) return;
      const [x, y] = BRIDGES[i];
      mesh.position.set(x + Math.sign(x) * spread * 0.26, y + Math.sign(y) * spread * 0.24, 0);
      mesh.rotation.z = spread * (i % 2 ? -0.18 : 0.18);
      mesh.rotation.y = spread * (i % 2 ? 0.42 : -0.42);
    });
    if (active && !reduced) invalidate();
  });

  return (
    <group ref={root} rotation={[0, -0.2, 0]}>
      <mesh ref={front} geometry={geometry.rim} material={rimMaterials} position={[0, 0, 0.68]} />
      <mesh ref={back} geometry={geometry.rim} material={rimMaterials} position={[0, 0, -0.68]} />
      {BRIDGES.map(([x, y], i) => (
        <mesh key={i} ref={(node) => { bridges.current[i] = node; }} geometry={geometry.bridge} material={materials.edge} position={[x, y, 0]} />
      ))}
      <points geometry={motes} material={materials.motes} />
    </group>
  );
}

export default function HeroCanvas(props: Props) {
  const [prepared, setPrepared] = useState(false);
  const onReady = useCallback(() => { setPrepared(true); props.onReady(); }, [props.onReady]);
  return (
    <Canvas
      frameloop={prepared ? "demand" : "never"}
      dpr={[1, props.low ? 1.5 : 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "default" }}
      camera={{ position: [4.5, 2.9, 7], fov: 36, near: 0.1, far: 30 }}
      onCreated={({ gl, camera }) => {
        gl.setClearAlpha(0);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.1;
        camera.lookAt(0, 0, 0);
      }}
      fallback={<span className="sr-only">Leonardo Torres monogram</span>}
    >
      <Monogram {...props} onReady={onReady} />
    </Canvas>
  );
}
