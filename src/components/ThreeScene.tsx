import { OrbitControls, Plane, useGLTF } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { MutableRefObject, useMemo, useRef } from "react"
import { Vector3, DoubleSide, Quaternion, Euler } from "three"
import { OrbitControls as OrbitControlsType } from "three/examples/jsm/Addons.js"
import { ParametricSurfaceFn } from "../utils/functions"
import { uBase, vBase } from "../utils/math"
import { Dust } from "./Dust"
import carPath from "/car.glb?url"
import Trails from "./Trails"
import Terrain from "./Terrain"

const dirLightPos = new Vector3(20, 30, 20)
const surfaceColor = "#7c9946"
const bgColor = "#dcdfe3"
const dirLightColor = "#fcd14d"
const ambientLightColor = "#ffffff"
const planeColor = "#6fc0d8"
const uBaseColor = "#ff0000"
const vBaseColor = "#0000ff"
const velocityColor = "#00ff00"

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
    planeOpacity,
    pointSize,
    showVelocity,
    showBases,
    showParticles,
    curvePoints,
    targetRef,
    camPosRef,
    playing,
    side,
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
    planeOpacity: number
    pointSize: number
    showVelocity: boolean
    showBases: boolean
    showParticles: boolean
    curvePoints: Vector3[]
    targetRef: MutableRefObject<Vector3>
    camPosRef: MutableRefObject<Vector3>
    playing: boolean
    side: number // -1 or 1
}) {
    const startPos = useMemo(() => parametricSurface(startU, startV), [startU, startV, parametricSurface])

    // bases at the point
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
    ), [uVel, vVel, partialU, partialV])
    const velocityMagnitude = useMemo(() => velocity.length(), [velocity])
    const velocityNormalized = useMemo(() => (new Vector3()).copy(velocity).normalize(), [velocity])

    const normal = useMemo(() => partialV.clone().cross(partialU).multiplyScalar(side).normalize(), [partialU, partialV, side])
    const bitangent = useMemo(() => velocityNormalized.clone().cross(normal).normalize(), [velocityNormalized, normal])

    const orbitControlsRef = useRef(null)

    const car = useGLTF(carPath)
    const carRot = useMemo(() => {
        const q1 = new Quaternion()
        q1.setFromUnitVectors(new Vector3(0, 0, 1), velocityNormalized)

        const up = new Vector3(0, 1, 0).applyQuaternion(q1)
        console.log(up)
        const q2 = new Quaternion()
        q2.setFromUnitVectors(up, normal)

        const euler = new Euler().setFromQuaternion(q2.multiply(q1))
        return euler
    }, [velocityNormalized, normal])

    useFrame(({camera}) => {
        const orbitControlsCurrent = orbitControlsRef.current as (OrbitControlsType | null)

        if (orbitControlsCurrent) {
            targetRef.current = orbitControlsCurrent.target
        }
        camPosRef.current = camera.position
    })

    const halfPerpSeparation = useMemo(() => bitangent.clone().multiplyScalar(1.8 * pointSize), [bitangent, pointSize])
    const directionOffset = useMemo(() => velocityNormalized.clone().multiplyScalar(-2.7 * pointSize), [velocityNormalized, pointSize])

    return (
        <>
            <OrbitControls ref={orbitControlsRef} />
            <color attach="background" args={[bgColor]} />

            <ambientLight intensity={Math.PI / 2} color={ambientLightColor} />
            <directionalLight position={dirLightPos} color={dirLightColor} />

            {showParticles &&
                <Dust
                    originPos={startPos.clone().add(directionOffset)}
                    color={surfaceColor}            
                    direction={velocityNormalized.clone().multiplyScalar(-1)}
                    velocity={velocity.length()}
                    normal={normal}
                    density={10}
                    nParticles={500}
                    playing={playing}
                    particleSize={pointSize * 0.5}
                    deviation={pointSize}
                />
            }

            <Plane renderOrder={1} args={[100, 100]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                <meshToonMaterial color={planeColor} visible={planeOpacity !== 0} side={DoubleSide} transparent opacity={planeOpacity} />
            </Plane>
            <Terrain
                parametricSurface={parametricSurface}
                minU={minU}
                maxU={maxU}
                minV={minV}
                maxV={maxV}
                dirLightPos={dirLightPos}
                dirLightColor={dirLightColor}
                ambientLightColor={ambientLightColor}
                surfaceColor={surfaceColor}
            />

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

            <primitive object={car.scene} scale={pointSize} position={startPos} rotation={carRot} up={normal}/>

            {/* FIXME: use tangent 2-space vectors for the separation instead to prevent clipping? */}
            <Trails
                curvePoints={curvePoints}
                halfPerpSeparation={halfPerpSeparation}
                width={400 * pointSize}
            />
        </>
    )
}
