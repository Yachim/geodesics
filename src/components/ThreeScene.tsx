import { OrbitControls, Plane, Sphere } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { MutableRefObject, useMemo, useRef, useEffect } from "react"
import { Vector3, BufferGeometry, DoubleSide } from "three"
import { OrbitControls as OrbitControlsType, ParametricGeometry } from "three/examples/jsm/Addons.js"
import { ParametricSurfaceFn } from "../utils/functions"
import { uBase, vBase } from "../utils/math"

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

    return (
        <>
            <OrbitControls ref={orbitControlsRef} />
            <ambientLight intensity={Math.PI / 2} />
            <spotLight position={[30, 30, 30]} angle={0.15} penumbra={1} decay={0} intensity={Math.PI} />
            <pointLight position={[-30, -30, -30]} decay={0} intensity={Math.PI} />

            <Plane renderOrder={1} args={[100, 100]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                <meshStandardMaterial color={planeColor} visible={planeOpacity !== 0} side={DoubleSide} transparent opacity={planeOpacity} />
            </Plane>
            <mesh renderOrder={0} geometry={new ParametricGeometry((u, v, target) => {
                const out = parametricSurface(minU + u * (maxU - minU), minV + v * (maxV - minV))
                target.x = out.x
                target.y = out.y
                target.z = out.z
            }, 25, 25)}>
                <meshStandardMaterial color={surfaceColor} side={DoubleSide} />
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
                <meshStandardMaterial color={pointColor} />
            </Sphere>

            <line>
                <bufferGeometry ref={lineRef} />
                <lineBasicMaterial color={pathColor} side={DoubleSide} />
            </line>
        </>
    )
}
