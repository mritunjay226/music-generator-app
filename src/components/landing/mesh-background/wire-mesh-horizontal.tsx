import React, { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useControls } from "leva";
import { WIREMESH_THEMES, ThemeKey, WIREMESH_CONTROLS } from "../../../config/wiremesh-config";

// ─── Shaders (GPU-accelerated) ────────────────────────────────────────────────
const SNOISE = `
  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m * m; m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
`;

const COMMON_VERT_MAIN = `
  float norm = position.x;
  float v = position.y;
  float t = uTime * uDrift;

  float wave1 = sin(v * 3.14159 * 2.8 + t * 0.35 + norm * 3.14159 * 2.0) * 3.2;
  float wave2 = sin(v * 3.14159 * 1.4 - t * 0.22 + norm * 3.14159 * 4.0) * 1.6;
  float wave3 = sin(v * 3.14159 * 5.2 + t * 0.18 + norm * 3.14159 * 1.3) * 0.8;

  float n1 = snoise(vec2(v * 1.8 + t * 0.15, norm * 3.2)) * 1.44;
  float n2 = snoise(vec2(v * 3.5 - t * 0.10, norm * 5.0 + 1.7)) * 0.576;

  // For horizontal mesh, norm spreads the lines vertically
  float lineOffset = (norm - 0.5) * uWidth;
  float y = (wave1 + wave2 + wave3 + n1 + n2) * 0.42 + lineOffset;

  float depthSpread = sin(norm * 3.14159) * 1.8;
  float zWave = sin(v * 3.14159 * 2.1 + t * 0.28 + norm * 3.14159 * 3.0) * 0.9;
  
  // Enhanced 3D noise for z-displacement
  float zNoise1 = snoise(vec2(v * 2.2 + t * 0.12 + norm, norm * 4.1)) * uNoise;
  float zNoise2 = snoise(vec2(v * 4.5 - t * 0.08, norm * 6.2)) * (uNoise * 0.5);
  
  float z = (norm - 0.5) * uWidth * 0.5 + depthSpread * 0.4 + zWave * 0.3 + zNoise1 + zNoise2;

  // v spreads the points horizontally
  float x = (v - 0.5) * 35.0;

  vNorm = norm;
  vV = v;

  float hFade = pow(sin(v * 3.14159), 0.5);
  float vFade = 0.25 + 0.75 * pow(sin(norm * 3.14159), 0.4);
  vAlpha = vFade * hFade * uFade;
`;

const LINE_VERT = `
  uniform float uTime;
  uniform float uFade;
  uniform float uWidth;
  uniform float uDrift;
  uniform float uNoise;
  uniform vec2 uMouse;
  uniform float uMouseRadius;
  uniform float uMouseStrength;
  varying float vAlpha;
  varying float vNorm;
  varying float vV;
  ${SNOISE}
  void main() {
    ${COMMON_VERT_MAIN}
    float dist = distance(vec2(x, y), uMouse);
    float mouseEffect = smoothstep(uMouseRadius, 0.0, dist) * uMouseStrength;
    z += mouseEffect;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(x, y, z, 1.0);
  }
`;

const GRADIENT_FN = `
  vec3 getGradient(float t, vec3 c1, vec3 c2, vec3 c3, vec3 c4) {
    t = clamp(t, 0.0, 1.0);
    float s = 1.0 / 3.0;
    if (t < s) {
      return mix(c1, c2, t / s);
    } else if (t < 2.0 * s) {
      return mix(c2, c3, (t - s) / s);
    } else {
      return mix(c3, c4, (t - 2.0 * s) / s);
    }
  }
`;

const LINE_FRAG = `
  uniform vec3 uC1;
  uniform vec3 uC2;
  uniform vec3 uC3;
  uniform vec3 uC4;
  uniform float uOpacity;
  varying float vAlpha;
  varying float vNorm;
  varying float vV;
  ${GRADIENT_FN}
  void main() {
    float finalAlpha = vAlpha * uOpacity;
    if (finalAlpha < 0.005) discard;
    
    // Map gradient diagonally: blue at top-left (vNorm=0, vV=1), yellow at bottom-right (vNorm=1, vV=0)
    float gradT = clamp(vNorm * 0.7 + (1.0 - vV) * 0.3, 0.0, 1.0);
    
    vec3 color = getGradient(gradT, uC1, uC2, uC3, uC4);
    gl_FragColor = vec4(color, finalAlpha);
  }
`;

const DOT_VERT = `
  uniform float uTime;
  uniform float uFade;
  uniform float uSize;
  uniform float uWidth;
  uniform float uDrift;
  uniform float uNoise;
  uniform vec2 uMouse;
  uniform float uMouseRadius;
  uniform float uMouseStrength;
  varying float vAlpha;
  varying float vNorm;
  varying float vV;
  ${SNOISE}
  void main() {
    ${COMMON_VERT_MAIN}
    float dist = distance(vec2(x, y), uMouse);
    float mouseEffect = smoothstep(uMouseRadius, 0.0, dist) * uMouseStrength;
    z += mouseEffect;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(x, y, z, 1.0);
    gl_PointSize = uSize;
  }
`;

