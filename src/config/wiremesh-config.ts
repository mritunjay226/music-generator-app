import * as THREE from "three";

export const WIREMESH_THEMES = {
  light: {
    bg: "#FFFFFF",
    c1: new THREE.Color("#A2B2EE"), // Light blue/periwinkle
    c2: new THREE.Color("#F871A0"), // Vibrant pink
    c3: new THREE.Color("#FCA048"), // Vibrant orange
    c4: new THREE.Color("#FCD34D"), // Golden yellow
    dotColor: new THREE.Color("#F871A0"),
    opacity: 0.85,
    dotOpacity: 0.5,
  },
  dark: {
    bg: "#0A0A0F",
    c1: new THREE.Color("#A2B2EE"), // Light blue/periwinkle
    c2: new THREE.Color("#F871A0"), // Vibrant pink
    c3: new THREE.Color("#FCA048"), // Vibrant orange
    c4: new THREE.Color("#FCD34D"), // Golden yellow
    dotColor: new THREE.Color("#F871A0"),
    opacity: 0.85,
    dotOpacity: 0.5,
  },
} as const;

export type ThemeKey = keyof typeof WIREMESH_THEMES;

export const WIREMESH_CONTROLS = {
  width: { value: 0.1, min: 0.1, max: 15.0, step: 0.1 },
  driftSpeed: { value: 1.70, min: 0.0, max: 3.0, step: 0.01 },
  noiseAmount: { value: 0.8, min: 0.0, max: 3.0, step: 0.01 },
  mouseRadius: { value: 5.0, min: 0.0, max: 15.0, step: 0.1 },
  mouseStrength: { value: 4.0, min: -10.0, max: 10.0, step: 0.1 },
};
