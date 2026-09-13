/** The same deformation keeps the sculpture, traces and signals connected.
 * A handful of batched geometries; no noise displacement or postprocessing. */
export const blueprintTransform = /* glsl */ `
  uniform float uTime;
  uniform float uOpen;
  uniform float uReveal;
  vec3 blueprint(vec3 p, float layer) {
    float unfold = smoothstep(0.0, 1.0, clamp(uOpen * 1.6 - layer * 0.1, 0.0, 1.0));
    float arrival = smoothstep(0.0, 1.0, clamp(uReveal * 1.6 - layer * 0.085, 0.0, 1.0));
    float angle = (layer - 3.0) * (0.11 + unfold * 0.25);
    angle += sin(uTime * 0.3 + layer * 0.45) * 0.018;
    float c = cos(angle), s = sin(angle);
    p.xz = mat2(c, -s, s, c) * p.xz;
    p.x += unfold * sin(layer * 0.8) * 0.22;
    p.y += (layer - 3.0) * (0.27 + unfold * 0.28);
    p.y += sin(uTime * 0.55 + layer * 0.7) * (0.016 + unfold * 0.015);
    p.xz *= 1.0 + (1.0 - arrival) * 0.65;
    p.y += (1.0 - arrival) * (layer - 2.5) * 0.5;
    return p;
  }
`;

export const architectureVertex = /* glsl */ `
  ${blueprintTransform}
  attribute float aLayer;
  attribute float aKind;
  attribute vec3 aLocal;
  varying vec3 vLocal;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vKind;
  varying float vLayer;
  void main() {
    vec3 p = blueprint(position, aLayer);
    // Apply the layer's rotation to its normals without the translation.
    vec3 n = blueprint(position + normal, aLayer) - p;
    vNormal = normalize(normalMatrix * n);
    vLocal = aLocal;
    vPosition = p;
    vKind = aKind;
    vLayer = aLayer;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

export const architectureFragment = /* glsl */ `
  uniform vec3 uBody;
  uniform vec3 uAccent;
  uniform vec3 uViolet;
  uniform float uTime;
  varying vec3 vLocal;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vKind;
  varying float vLayer;
  void main() {
    vec3 n = normalize(vNormal);
    float diffuse = max(dot(n, normalize(vec3(-0.4, 0.8, 0.6))), 0.0);
    float rim = pow(1.0 - abs(n.z), 2.5);
    vec3 accent = mix(uAccent, uViolet, clamp(vLayer / 6.0, 0.0, 1.0));
    vec3 base = uBody * (0.55 + diffuse * 0.65);
    base += accent * (0.04 + rim * 0.18);
    vec3 d = abs(vLocal);
    float second = max(min(d.x, d.y), max(min(d.y, d.z), min(d.x, d.z)));
    float edge = smoothstep(0.466, 0.494, second);
    base = mix(base, accent * (0.5 + diffuse * 0.5), edge * 0.8);
    float scan = pow(max(0.0, 1.0 - abs(vPosition.y - sin(uTime * 0.65) * 2.7) * 3.5), 3.0);
    base += accent * scan * 0.22;
    if (vKind > 0.5) {
      base = mix(accent * 0.55, accent, diffuse * 0.7 + 0.3);
      if (vKind > 1.5) base = mix(uBody, accent, 0.18) * (0.6 + diffuse * 0.6);
    }
    gl_FragColor = vec4(base, 1.0);
    #include <colorspace_fragment>
  }
`;

export const traceVertex = /* glsl */ `
  ${blueprintTransform}
  attribute float aLayer;
  varying float vLayer;
  void main() {
    vLayer = aLayer;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(blueprint(position, aLayer), 1.0);
  }
`;
export const traceFragment = /* glsl */ `
  uniform vec3 uAccent;
  uniform vec3 uViolet;
  uniform float uOpen;
  varying float vLayer;
  void main() {
    gl_FragColor = vec4(mix(uAccent, uViolet, vLayer / 6.0), 0.2 + uOpen * 0.2);
    #include <colorspace_fragment>
  }
`;

export const signalVertex = /* glsl */ `
  ${blueprintTransform}
  uniform float uPixelRatio;
  attribute float aLayer;
  attribute float aSeed;
  attribute float aTrail;
  varying float vAlpha;
  varying float vLayer;
  void main() {
    float phase = fract(aSeed + uTime * 0.075 - aTrail * 0.004);
    vec3 p;
    float layer = aLayer;
    if (aLayer < 7.0) {
      // Signals turn four corners on the deck's perimeter.
      float lane = phase * 4.0;
      float f = fract(lane);
      float r = 1.27;
      if (lane < 1.0) p = vec3(mix(-r, r, f), 0.105, -r);
      else if (lane < 2.0) p = vec3(r, 0.105, mix(-r, r, f));
      else if (lane < 3.0) p = vec3(mix(r, -r, f), 0.105, r);
      else p = vec3(-r, 0.105, mix(r, -r, f));
    } else if (aLayer < 8.0) {
      layer = phase * 6.0;
      p = position;
    } else {
      layer = phase * 6.0;
      float angle = aSeed * 37.0 + uTime * 0.08;
      float radius = 1.9 + sin(aSeed * 127.0) * 0.3;
      p = vec3(cos(angle) * radius, 0.0, sin(angle) * radius);
    }
    p = blueprint(p, layer);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = min(12.0, (aTrail < 0.5 ? 48.0 : 23.0) * uPixelRatio / -mv.z);
    vAlpha = (1.0 - aTrail / 7.0) * 0.9;
    vLayer = layer;
    if (aLayer > 7.5) {
      vAlpha *= 0.38;
      gl_PointSize *= 0.6;
    }
  }
`;
export const signalFragment = /* glsl */ `
  uniform vec3 uAccent;
  uniform vec3 uViolet;
  varying float vAlpha;
  varying float vLayer;
  void main() {
    float radius = length(gl_PointCoord - 0.5) * 2.0;
    if (radius > 1.0) discard;
    float alpha = pow(1.0 - radius, 1.6) * vAlpha;
    vec3 color = mix(uAccent, uViolet, vLayer / 6.0);
    gl_FragColor = vec4(mix(color, vec3(1.0), 0.32), alpha);
    #include <colorspace_fragment>
  }
`;
