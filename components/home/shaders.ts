/** Small soft points around the sculpture. The monogram itself uses physically
 * based metal and real bevels, rather than shader-drawn outlines. */
export const moteVertex = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uOpening;
  attribute float aSeed;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    p.y += sin(uTime * 0.2 + aSeed * 20.0) * 0.16;
    p.x += sin(uTime * 0.13 + aSeed * 30.0) * 0.1;
    p *= 1.0 + uOpening * 0.12;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (13.0 + aSeed * 9.0) * uPixelRatio / -mv.z;
    vAlpha = (0.2 + 0.22 * pow(sin(aSeed * 42.0 + uTime * 0.45), 2.0)) * (0.45 + uOpening * 0.55);
  }
`;
export const moteFragment = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    if (r > 1.0) discard;
    gl_FragColor = vec4(uColor, pow(1.0 - r, 2.0) * vAlpha);
    #include <colorspace_fragment>
  }
`;
