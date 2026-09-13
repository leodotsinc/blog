"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import { createArchitecture, createSignals, createTraces } from "./blueprint-geometry";
import {
  architectureFragment, architectureVertex, signalFragment, signalVertex,
  traceFragment, traceVertex,
} from "./shaders";

export type BlueprintPointer = MutableRefObject<{ x: number; y: number }>;
type Props = {
  theme: "light" | "dark";
  active: boolean;
  reduced: boolean;
  low: boolean;
  open: boolean;
  pointer: BlueprintPointer;
  onReady: () => void;
  onUnavailable: () => void;
};

const PALETTE = {
  dark: { body: "#333a4e", accent: "#91e8ff", violet: "#a79aff" },
  light: { body: "#d0dfeb", accent: "#007da4", violet: "#7251d4" },
};

function Blueprint({ theme, active, reduced, low, open, pointer, onReady, onUnavailable }: Props) {
  const root = useRef<THREE.Group>(null);
  const { gl, invalidate } = useThree();
  const elapsed = useRef(0);
  const firstFrame = useRef(true);
  const geometry = useMemo(() => ({
    architecture: createArchitecture(), traces: createTraces(), signals: createSignals(low),
  }), [low]);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 }, uOpen: { value: 0 }, uReveal: { value: 0 },
    uBody: { value: new THREE.Color() }, uAccent: { value: new THREE.Color() },
    uViolet: { value: new THREE.Color() },
    uPixelRatio: { value: 1 },
  }), []);

  // Construct materials with shared uniforms. R3F 9.6 copies declarative uniform
  // wrappers; mutating the original numbers would leave the GPU frozen.
  const materials = useMemo(() => ({
    architecture: new THREE.ShaderMaterial({ uniforms, vertexShader: architectureVertex, fragmentShader: architectureFragment }),
    traces: new THREE.ShaderMaterial({ uniforms, vertexShader: traceVertex, fragmentShader: traceFragment, transparent: true, depthWrite: false }),
    signals: new THREE.ShaderMaterial({ uniforms, vertexShader: signalVertex, fragmentShader: signalFragment, transparent: true, depthWrite: false }),
  }), [uniforms]);
  useEffect(() => () => Object.values(materials).forEach((item) => item.dispose()), [materials]);

  useEffect(() => () => Object.values(geometry).forEach((item) => item.dispose()), [geometry]);
  useEffect(() => {
    const colors = PALETTE[theme];
    uniforms.uBody.value.set(colors.body);
    uniforms.uAccent.value.set(colors.accent);
    uniforms.uViolet.value.set(colors.violet);
    invalidate();
  }, [theme, uniforms, invalidate]);
  useEffect(() => { invalidate(); }, [active, reduced, open, invalidate]);
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => { event.preventDefault(); onUnavailable(); };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onUnavailable]);

  useFrame((state, delta) => {
    // Clamp the first delta after resuming: no jumps after a menu or tab switch.
    const dt = Math.min(delta, 0.04);
    if (active && !reduced) elapsed.current += dt;
    const t = elapsed.current;
    uniforms.uTime.value = reduced ? 0 : t;
    uniforms.uOpen.value = reduced ? Number(open) : THREE.MathUtils.damp(uniforms.uOpen.value, Number(open), 3.8, dt);
    uniforms.uReveal.value = reduced ? 1 : Math.min(1, t / 1.5);
    uniforms.uPixelRatio.value = state.viewport.dpr;
    if (root.current) {
      root.current.rotation.y = reduced ? -0.35 : THREE.MathUtils.damp(root.current.rotation.y, -0.35 + Math.sin(t * 0.16) * 0.23 + pointer.current.x * 0.16, 3, dt);
      root.current.rotation.x = reduced ? 0 : THREE.MathUtils.damp(root.current.rotation.x, pointer.current.y * 0.08, 3, dt);
      root.current.position.y = reduced ? 0 : Math.sin(t * 0.45) * 0.065;
    }
    if (firstFrame.current) {
      firstFrame.current = false;
      onReady();
    }
    // A demand loop stops completely out of view, under the menu or in hidden tabs.
    // React/resize/theme changes still get one frame, including reduced motion.
    if (active && !reduced) invalidate();
  });

  return (
    <group ref={root}>
      <mesh geometry={geometry.architecture} material={materials.architecture} frustumCulled={false} />
      <lineSegments geometry={geometry.traces} material={materials.traces} frustumCulled={false} />
      <points geometry={geometry.signals} material={materials.signals} frustumCulled={false} />
    </group>
  );
}

export default function HeroCanvas(props: Props) {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, props.low ? 1 : 1.25]}
      gl={{ antialias: true, alpha: true, powerPreference: "default" }}
      camera={{ position: [4.2, 3.1, 6.7], fov: 39, near: 0.1, far: 30 }}
      onCreated={({ gl, camera }) => {
        gl.setClearAlpha(0);
        camera.lookAt(0, 0, 0);
      }}
      fallback={<span className="sr-only">Architectural sculpture illustration</span>}
    >
      <Blueprint {...props} />
    </Canvas>
  );
}
