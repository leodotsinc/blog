/**
 * Hand written GLSL for the hero scene.
 *
 * The blob is an icosahedron whose vertices are pushed along their normal by
 * a domain-warped fbm of 3D simplex noise. Normals are re-derived from two
 * displaced neighbours so the lighting actually follows the deformation
 * instead of the original sphere.
 */

/** Simplex 3D noise — Ian McEwan, Ashima Arts (MIT). */
export const simplexNoise = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`;

export const blobVertex = /* glsl */ `
uniform float uTime;
uniform float uAmp;
uniform float uFreq;
uniform float uPointerAmount;
uniform vec3  uPointerDir;

varying vec3  vNormalW;
varying vec3  vViewDir;
varying float vDistort;

${simplexNoise}

float fbm(vec3 p) {
  float f = 0.0;
  f += 0.55 * snoise(p);
  f += 0.27 * snoise(p * 2.07);
  f += 0.13 * snoise(p * 4.13);
  return f;
}

/* Displacement for a point on the unit sphere. */
float displace(vec3 dir) {
  float t = uTime * 0.16;
  vec3 q = dir * uFreq + vec3(0.0, t, t * 0.4);
  /* domain warp: noise sampling noise gives the liquid, non-repeating look */
  float warp = fbm(q * 0.6 + t * 0.35);
  float d = fbm(q + warp * 0.75);

  /* the cursor pushes a soft bulge out of the surface */
  float prox = 1.0 - clamp(distance(dir, uPointerDir) * 0.85, 0.0, 1.0);
  d += prox * prox * prox * uPointerAmount * 0.9;

  return d * uAmp;
}

void main() {
  vec3 dir = normalize(position);
  float d = displace(dir);
  vec3 displaced = dir * (1.0 + d);

  /* rebuild the normal from two displaced neighbours on the sphere */
  vec3 arb = abs(dir.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 t1 = normalize(cross(dir, arb));
  vec3 t2 = normalize(cross(dir, t1));
  float eps = 0.04;

  vec3 dirA = normalize(dir + t1 * eps);
  vec3 dirB = normalize(dir + t2 * eps);
  vec3 pA = dirA * (1.0 + displace(dirA));
  vec3 pB = dirB * (1.0 + displace(dirB));

  vec3 n = normalize(cross(pA - displaced, pB - displaced));
  if (dot(n, dir) < 0.0) n = -n;

  vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);

  vNormalW = normalize(normalMatrix * n);
  vViewDir = normalize(-mvPosition.xyz);
  vDistort = d;

  gl_Position = projectionMatrix * mvPosition;
}
`;

export const blobFragment = /* glsl */ `
uniform vec3  uColorA;
uniform vec3  uColorB;
uniform vec3  uColorRim;
uniform float uTime;
uniform float uOpacity;
uniform float uIridescence;

varying vec3  vNormalW;
varying vec3  vViewDir;
varying float vDistort;

/* Controlled thin-film ramp: cyan -> violet -> magenta.
   A full rainbow palette here goes green, which fights the brand. */
vec3 iridescent(float t) {
  t = fract(t);
  vec3 cyan   = vec3(0.28, 0.76, 0.95);
  vec3 violet = vec3(0.44, 0.35, 1.00);
  vec3 magenta = vec3(1.00, 0.44, 0.82);
  return t < 0.5
    ? mix(cyan, violet, smoothstep(0.0, 0.5, t))
    : mix(violet, magenta, smoothstep(0.5, 1.0, t));
}

void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(vViewDir);

  float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.6);

  vec3 L = normalize(vec3(0.9, 1.1, 0.75));
  float diff = clamp(dot(N, L), 0.0, 1.0) * 0.8 + 0.2;

  vec3 H = normalize(L + V);
  float spec = pow(clamp(dot(N, H), 0.0, 1.0), 64.0);

  float grad = smoothstep(-0.22, 0.22, vDistort);
  vec3 base = mix(uColorA, uColorB, grad);

  vec3 irid = iridescent(vDistort * 1.35 + fres * 0.45 + uTime * 0.015);

  /* additive keeps the body deep while the edges light up */
  vec3 col = base * diff;
  col += irid * uIridescence * (0.09 + 0.62 * fres);
  col += uColorRim * pow(fres, 1.6) * 0.85;
  col += vec3(1.0) * spec * 0.35;

  gl_FragColor = vec4(col, uOpacity);
  #include <colorspace_fragment>
}
`;

export const particlesVertex = /* glsl */ `
uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;
uniform float uSpin;

attribute float aScale;
attribute float aSeed;

varying float vTwinkle;
varying float vSeed;

void main() {
  vec3 p = position;

  float r = length(p.xz);
  float ang = uTime * uSpin * (0.35 + 0.5 / max(r, 0.8));
  float s = sin(ang);
  float c = cos(ang);
  p.xz = mat2(c, -s, s, c) * p.xz;
  p.y += sin(uTime * 0.45 + aSeed * 11.0) * 0.22;

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = uSize * aScale * uPixelRatio * (1.0 / max(-mvPosition.z, 0.1));

  vTwinkle = 0.35 + 0.65 * pow(abs(sin(uTime * 0.8 + aSeed * 17.0)), 2.0);
  vSeed = aSeed;
}
`;

export const particlesFragment = /* glsl */ `
uniform vec3  uColorA;
uniform vec3  uColorB;
uniform float uOpacity;

varying float vTwinkle;
varying float vSeed;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  float alpha = smoothstep(0.5, 0.05, d);
  alpha *= alpha;

  vec3 col = mix(uColorA, uColorB, vSeed);

  gl_FragColor = vec4(col, alpha * vTwinkle * uOpacity);
  #include <colorspace_fragment>
}
`;
