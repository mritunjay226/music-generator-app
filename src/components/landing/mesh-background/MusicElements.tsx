import React, { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useControls } from "leva";
import { WIREMESH_CONTROLS, WIREMESH_THEMES, ThemeKey } from "../../../config/wiremesh-config";

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

const COMMON_VERT_MAIN_VERTICAL = `
  float t = uTime * uDrift;

  float wave1 = sin(v * 3.14159 * 2.8 + t * 0.35 + norm * 3.14159 * 2.0) * 3.2;
  float wave2 = sin(v * 3.14159 * 1.4 - t * 0.22 + norm * 3.14159 * 4.0) * 1.6;
  float wave3 = sin(v * 3.14159 * 5.2 + t * 0.18 + norm * 3.14159 * 1.3) * 0.8;

  float n1 = snoise(vec2(v * 1.8 + t * 0.15, norm * 3.2)) * 1.44;
  float n2 = snoise(vec2(v * 3.5 - t * 0.10, norm * 5.0 + 1.7)) * 0.576;

  float lineOffset = (norm - 0.5) * uWidth;
  float x = (wave1 + wave2 + wave3 + n1 + n2) * 0.42 + lineOffset;

  float depthSpread = sin(norm * 3.14159) * 1.8;
  float zWave = sin(v * 3.14159 * 2.1 + t * 0.28 + norm * 3.14159 * 3.0) * 0.9;
  
  float zNoise1 = snoise(vec2(v * 2.2 + t * 0.12 + norm, norm * 4.1)) * uNoise;
  float zNoise2 = snoise(vec2(v * 4.5 - t * 0.08, norm * 6.2)) * (uNoise * 0.5);
  
  float z = (norm - 0.5) * uWidth * 0.5 + depthSpread * 0.4 + zWave * 0.3 + zNoise1 + zNoise2 + 0.8;

  float y = (v - 0.5) * 22.0;

  float vFade = pow(sin(v * 3.14159), 0.5);
  float hFade = 0.25 + 0.75 * pow(sin(norm * 3.14159), 0.4);
  vAlpha = vFade * hFade * uFade;
`;

const COMMON_VERT_MAIN_HORIZONTAL = `
  float t = uTime * uDrift;

  float wave1 = sin(v * 3.14159 * 2.8 + t * 0.35 + norm * 3.14159 * 2.0) * 3.2;
  float wave2 = sin(v * 3.14159 * 1.4 - t * 0.22 + norm * 3.14159 * 4.0) * 1.6;
  float wave3 = sin(v * 3.14159 * 5.2 + t * 0.18 + norm * 3.14159 * 1.3) * 0.8;

  float n1 = snoise(vec2(v * 1.8 + t * 0.15, norm * 3.2)) * 1.44;
  float n2 = snoise(vec2(v * 3.5 - t * 0.10, norm * 5.0 + 1.7)) * 0.576;

  float lineOffset = (norm - 0.5) * uWidth;
  float y = (wave1 + wave2 + wave3 + n1 + n2) * 0.42 + lineOffset;

  float depthSpread = sin(norm * 3.14159) * 1.8;
  float zWave = sin(v * 3.14159 * 2.1 + t * 0.28 + norm * 3.14159 * 3.0) * 0.9;
  
  float zNoise1 = snoise(vec2(v * 2.2 + t * 0.12 + norm, norm * 4.1)) * uNoise;
  float zNoise2 = snoise(vec2(v * 4.5 - t * 0.08, norm * 6.2)) * (uNoise * 0.5);
  
  float z = (norm - 0.5) * uWidth * 0.5 + depthSpread * 0.4 + zWave * 0.3 + zNoise1 + zNoise2 + 0.8;

  float x = (v - 0.5) * 35.0;

  float hFade = pow(sin(v * 3.14159), 0.5);
  float vFade = 0.25 + 0.75 * pow(sin(norm * 3.14159), 0.4);
  vAlpha = vFade * hFade * uFade;
`;

const VERTEX_SHADER = `
  uniform float uTime;
  uniform float uFade;
  uniform float uWidth;
  uniform float uDrift;
  uniform float uNoise;
  uniform vec2 uMouse;
  uniform float uMouseRadius;
  uniform float uMouseStrength;
  
  attribute float instanceNorm;
  attribute float instanceV;
  attribute float instanceType;
  
  varying float vAlpha;
  varying float vType;
  varying vec2 vUv;
  varying float vNorm;
  varying float vV;
  
  ${SNOISE}
  
  void main() {
    vUv = uv;
    vType = instanceType;
    
    float norm = instanceNorm;
    float v = fract(instanceV - uTime * 0.05);
    
    vNorm = norm;
    vV = v;
    
    // INSERT_COMMON_VERT_MAIN
    
    float dist = distance(vec2(x, y), uMouse);
    float mouseEffect = smoothstep(uMouseRadius, 0.0, dist) * uMouseStrength;
    z += mouseEffect;
    
    // add local plane position
    vec3 finalPos = vec3(x, y, z) + position;
    
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(finalPos, 1.0);
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

const FRAGMENT_SHADER = `
  uniform sampler2D uTex0;
  uniform sampler2D uTex1;
  uniform sampler2D uTex2;
  uniform sampler2D uTex3;
  uniform float uOpacity;
  
  uniform vec3 uC1;
  uniform vec3 uC2;
  uniform vec3 uC3;
  uniform vec3 uC4;
  
  varying float vAlpha;
  varying float vType;
  varying vec2 vUv;
  varying float vNorm;
  varying float vV;
  
  ${GRADIENT_FN}
  
  void main() {
    vec4 texColor;
    if (vType < 0.5) {
      texColor = texture2D(uTex0, vUv);
    } else if (vType < 1.5) {
      texColor = texture2D(uTex1, vUv);
    } else if (vType < 2.5) {
      texColor = texture2D(uTex2, vUv);
    } else {
      texColor = texture2D(uTex3, vUv);
    }
    
    float finalAlpha = texColor.a * vAlpha * uOpacity;
    if (finalAlpha < 0.01) discard;
    
    float gradT = clamp(vNorm * 0.7 + (1.0 - vV) * 0.3, 0.0, 1.0);
    vec3 color = getGradient(gradT, uC1, uC2, uC3, uC4);
    
    gl_FragColor = vec4(texColor.rgb * color, finalAlpha);
  }
