"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import {
  blobFragment,
  blobVertex,
  particlesFragment,
  particlesVertex,
} from "./shaders";

type Palette = {
  a: string;
  b: string;
  rim: string;
  dustA: string;
  dustB: string;
};

const PALETTE: Record<"light" | "dark", Palette> = {
  dark: {
    a: "#1b1f4b",
    b: "#0b1030",
    rim: "#89cff0",
    dustA: "#89cff0",
    dustB: "#a78bfa",
  },
  light: {
    a: "#cfe4ff",
    b: "#8ea8ff",
    rim: "#5b4bff",
    dustA: "#6d5efc",
    dustB: "#4fb6e8",
  },
};

const halo = {
  vertex: /* glsl */ `
    varying vec3 vN;
    varying vec3 vV;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vN = normalize(normalMatrix * normal);
      vV = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragment: /* glsl */ `
    uniform vec3 uColor;
    uniform float uOpacity;
    varying vec3 vN;
    varying vec3 vV;
    void main() {
      float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 3.2);
      gl_FragColor = vec4(uColor, f * uOpacity);
      #include <colorspace_fragment>
    }
  `,
};

/* ---------------------------------------------------------------- blob -- */

function Blob({
  theme,
  detail,
  reduced,
}: {
  theme: "light" | "dark";
  detail: number;
  reduced: boolean;
}) {
  const { viewport } = useThree();
  const wide = viewport.aspect > 1.15;
  const mesh = useRef<THREE.Mesh>(null!);
  const group = useRef<THREE.Group>(null!);
  const haloRef = useRef<THREE.ShaderMaterial>(null!);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmp: { value: 0.0 },
      uFreq: { value: 1.25 },
      uPointerAmount: { value: 0 },
      uPointerDir: { value: new THREE.Vector3(0, 0, 1) },
      uColorA: { value: new THREE.Color(PALETTE[theme].a) },
      uColorB: { value: new THREE.Color(PALETTE[theme].b) },
      uColorRim: { value: new THREE.Color(PALETTE[theme].rim) },
      uOpacity: { value: 1 },
      uIridescence: { value: 0.62 },
    }),
    // palette is lerped every frame; only build the object once
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const haloUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(PALETTE[theme].rim) },
      uOpacity: { value: 0.0 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const tmp = useMemo(
    () => ({
      dir: new THREE.Vector3(),
      quat: new THREE.Quaternion(),
      colorA: new THREE.Color(),
      colorB: new THREE.Color(),
      colorRim: new THREE.Color(),
    }),
    []
  );

  const { camera } = useThree();

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const p = state.pointer;

    uniforms.uTime.value = reduced ? 0.6 : t;

    // grow in on first frames instead of popping into existence
    uniforms.uAmp.value = THREE.MathUtils.damp(
      uniforms.uAmp.value,
      reduced ? 0.16 : 0.26,
      1.4,
      d
    );

    // cursor bulge, aimed at the surface point facing the pointer
    tmp.dir
      .set(p.x * 1.15, p.y * 1.15, 0.95)
      .normalize()
      .applyQuaternion(camera.quaternion);
    mesh.current.getWorldQuaternion(tmp.quat);
    tmp.dir.applyQuaternion(tmp.quat.invert());
    uniforms.uPointerDir.value.lerp(tmp.dir, 0.12);
    uniforms.uPointerAmount.value = THREE.MathUtils.damp(
      uniforms.uPointerAmount.value,
      reduced ? 0 : 0.55,
      2,
      d
    );

    // theme cross-fade
    const pal = PALETTE[theme];
    uniforms.uColorA.value.lerp(tmp.colorA.set(pal.a), 0.06);
    uniforms.uColorB.value.lerp(tmp.colorB.set(pal.b), 0.06);
    uniforms.uColorRim.value.lerp(tmp.colorRim.set(pal.rim), 0.06);
    haloUniforms.uColor.value.copy(uniforms.uColorRim.value);
    haloUniforms.uOpacity.value = THREE.MathUtils.damp(
      haloUniforms.uOpacity.value,
      theme === "dark" ? 0.5 : 0.3,
      2,
      d
    );

    if (!reduced) {
      group.current.rotation.y += d * 0.12;
      group.current.rotation.x = THREE.MathUtils.damp(
        group.current.rotation.x,
        -p.y * 0.26,
        3,
        d
      );
      group.current.rotation.z = THREE.MathUtils.damp(
        group.current.rotation.z,
        p.x * 0.12,
        3,
        d
      );
      group.current.position.y = Math.sin(t * 0.55) * 0.06;
    }

    group.current.position.x = THREE.MathUtils.damp(
      group.current.position.x,
      wide ? 1.9 : 0,
      2,
      d
    );

    if (haloRef.current) haloRef.current.uniforms.uOpacity.value = haloUniforms.uOpacity.value;
  });

  return (
    <group ref={group} scale={0.88}>
      <mesh ref={mesh}>
        <icosahedronGeometry args={[1, detail]} />
        <shaderMaterial
          vertexShader={blobVertex}
          fragmentShader={blobFragment}
          uniforms={uniforms}
        />
      </mesh>

      {/* atmospheric rim glow */}
      <mesh scale={1.34}>
        <sphereGeometry args={[1, 48, 48]} />
        <shaderMaterial
          ref={haloRef}
          vertexShader={halo.vertex}
          fragmentShader={halo.fragment}
          uniforms={haloUniforms}
          transparent
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* skeletal outer shell for depth */}
      <mesh scale={1.85} rotation={[0.4, 0.2, 0]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial
          color={PALETTE[theme].rim}
          wireframe
          transparent
          opacity={theme === "dark" ? 0.1 : 0.16}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/* ----------------------------------------------------------- particles -- */

function Dust({
  count,
  theme,
  reduced,
}: {
  count: number;
  theme: "light" | "dark";
  reduced: boolean;
}) {
  const points = useRef<THREE.Points>(null!);

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const seeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // flattened shell — reads as a galaxy rather than a ball of noise
      const radius = 2.3 + Math.pow(Math.random(), 0.6) * 5.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
      positions[i * 3 + 1] = Math.cos(phi) * radius * 0.45;
      positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;

      scales[i] = 0.35 + Math.random() * Math.random() * 2.2;
      seeds[i] = Math.random();
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    return g;
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: 7.5 },
      uSpin: { value: 0.32 },
      uPixelRatio: { value: 1 },
      uColorA: { value: new THREE.Color(PALETTE[theme].dustA) },
      uColorB: { value: new THREE.Color(PALETTE[theme].dustB) },
      uOpacity: { value: 0 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const tmp = useMemo(() => ({ a: new THREE.Color(), b: new THREE.Color() }), []);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05);
    uniforms.uTime.value = reduced ? 2 : state.clock.elapsedTime;
    uniforms.uPixelRatio.value = state.viewport.dpr;
    uniforms.uOpacity.value = THREE.MathUtils.damp(
      uniforms.uOpacity.value,
      theme === "dark" ? 0.95 : 0.6,
      1.6,
      d
    );
    const pal = PALETTE[theme];
    uniforms.uColorA.value.lerp(tmp.a.set(pal.dustA), 0.06);
    uniforms.uColorB.value.lerp(tmp.b.set(pal.dustB), 0.06);

    if (!reduced) {
      points.current.rotation.y += d * 0.015;
      points.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.06;
    }
  });

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        vertexShader={particlesVertex}
        fragmentShader={particlesFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* -------------------------------------------------------------- camera -- */

function CameraRig({ reduced }: { reduced: boolean }) {
  const { camera } = useThree();
  const scroll = useRef(0);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05);
    if (typeof window !== "undefined") {
      scroll.current = Math.min(window.scrollY / window.innerHeight, 1);
    }

    const px = reduced ? 0 : state.pointer.x;
    const py = reduced ? 0 : state.pointer.y;

    camera.position.x = THREE.MathUtils.damp(camera.position.x, px * 0.55, 2.4, d);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, py * 0.4, 2.4, d);
    camera.position.z = THREE.MathUtils.damp(
      camera.position.z,
      5.1 + scroll.current * 2.6,
      2.4,
      d
    );
    camera.lookAt(0, 0, 0);
  });

  return null;
}

/* --------------------------------------------------------------- scene -- */

export default function HeroCanvas({
  theme = "dark",
  active = true,
  reduced = false,
  quality = "high",
}: {
  theme?: "light" | "dark";
  active?: boolean;
  reduced?: boolean;
  quality?: "high" | "low";
}) {
  const low = quality === "low";

  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, low ? 1.4 : 1.9]}
      gl={{
        antialias: !low,
        alpha: true,
        powerPreference: "high-performance",
      }}
      camera={{ position: [0, 0, 5.1], fov: 38 }}
      onCreated={({ gl }) => gl.setClearAlpha(0)}
    >
      <Blob theme={theme} detail={low ? 12 : 24} reduced={reduced} />
      <Dust count={low ? 900 : 2600} theme={theme} reduced={reduced} />
      <CameraRig reduced={reduced} />
    </Canvas>
  );
}
