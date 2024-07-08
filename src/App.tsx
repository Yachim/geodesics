import { Canvas } from "@react-three/fiber"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ParametricGeometry } from "three/addons/geometries/ParametricGeometry.js"
import { ParametersMap, ParametricSurfaceFn, Preset, presets, translateFunction } from "./utils/functions"
import { OrbitControls, Plane, Sphere } from "@react-three/drei"
import { BufferGeometry, DoubleSide, Vector3 } from "three"
import { useStringNumber } from "./utils/stringNumber"
import { findGeodesic, solveGeodesic } from "./utils/math"

const curvePoints = 50
function ThreeScene({
    startU,
    startV,
    endU,
    endV,
    parametricSurface,
    minU,
    maxU,
    minV,
    maxV,
}: {
    parametricSurface: ParametricSurfaceFn
    startU: number
    startV: number
    endU: number
    endV: number
    minU: number
    maxU: number
    minV: number
    maxV: number
}) {
    const startPos = useMemo(() => parametricSurface(startU, startV), [startU, startV, parametricSurface])
    const endPos = useMemo(() => parametricSurface(endU, endV), [endU, endV, parametricSurface])

    const lineRef = useRef<BufferGeometry>(null)
    useEffect(() => {
        lineRef.current!.setFromPoints(
            findGeodesic(parametricSurface, startU, startV, endU, endV, 0.1, 50, 0.25).map(([u, v]) => parametricSurface(u, v))
        )
    }, [startU, startV, endU, endV, parametricSurface])

    return (
        <>
            <ambientLight intensity={Math.PI / 2} />
            <spotLight position={[30, 30, 30]} angle={0.15} penumbra={1} decay={0} intensity={Math.PI} />
            <pointLight position={[-30, -30, -30]} decay={0} intensity={Math.PI} />
            <mesh geometry={new ParametricGeometry((u, v, target) => {
                const out = parametricSurface(minU + u * (maxU - minU), minV + v * (maxV - minV))
                target.x = out.x
                target.y = out.y
                target.z = out.z
            }, 25, 25)}>
                <meshStandardMaterial color="gray" side={DoubleSide} />
            </mesh>
            <Plane args={[100, 100]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                <meshStandardMaterial color="lightblue" side={DoubleSide} transparent opacity={0.5} />
            </Plane>

            <Sphere args={[0.2, 20, 20]} position={startPos}>
                <meshStandardMaterial color="green" />
            </Sphere>
            <Sphere args={[0.2, 20, 20]} position={endPos}>
                <meshStandardMaterial color="red" />
            </Sphere>

            <line>
                <bufferGeometry ref={lineRef} />
                <lineBasicMaterial color="black" />
            </line>
        </>
    )
}

export default function App() {
    const [minU, minUNumber, setMinU] = useStringNumber(0)
    const [maxU, maxUNumber, setMaxU] = useStringNumber(1)
    const [minV, minVNumber, setMinV] = useStringNumber(0)
    const [maxV, maxVNumber, setMaxV] = useStringNumber(1)

    const [parameters, setParameters] = useState<ParametersMap>(new Map())

    const [xFn, setXFn] = useState("")
    const [yFn, setYFn] = useState("")
    const [zFn, setZFn] = useState("")

    const usePreset = useCallback((preset: Preset) => {
        const presetObj = presets[preset]

        setXFn(presetObj.x)
        setYFn(presetObj.y)
        setZFn(presetObj.z)

        setMinU(presetObj.uRange[0].toString())
        setMaxU(presetObj.uRange[1].toString())
        setMinV(presetObj.vRange[0].toString())
        setMaxV(presetObj.vRange[1].toString())
        
        setParameters(presetObj.parameters)
    }, [])
    useEffect(() => usePreset("sphere"), [])

    const parametricSurface = useCallback<ParametricSurfaceFn>((u, v) => new Vector3(
        translateFunction(xFn, parameters)(u, v),
        translateFunction(yFn, parameters)(u, v),
        translateFunction(zFn, parameters)(u, v),
    ), [xFn, yFn, zFn])

    const [startU, startUNumber, setStartU] = useStringNumber(Math.PI / 4)
    const [startV, startVNumber, setStartV] = useStringNumber(0)

    const [endU, endUNumber, setEndU] = useStringNumber(Math.PI / 2)
    const [endV, endVNumber, setEndV] = useStringNumber(-3 * Math.PI / 4)

    return (
        <>
            <div className="absolute right-0 top-0 p-4 flex flex-col gap-2 z-10">
                <label className="flex items-center gap-2">x(u, v) = <input value={xFn} onChange={e => setXFn(e.target.value)} type="text" /></label>
                <label className="flex items-center gap-2">y(u, v) = <input value={yFn} onChange={e => setYFn(e.target.value)} type="text" /></label>
                <label className="flex items-center gap-2">z(u, v) = <input value={zFn} onChange={e => setZFn(e.target.value)} type="text" /></label>

                <label className="flex items-center gap-2">u minimum: <input value={minU} onChange={e => setMinU(e.target.value)} type="text" /></label>
                <label className="flex items-center gap-2">u maximum: <input value={maxU} onChange={e => setMaxU(e.target.value)} type="text" /></label>
                <label className="flex items-center gap-2">v minimum: <input value={minV} onChange={e => setMinV(e.target.value)} type="text" /></label>
                <label className="flex items-center gap-2">v maximum: <input value={maxV} onChange={e => setMaxV(e.target.value)} type="text" /></label>

                <label className="flex items-center gap-2">start u: <input value={startU} onChange={e => setStartU(e.target.value)} type="text" /></label>
                <label className="flex items-center gap-2">start v: <input value={startV} onChange={e => setStartV(e.target.value)} type="text" /></label>
                <label className="flex items-center gap-2">end u: <input value={endU} onChange={e => setEndU(e.target.value)} type="text" /></label>
                <label className="flex items-center gap-2">end v: <input value={endV} onChange={e => setEndV(e.target.value)} type="text" /></label>

                <p>Presets</p>

                <button onClick={() => usePreset("sphere")}>Sphere</button>
                <button onClick={() => usePreset("cylinder")}>Cylinder</button>
            </div>

            <Canvas camera={{position: [0, 10, 10]}} className="w-full h-full">
                <ThreeScene
                    parametricSurface={parametricSurface}
                    startU={startUNumber}
                    startV={startVNumber}
                    endU={endUNumber}
                    endV={endVNumber}
                    minU={minUNumber}
                    maxU={maxUNumber}
                    minV={minVNumber}
                    maxV={maxVNumber}
                />
                <OrbitControls/>
            </Canvas>
        </>
    )
}
