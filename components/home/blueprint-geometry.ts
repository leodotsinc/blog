import * as THREE from "three";

type Point = [number, number, number];

/** All decks share one draw call. Geometry is generated only on mount. */
export function createArchitecture() {
  const box = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
  const source = box.getAttribute("position");
  const sourceNormal = box.getAttribute("normal");
  const positions: number[] = [], normals: number[] = [], locals: number[] = [];
  const layers: number[] = [], kinds: number[] = [];
  const add = (center: Point, size: Point, layer: number, kind = 0) => {
    for (let v = 0; v < source.count; v++) {
      const x = source.getX(v), y = source.getY(v), z = source.getZ(v);
      positions.push(x * size[0] + center[0], y * size[1] + center[1], z * size[2] + center[2]);
      locals.push(x, y, z);
      normals.push(sourceNormal.getX(v), sourceNormal.getY(v), sourceNormal.getZ(v));
      layers.push(layer);
      kinds.push(kind);
    }
  };
  for (let layer = 0; layer < 7; layer++) {
    // Asymmetric, open-ended cantilevers — a miniature architectural model.
    add([0, 0, -1.12], [2.7, 0.14, 0.46], layer);
    add([-1.12, 0, 0.13], [0.46, 0.14, 2.25], layer);
    add([0.34, 0, 1.12], [2.02, 0.14, 0.46], layer);
    add([1.12, 0, -0.27], [0.46, 0.14, 1.72], layer);
    // Inlaid strips and a finely divided bank of fins, not a solid cube.
    add([-0.04, 0.079, -1.12], [2.32, 0.012, 0.024], layer, 1);
    add([-1.12, 0.079, 0.1], [0.024, 0.012, 1.93], layer, 1);
    for (let fin = 0; fin < 9; fin++) {
      add([-0.66 + fin * 0.18, 0.092, 1.11], [0.035, 0.038, 0.28], layer, 2);
    }
    add([0.52, 0.07, -0.89], [0.26, 0.026, 0.22], layer, 1);
    add([-1.11, 0.105, -1.1], [0.09, 0.07, 0.09], layer, 1);
    add([1.11, -0.1, -1.1], [0.08, 0.11, 0.08], layer, 2);
    // A bright, hollow stair descends through the central void.
    add([-0.32 + (layer % 3) * 0.2, 0.015, 0], [0.5, 0.075, 0.64], layer, 2);
    add([-0.32 + (layer % 3) * 0.2, 0.059, -0.28], [0.46, 0.012, 0.02], layer, 1);
  }
  box.dispose();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("aLocal", new THREE.Float32BufferAttribute(locals, 3));
  geometry.setAttribute("aLayer", new THREE.Float32BufferAttribute(layers, 1));
  geometry.setAttribute("aKind", new THREE.Float32BufferAttribute(kinds, 1));
  return geometry;
}

export function createTraces() {
  const positions: number[] = [], layers: number[] = [];
  const line = (a: Point, b: Point, la: number, lb = la) => {
    positions.push(...a, ...b);
    layers.push(la, lb);
  };
  for (let layer = 0; layer < 7; layer++) {
    const r = 1.27, y = 0.1;
    line([-r, y, -r], [r, y, -r], layer);
    line([r, y, -r], [r, y, r], layer);
    line([r, y, r], [-r, y, r], layer);
    line([-r, y, r], [-r, y, -r], layer);
  }
  for (const [x, z] of [[-0.73, -0.73], [0.73, 0.73], [0.73, -0.73], [-0.73, 0.73]]) {
    for (let i = 0; i < 90; i++) line([x, 0, z], [x, 0, z], i / 15, (i + 1) / 15);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("aLayer", new THREE.Float32BufferAttribute(layers, 1));
  return geometry;
}

export function createSignals(low: boolean) {
  const positions: number[] = [], layers: number[] = [], seeds: number[] = [], trails: number[] = [];
  const trailLength = low ? 4 : 7;
  const add = (point: Point, layer: number, seed: number) => {
    for (let trail = 0; trail < trailLength; trail++) {
      positions.push(...point); layers.push(layer); seeds.push(seed); trails.push(trail);
    }
  };
  for (let layer = 0; layer < 7; layer++) {
    for (let signal = 0; signal < 5; signal++) add([0, 0, 0], layer, signal / 5 + layer * 0.13);
  }
  for (const [i, [x, z]] of [[-0.73, -0.73], [0.73, 0.73], [0.73, -0.73], [-0.73, 0.73]].entries()) {
    for (let signal = 0; signal < 12; signal++) add([x, 0, z], 7, signal / 12 + i * 0.23);
  }
  // Deterministic specks drift around the construction; no random allocations per frame.
  for (let i = 0; i < (low ? 60 : 120); i++) {
    positions.push(0, 0, 0); layers.push(8); seeds.push(i * 0.61803398875); trails.push(0);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("aLayer", new THREE.Float32BufferAttribute(layers, 1));
  geometry.setAttribute("aSeed", new THREE.Float32BufferAttribute(seeds, 1));
  geometry.setAttribute("aTrail", new THREE.Float32BufferAttribute(trails, 1));
  return geometry;
}
