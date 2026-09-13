import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { toCreasedNormals } from "three/addons/utils/BufferGeometryUtils.js";

/** The logo is an open L-shaped prism. Two continuous rims and six bridges
 * make its front, back and depth readable from every angle. */
export const BRIDGES = [
  [-1.17, -1.42], [1.17, -1.42], [1.17, -0.66],
  [-0.43, -0.66], [-0.43, 1.42], [-1.17, 1.42],
] as const;

export function createMonogramGeometry() {
  const outline = new THREE.Shape();
  outline.moveTo(-1.3, -1.55);
  outline.lineTo(1.3, -1.55);
  outline.lineTo(1.3, -0.53);
  outline.lineTo(-0.3, -0.53);
  outline.lineTo(-0.3, 1.55);
  outline.lineTo(-1.3, 1.55);
  outline.closePath();

  const aperture = new THREE.Path();
  aperture.moveTo(-1.04, -1.29);
  aperture.lineTo(-1.04, 1.29);
  aperture.lineTo(-0.56, 1.29);
  aperture.lineTo(-0.56, -0.79);
  aperture.lineTo(1.04, -0.79);
  aperture.lineTo(1.04, -1.29);
  aperture.closePath();
  outline.holes.push(aperture);

  const extruded = new THREE.ExtrudeGeometry(outline, {
    depth: 0.19, steps: 1, bevelEnabled: true,
    bevelThickness: 0.035, bevelSize: 0.035, bevelSegments: 6, curveSegments: 8,
  });
  extruded.translate(0, 0, -0.095);
  const rim = toCreasedNormals(extruded, Math.PI / 3);
  if (rim !== extruded) extruded.dispose();
  const bridge = new RoundedBoxGeometry(0.26, 0.26, 1.26, 3, 0.038);
  return { rim, bridge };
}

/** A small studio is baked once into a reflection map. No HDR download,
 * realtime area-light passes, contact-shadow pass or fullscreen bloom. */
export function createStudio(renderer: THREE.WebGLRenderer) {
  const room = new THREE.Scene();
  room.background = new THREE.Color("#171b26");
  const geometry = new THREE.PlaneGeometry(1, 1);
  const materials: THREE.MeshBasicMaterial[] = [];
  const addPanel = (position: [number, number, number], size: [number, number], color: string, intensity: number) => {
    const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide });
    const panel = new THREE.Mesh(geometry, material);
    panel.position.set(...position);
    panel.scale.set(size[0], size[1], 1);
    panel.lookAt(0, 0, 0);
    room.add(panel);
    materials.push(material);
  };
  addPanel([-3, 4, 5], [3.8, 6], "#eef6ff", 5);
  addPanel([-4, -1.5, 6], [4, 7], "#d1e6ff", 2.8);
  addPanel([-6, -2.5, 3], [3, 5], "#93a8d0", 2.4);
  addPanel([4, 1, 2], [1.8, 6], "#bddbff", 4);
  addPanel([-4, -1, -2], [2.2, 5], "#8499ff", 5);
  addPanel([1, 4, -4], [4, 2], "#e3d0ff", 8);
  addPanel([0, -4, 3], [4, 1.5], "#8bbcc9", 2);
  const generator = new THREE.PMREMGenerator(renderer);
  const target = generator.fromScene(room, 0.03, 0.1, 30, { size: 256 });
  generator.dispose();
  geometry.dispose();
  materials.forEach((material) => material.dispose());
  return target;
}

export function createMotes() {
  const positions: number[] = [];
  const seeds: number[] = [];
  for (let i = 0; i < 90; i++) {
    const a = i * 2.39996323;
    const radius = 1.75 + ((i * 17) % 29) / 29 * 0.7;
    positions.push(Math.cos(a) * radius, (((i * 13) % 89) / 89 - 0.5) * 4.4, Math.sin(a) * radius * 0.7);
    seeds.push(i / 90);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("aSeed", new THREE.Float32BufferAttribute(seeds, 1));
  return geometry;
}
