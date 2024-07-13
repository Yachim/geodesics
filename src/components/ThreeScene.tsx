import { OrbitControls, Plane, Sphere } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { MutableRefObject, useMemo, useRef, useEffect, } from "react"
import { Vector3, BufferGeometry, DoubleSide, Color, ShaderMaterial } from "three"
import { OrbitControls as OrbitControlsType, ParametricGeometry } from "three/examples/jsm/Addons.js"
import { ParametricSurfaceFn } from "../utils/functions"
import { uBase, vBase } from "../utils/math"
import { Dust } from "./Dust"

const dirLightPos = new Vector3(20, 30, 20)

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

export function ThreeScene({
    startU,
    startV,
    uVel,
    vVel,
    parametricSurface,
    minU,
    maxU,
    minV,
    maxV,
    bgColor,
    ambientLightColor,
    dirLightColor,
    surfaceColor,
    planeColor,
    planeOpacity,
    pointColor,
    pointSize,
    pathColor,
    velocityColor,
    uBaseColor,
    vBaseColor,
    showVelocity,
    showBases,
    curvePoints,
    targetRef,
    camPosRef,
    playing,
}: {
    parametricSurface: ParametricSurfaceFn
    startU: number
    startV: number
    uVel: number
    vVel: number
    minU: number
    maxU: number
    minV: number
    maxV: number
    bgColor: string
    ambientLightColor: string
    dirLightColor: string
    surfaceColor: string
    planeColor: string
    planeOpacity: number
    pointColor: string
    pointSize: number
    pathColor: string
    velocityColor: string
    uBaseColor: string
    vBaseColor: string
    showVelocity: boolean
    showBases: boolean
    curvePoints: Vector3[]
    targetRef: MutableRefObject<Vector3>
    camPosRef: MutableRefObject<Vector3>
    playing: boolean
}) {
    const startPos = useMemo(() => parametricSurface(startU, startV), [startU, startV, parametricSurface])

    const lineRef = useRef<BufferGeometry>(null)
    useEffect(() => {
        lineRef.current!.setFromPoints(curvePoints)
    }, [curvePoints])

    // bases at the starting point
    const partialU = useMemo(() => uBase(parametricSurface, startU, startV), [parametricSurface, startU, startV])
    const partialUMagnitude = useMemo(() => partialU.length(), [partialU])
    const partialUNormalized = useMemo(() => (new Vector3()).copy(partialU).normalize(), [partialU])
    
    const partialV = useMemo(() => vBase(parametricSurface, startU, startV), [parametricSurface, startU, startV])
    const partialVMagnitude = useMemo(() => partialV.length(), [partialV])
    const partialVNormalized = useMemo(() => (new Vector3()).copy(partialV).normalize(), [partialV])

    const velocity = useMemo(() => new Vector3(
        uVel * partialU.x + vVel * partialV.x,
        uVel * partialU.y + vVel * partialV.y,
        uVel * partialU.z + vVel * partialV.z,
    ), [startU, startV, uVel, vVel, partialU, partialV])
    const velocityMagnitude = useMemo(() => velocity.length(), [velocity])
    const velocityNormalized = useMemo(() => (new Vector3()).copy(velocity).normalize(), [velocity])

    const orbitControlsRef = useRef(null)

    useFrame(({camera}) => {
        const orbitControlsCurrent = orbitControlsRef.current as (OrbitControlsType | null)

        if (orbitControlsCurrent) {
            targetRef.current = orbitControlsCurrent.target
        }
        camPosRef.current = camera.position
    })

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

        current.uniforms.uDirectionalLightColor.value.set(dirLightColor)
        current.uniforms.uAmbientLightColor.value.set(ambientLightColor)
        current.uniforms.uTextureColor.value.set(surfaceColor)
    }, [dirLightColor, ambientLightColor, surfaceColor])

    return (
        <>
            <OrbitControls ref={orbitControlsRef} />
            <color attach="background" args={[bgColor]} />

            <ambientLight intensity={Math.PI / 2} color={ambientLightColor} />
            <directionalLight position={dirLightPos} color={dirLightColor} />

            <Dust
                originPos={startPos}
                color={surfaceColor}            
                direction={velocityNormalized.clone().multiplyScalar(-1)}
                velocity={velocity.length()}
                normal={partialU.clone().cross(partialV).normalize()}
                density={10}
                nParticles={500}
                playing={playing}
            />

            <Plane renderOrder={1} args={[100, 100]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                <meshToonMaterial color={planeColor} visible={planeOpacity !== 0} side={DoubleSide} transparent opacity={planeOpacity} />
            </Plane>
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

            {showBases &&
                <>
                    {partialUMagnitude !== 0 && 
                        <arrowHelper args={[partialUNormalized, startPos, partialUMagnitude, uBaseColor, 0.3, 0.15]}/>
                    }
                    {partialVMagnitude !== 0 && 
                        <arrowHelper args={[partialVNormalized, startPos, partialVMagnitude, vBaseColor, 0.3, 0.15]}/>
                    }
                </>
            }
            {velocityMagnitude !== 0 && showVelocity &&
                <arrowHelper args={[velocityNormalized, startPos, velocityMagnitude, velocityColor, 0.3, 0.15]}/>
            }

            <Sphere args={[pointSize, 20, 20]} position={startPos}>
                <meshToonMaterial color={pointColor} />
            </Sphere>

            <line>
                <bufferGeometry ref={lineRef} />
                <lineBasicMaterial color={pathColor} side={DoubleSide} />
            </line>
        </>
    )
}