`;

const SVGS = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10v3"/><path d="M6 6v11"/><path d="M10 3v18"/><path d="M14 8v7"/><path d="M18 5v13"/><path d="M22 10v3"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>'
];

function createIconTexture(svgString: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);

  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0);
    texture.needsUpdate = true;
  };
  img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svgString);

  return texture;
}

export function MusicElements({ theme, direction = "vertical" }: { theme: ThemeKey, direction?: "vertical" | "horizontal" }) {
  const cfg = WIREMESH_THEMES[theme];
  const { width, driftSpeed, noiseAmount, mouseRadius, mouseStrength } = useControls("WireMesh", WIREMESH_CONTROLS);

  const matRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const fadeRef = useRef(0);
  const mousePos = useRef(new THREE.Vector2(0, 0));

  const textures = useMemo(() => SVGS.map(createIconTexture), []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uFade: { value: 0 },
    uWidth: { value: width },
    uDrift: { value: driftSpeed },
    uNoise: { value: noiseAmount },
    uOpacity: { value: cfg.opacity },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uMouseRadius: { value: mouseRadius },
    uMouseStrength: { value: mouseStrength },
    uTex0: { value: textures[0] },
    uTex1: { value: textures[1] },
    uTex2: { value: textures[2] },
    uTex3: { value: textures[3] },
    uC1: { value: cfg.c1.clone() },
    uC2: { value: cfg.c2.clone() },
    uC3: { value: cfg.c3.clone() },
    uC4: { value: cfg.c4.clone() },
  }), []);

  const vertexShader = useMemo(() => {
    const common = direction === "vertical" ? COMMON_VERT_MAIN_VERTICAL : COMMON_VERT_MAIN_HORIZONTAL;
    return VERTEX_SHADER.replace("// INSERT_COMMON_VERT_MAIN", common);
  }, [direction]);

  const COUNT = 12;

  useEffect(() => {
    if (!meshRef.current) return;

    const norms = new Float32Array(COUNT);
    const vs = new Float32Array(COUNT);
    const types = new Float32Array(COUNT);

    const dummy = new THREE.Object3D();

    for (let i = 0; i < COUNT; i++) {
      // Random position on the mesh
      norms[i] = Math.random();
      vs[i] = Math.random();
      types[i] = Math.floor(Math.random() * 4);

      // Random scale and rotation
      const scale = 0.4 + Math.random() * 0.4;
      dummy.scale.set(scale, scale, scale);
      dummy.rotation.z = (Math.random() - 0.5) * 0.5;
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.geometry.setAttribute('instanceNorm', new THREE.InstancedBufferAttribute(norms, 1));
    meshRef.current.geometry.setAttribute('instanceV', new THREE.InstancedBufferAttribute(vs, 1));
    meshRef.current.geometry.setAttribute('instanceType', new THREE.InstancedBufferAttribute(types, 1));
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [COUNT]);

  useEffect(() => {
    fadeRef.current = 0;
    if (matRef.current) matRef.current.uniforms.uFade.value = 0;
  }, [theme]);

  useEffect(() => {
    if (matRef.current) {
      matRef.current.uniforms.uOpacity.value = cfg.opacity;
      matRef.current.uniforms.uWidth.value = width;
      matRef.current.uniforms.uDrift.value = driftSpeed;
      matRef.current.uniforms.uNoise.value = noiseAmount;
      matRef.current.uniforms.uMouseRadius.value = mouseRadius;
      matRef.current.uniforms.uMouseStrength.value = mouseStrength;
      matRef.current.uniforms.uC1.value.copy(cfg.c1);
      matRef.current.uniforms.uC2.value.copy(cfg.c2);
      matRef.current.uniforms.uC3.value.copy(cfg.c3);
      matRef.current.uniforms.uC4.value.copy(cfg.c4);
    }
  }, [cfg, width, driftSpeed, noiseAmount, mouseRadius, mouseStrength]);

  useFrame(({ clock, pointer, viewport }) => {
    const t = clock.elapsedTime;

    fadeRef.current = Math.min(1, fadeRef.current + 0.015);
    const eased = 1 - Math.pow(1 - fadeRef.current, 3);

    const targetX = pointer.x * viewport.width / 2;
    const targetY = pointer.y * viewport.height / 2;
    mousePos.current.x = THREE.MathUtils.lerp(mousePos.current.x, targetX, 0.05);
    mousePos.current.y = THREE.MathUtils.lerp(mousePos.current.y, targetY, 0.05);

    if (matRef.current) {
      matRef.current.uniforms.uTime.value = t;
      matRef.current.uniforms.uFade.value = eased;
      matRef.current.uniforms.uMouse.value.copy(mousePos.current);
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]}>
      <planeGeometry args={[0.5, 0.5]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={FRAGMENT_SHADER}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  );
}