const DOT_FRAG = `
  uniform vec3 uC1;
  uniform vec3 uC2;
  uniform vec3 uC3;
  uniform vec3 uC4;
  uniform float uOpacity;
  varying float vAlpha;
  varying float vNorm;
  varying float vV;
  ${GRADIENT_FN}
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float finalAlpha = vAlpha * uOpacity;
    if (d > 0.5 || finalAlpha < 0.005) discard;
    float a = smoothstep(0.5, 0.3, d) * finalAlpha;
    
    // Map gradient diagonally: blue at top-left (vNorm=0, vV=1), yellow at bottom-right (vNorm=1, vV=0)
    float gradT = clamp(vNorm * 0.7 + (1.0 - vV) * 0.3, 0.0, 1.0);
    
    vec3 color = getGradient(gradT, uC1, uC2, uC3, uC4);
    gl_FragColor = vec4(color, a);
  }
`;

// ─── Config ───────────────────────────────────────────────────────────────────
const LINE_COUNT = 180;   // horizontal lines sweeping vertically
const HORIZ_SEGS = 300;   // horizontal resolution per line
const DOT_EVERY = 12;    // place a dot every N segments

// ─── Build static geometry (positions computed in shader) ─────────────────────
function buildLineGeo() {
  const totalPts = LINE_COUNT * HORIZ_SEGS * 2;
  const positions = new Float32Array(totalPts * 3);
  let i = 0;
  for (let line = 0; line < LINE_COUNT; line++) {
    const norm = line / (LINE_COUNT - 1);
    for (let seg = 0; seg < HORIZ_SEGS; seg++) {
      const v0 = seg / HORIZ_SEGS;
      const v1 = (seg + 1) / HORIZ_SEGS;
      positions[i++] = norm; positions[i++] = v0; positions[i++] = 0;
      positions[i++] = norm; positions[i++] = v1; positions[i++] = 0;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return geo;
}

function buildDotGeo() {
  const dotsPerLine = Math.floor(HORIZ_SEGS / DOT_EVERY);
  const totalDots = LINE_COUNT * dotsPerLine;
  const positions = new Float32Array(totalDots * 3);
  let i = 0;
  for (let line = 0; line < LINE_COUNT; line++) {
    const norm = line / (LINE_COUNT - 1);
    for (let seg = 0; seg < HORIZ_SEGS; seg += DOT_EVERY) {
      const v = seg / HORIZ_SEGS;
      positions[i++] = norm; positions[i++] = v; positions[i++] = 0;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return geo;
}

// ─── Main mesh component ──────────────────────────────────────────────────────
export function WireMeshHorizontal({ theme }: { theme: ThemeKey }) {
  const cfg = WIREMESH_THEMES[theme];

  const { width, driftSpeed, noiseAmount, mouseRadius, mouseStrength } = useControls("WireMesh", WIREMESH_CONTROLS);

  const lineMatRef = useRef<THREE.ShaderMaterial>(null);
  const dotMatRef = useRef<THREE.ShaderMaterial>(null);
  const lineGeo = useMemo(() => buildLineGeo(), []);
  const dotGeo = useMemo(() => buildDotGeo(), []);

  const lineUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uFade: { value: 0 },
    uC1: { value: cfg.c1.clone() },
    uC2: { value: cfg.c2.clone() },
    uC3: { value: cfg.c3.clone() },
    uC4: { value: cfg.c4.clone() },
    uOpacity: { value: cfg.opacity },
    uWidth: { value: width },
    uDrift: { value: driftSpeed },
    uNoise: { value: noiseAmount },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uMouseRadius: { value: mouseRadius },
    uMouseStrength: { value: mouseStrength },
  }), []);

  const dotUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uFade: { value: 0 },
    uC1: { value: cfg.c1.clone() },
    uC2: { value: cfg.c2.clone() },
    uC3: { value: cfg.c3.clone() },
    uC4: { value: cfg.c4.clone() },
    uOpacity: { value: cfg.dotOpacity },
    uSize: { value: 2.5 },
    uWidth: { value: width },
    uDrift: { value: driftSpeed },
    uNoise: { value: noiseAmount },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uMouseRadius: { value: mouseRadius },
    uMouseStrength: { value: mouseStrength },
  }), []);

  // Fade-in on mount
  const fadeRef = useRef(0);

  useEffect(() => {
    fadeRef.current = 0;
    if (lineMatRef.current) lineMatRef.current.uniforms.uFade.value = 0;
    if (dotMatRef.current) dotMatRef.current.uniforms.uFade.value = 0;
  }, [theme]);

  // Update static uniforms when config changes
  useEffect(() => {
    if (lineMatRef.current) {
      lineMatRef.current.uniforms.uC1.value.copy(cfg.c1);
      lineMatRef.current.uniforms.uC2.value.copy(cfg.c2);
      lineMatRef.current.uniforms.uC3.value.copy(cfg.c3);
      lineMatRef.current.uniforms.uC4.value.copy(cfg.c4);
      lineMatRef.current.uniforms.uOpacity.value = cfg.opacity;
      lineMatRef.current.uniforms.uWidth.value = width;
      lineMatRef.current.uniforms.uDrift.value = driftSpeed;
      lineMatRef.current.uniforms.uNoise.value = noiseAmount;
      lineMatRef.current.uniforms.uMouseRadius.value = mouseRadius;
      lineMatRef.current.uniforms.uMouseStrength.value = mouseStrength;
    }
    if (dotMatRef.current) {
      dotMatRef.current.uniforms.uC1.value.copy(cfg.c1);
      dotMatRef.current.uniforms.uC2.value.copy(cfg.c2);
      dotMatRef.current.uniforms.uC3.value.copy(cfg.c3);
      dotMatRef.current.uniforms.uC4.value.copy(cfg.c4);
      dotMatRef.current.uniforms.uOpacity.value = cfg.dotOpacity;
      dotMatRef.current.uniforms.uWidth.value = width;
      dotMatRef.current.uniforms.uDrift.value = driftSpeed;
      dotMatRef.current.uniforms.uNoise.value = noiseAmount;
      dotMatRef.current.uniforms.uMouseRadius.value = mouseRadius;
      dotMatRef.current.uniforms.uMouseStrength.value = mouseStrength;
    }
  }, [cfg, width, driftSpeed, noiseAmount, mouseRadius, mouseStrength]);

  const mousePos = useRef(new THREE.Vector2(0, 0));

  useFrame(({ clock, pointer, viewport }) => {
    const t = clock.elapsedTime;

    // Smooth fade in
    fadeRef.current = Math.min(1, fadeRef.current + 0.015);
    const eased = 1 - Math.pow(1 - fadeRef.current, 3);

    // Smooth mouse tracking
    const targetX = pointer.x * viewport.width / 2;
    const targetY = pointer.y * viewport.height / 2;
    mousePos.current.x = THREE.MathUtils.lerp(mousePos.current.x, targetX, 0.05);
    mousePos.current.y = THREE.MathUtils.lerp(mousePos.current.y, targetY, 0.05);

    if (lineMatRef.current) {
      lineMatRef.current.uniforms.uTime.value = t;
      lineMatRef.current.uniforms.uFade.value = eased;
      lineMatRef.current.uniforms.uMouse.value.copy(mousePos.current);
    }
    if (dotMatRef.current) {
      dotMatRef.current.uniforms.uTime.value = t;
      dotMatRef.current.uniforms.uFade.value = eased;
      dotMatRef.current.uniforms.uMouse.value.copy(mousePos.current);
    }
  });

  return (
    <>
      <group>
        {/* Wire lines */}
        <lineSegments geometry={lineGeo}>
          <shaderMaterial
            ref={lineMatRef}
            vertexShader={LINE_VERT}
            fragmentShader={LINE_FRAG}
            uniforms={lineUniforms}
            transparent
            depthWrite={false}
          />
        </lineSegments>

        {/* Dots at intersections */}
        <points geometry={dotGeo}>
          <shaderMaterial
            ref={dotMatRef}
            vertexShader={DOT_VERT}
            fragmentShader={DOT_FRAG}
            uniforms={dotUniforms}
            transparent
            depthWrite={false}
          />
        </points>
      </group>
    </>
  );
}

// ─── Camera parallax ──────────────────────────────────────────────────────────
function CameraRig() {
  const mouse = useRef({ x: 0, y: 0 });
  const smooth = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useFrame(({ camera, clock }) => {
    const t = clock.elapsedTime;

    // Ambient drift
    const ambientX = Math.sin(t * 0.2) * 0.5;
    const ambientY = Math.cos(t * 0.15) * 0.3;

    smooth.current.x += (mouse.current.x + ambientX - smooth.current.x) * 0.032;
    smooth.current.y += (mouse.current.y + ambientY - smooth.current.y) * 0.032;

    camera.position.x = smooth.current.x * 1.5;
    camera.position.y = smooth.current.y * 0.6;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

export default function WireMeshHorizontalBackground({ theme }: { theme: ThemeKey }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 18], fov: 42 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ position: "absolute", inset: 0, zIndex: 0 }}
    >
      <CameraRig />
      <WireMeshHorizontal key={theme} theme={theme} />
    </Canvas>
  );
}
