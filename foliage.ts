/**
 * Needle-particle shader.
 *
 * The vertex shader owns the dual-position interpolation and all motion;
 * the fragment shader paints a dark emerald core with a gold / warm-white
 * incandescent rim that the Bloom pass picks up.
 *
 * Colour stays linear here — the post-processing output pass performs the
 * single linear -> sRGB conversion for the whole frame.
 */

export const foliageVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uMorph;
  uniform float uPixelRatio;
  uniform float uSize;

  attribute vec3 aScatter;
  attribute vec3 aTree;
  attribute float aSeed;
  attribute float aSize;
  attribute float aColorMix;

  varying float vColorMix;
  varying float vGlint;

  void main() {
    // Seed-staggered morph: elements assemble in soft waves, not as one block.
    float stagger = clamp((uMorph - aSeed * 0.12) / 0.88, 0.0, 1.0);
    float p = stagger * stagger * (3.0 - 2.0 * stagger);

    vec3 pos = mix(aScatter, aTree, p);

    float phase = aSeed * 6.2831853;
    float t = uTime * (0.55 + aSeed * 0.7);
    vec3 drift = vec3(
      sin(t * 1.27 + phase * 3.1),
      cos(t * 0.93 + phase * 2.3),
      sin(t * 1.09 + phase * 4.7)
    );

    // SCATTERED: broad, weight-free drift.
    pos += drift * ((1.0 - p) * (0.16 + 0.34 * aSeed));

    // Slow swirl while the constellation floats freely.
    float swirl = (1.0 - p) * 0.14 * sin(uTime * 0.24 + aSeed * 3.0);
    float cs = cos(swirl);
    float sn = sin(swirl);
    pos.xz = mat2(cs, sn, -sn, cs) * pos.xz;

    // TREE_SHAPE: microscopic breathing so the silhouette never feels frozen.
    vec3 outward = normalize(pos - vec3(0.0, 1.6, 0.0) + vec3(0.0001));
    pos += outward * (sin(uTime * 1.7 + phase) * 0.014 * p);
    pos += drift * (0.005 * p);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    float perspective = 140.0 / max(0.001, -mv.z);
    gl_PointSize = clamp(uSize * aSize * uPixelRatio * perspective * mix(0.82, 1.0, p), 1.0, 24.0);

    vColorMix = aColorMix;
    vGlint = 0.5 + 0.5 * sin(uTime * 2.1 + phase * 5.0);
  }
`

export const foliageFragmentShader = /* glsl */ `
  precision highp float;

  uniform vec3 uDeep;
  uniform vec3 uMid;
  uniform vec3 uGold;
  uniform vec3 uWarm;

  varying float vColorMix;
  varying float vGlint;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;

    float core = 1.0 - smoothstep(0.0, 0.44, d);
    float halo = 1.0 - smoothstep(0.18, 0.50, d);
    float rim  = smoothstep(0.31, 0.46, d) * (1.0 - smoothstep(0.47, 0.50, d));

    vec3 base = mix(uDeep, uMid, core);
    vec3 color = mix(base, uGold, vColorMix * 0.12);
    // Only the rare gilded tips carry the warm incandescent rim.
    float gilded = vColorMix * vColorMix;
    color += uWarm * rim * gilded * (0.26 + vGlint * 0.08);
    color += uGold * halo * gilded * 0.035;

    float alpha = clamp(core * 0.72 + halo * 0.08 + rim * 0.20, 0.0, 1.0);
    gl_FragColor = vec4(color, alpha);
  }
`
