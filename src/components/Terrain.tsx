import { ParametricGeometry } from "three/examples/jsm/Addons.js";
import { ParametricSurfaceFn } from "../utils/functions";
import { Color, DoubleSide, ShaderMaterial, Vector3 } from "three";
import { useEffect, useMemo, useRef } from "react";

const vertexShader = `
    varying vec3 vNormal;
    varying vec2 vUv;

    void main() {
        vNormal = normal;
        vUv = uv;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const noise = `
    float rand(float t){
        return fract(sin(t) * 43758.5453);
    }

    float rand2D(vec2 co){
        return fract(sin(dot(co.xy, vec2(12.9898,78.233))) * 43758.5453);
    }

    vec2 randomGrad(vec2 ip) {
        float random = rand2D(ip) * 2.0 * 3.14159265;
        return vec2(cos(random), sin(random));
    }

    float dotGrad(vec2 ip, vec2 p) {
        vec2 grad = randomGrad(ip);
        
        vec2 dp = p - ip;

        return dot(dp, grad);
    }

    float interpolate(float a, float b, float x) {
        return a + smoothstep(0.0, 1.0, x) * (b - a);
    }

    float perlin(vec2 p) {
        vec2 p_fract = fract(p);

        vec2 p1 = p - p_fract;
        vec2 p2 = p1 + vec2(1.0, 0.0);
        vec2 p3 = p1 + vec2(0.0, 1.0);
        vec2 p4 = p1 + vec2(1.0, 1.0);

        float dx1 = dotGrad(p1, p);
        float dx2 = dotGrad(p2, p);
        float ix1 = interpolate(dx1, dx2, p_fract.x);

        float dx3 = dotGrad(p3, p);
        float dx4 = dotGrad(p4, p);
        float ix2 = interpolate(dx3, dx4, p_fract.x);

        return interpolate(ix1, ix2, p_fract.y);
    }

    float fractal(vec2 v, int octaves, float persistence, float lacunarity) {
        float amplitude = 1.0;
        float frequency = 1.0;
        float noise = 0.0;
        float maxValue = 0.0; // Used for normalization

        for (int i = 0; i < octaves; i++) {
            noise += perlin(v * frequency) * amplitude;
            maxValue += amplitude;

            amplitude *= persistence;
            frequency *= lacunarity;
        }

        return noise / maxValue;
    }
`

const fragmentShader = `
    varying vec3 vNormal;
    varying vec2 vUv;

    uniform vec3 uDirectionalLightPosition;
    uniform vec3 uDirectionalLightColor;
    uniform vec3 uAmbientLightColor;
    uniform vec3 uTextureColor;

    ${noise}

    void main() {
        vec3 lightDirection = -normalize(uDirectionalLightPosition);

        float lightIntensity = dot(vNormal, lightDirection);
        if (lightIntensity > 0.4)
            lightIntensity = 0.75;
        else
            lightIntensity = 0.5;

        vec3 diffuseColor = uDirectionalLightColor * lightIntensity;
        vec3 ambientColor = uAmbientLightColor;

        float perlinVal = fractal(vUv * 10.0, 8, 1.0, 2.0);
        vec3 grassColor = uTextureColor + (0.15 * perlinVal);

        // Final color calculation
        vec3 finalColor = (diffuseColor + ambientColor) * grassColor;

        gl_FragColor = vec4(finalColor, 1.0);
    }
`;

export default function Terrain({
    parametricSurface,
    minU,
    maxU,
    minV,
    maxV,
    dirLightColor,
    ambientLightColor,
    surfaceColor,
    dirLightPos,
}: {
    parametricSurface: ParametricSurfaceFn
    minU: number
    maxU: number
    minV: number
    maxV: number
    dirLightColor: string
    ambientLightColor: string
    surfaceColor: string
    dirLightPos: Vector3
}) {
    const uniforms = useMemo(() => ({
        uDirectionalLightPosition: { value: dirLightPos },
        uDirectionalLightColor: { value: new Color(dirLightColor) },
        uAmbientLightColor: { value: new Color(ambientLightColor) },
        uTextureColor: {value: new Color(surfaceColor) },
    }), [])

    const shaderRef = useRef<ShaderMaterial>(null)
    useEffect(() => {
        const current = shaderRef.current
        if (!current) {
            return
        }

        current.uniforms.uDirectionalLightPosition.value.set(dirLightPos)
        current.uniforms.uDirectionalLightColor.value.set(dirLightColor)
        current.uniforms.uAmbientLightColor.value.set(ambientLightColor)
        current.uniforms.uTextureColor.value.set(surfaceColor)
    }, [dirLightColor, ambientLightColor, surfaceColor, dirLightPos])

    return (
        <mesh renderOrder={0} geometry={new ParametricGeometry((u, v, target) => {
            const out = parametricSurface(minU + u * (maxU - minU), minV + v * (maxV - minV))
            target.x = out.x
            target.y = out.y
            target.z = out.z
        }, 25, 25)}>
            <shaderMaterial 
                ref={shaderRef}
                uniforms={uniforms}
                fragmentShader={fragmentShader}
                vertexShader={vertexShader}
                side={DoubleSide}
            />
        </mesh>
    )
}