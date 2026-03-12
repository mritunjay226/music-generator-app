export interface Track {
    id: string;
    url: string;
    prompt: string;
    lyrics: string;
    duration: number;
    gradient: string;
    createdAt: string;
}

export const RADIAL_GRADIENTS = [
    // "Onyx Glow" - Deep charcoal to pure black
    "linear-gradient(-225deg, #231557 0%, #44107A 29%, #FF1361 67%, #FFF800 100%)",
    
    // "Deep Navy" - Sophisticated midnight blue
    "radial-gradient(circle at 50% 50%, #1e293b 0%, #020617 100%)",
    
    // "Warm Espresso" - Minimalist brown/black
    "radial-gradient(circle at 50% 50%, #2a221b 0%, #0c0a09 100%)",
    
    // "Slate Moss" - Muted, expensive green
    "radial-gradient(circle at 50% 50%, #142d27 0%, #020605 100%)",
    
    // "Deep Plum" - Luxury muted purple
    "linear-gradient(-225deg, #473B7B 0%, #3584A7 51%, #30D2BE 100%)",
    
    // "Steel" - Industrial blue-gray
    "radial-gradient(circle at 50% 50%, #334155 0%, #0f172a 100%)",
    
    // "Soft Bone" - For a light-mode minimalist look
    "radial-gradient(circle at 50% 50%, #ffffff 0%, #e5e5e5 100%)",
    
    // "Gunmetal" - High contrast metallic
    "radial-gradient(circle at 20% 20%, #475569 0%, #000000 100%)",
];

export function getRandomGradient(): string {
    const index = Math.floor(Math.random() * RADIAL_GRADIENTS.length);
    return RADIAL_GRADIENTS[index];
}
