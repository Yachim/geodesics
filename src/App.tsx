import { Canvas } from "@react-three/fiber"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ParametricGeometry } from "three/addons/geometries/ParametricGeometry.js"
import { findParameters, ParametersObj, ParametricSurfaceFn, Preset, presetList, presets, runFunction } from "./utils/functions"
import { OrbitControls, Plane, Sphere } from "@react-three/drei"
import { BufferGeometry, DoubleSide, Vector3 } from "three"
import { useStringNumber } from "./utils/stringNumber"
import { solveGeodesic } from "./utils/math"
import { capitalize } from "./utils/capitalize"

function ThreeScene({
    startU,
    startV,
    uVel,
    vVel,
    parametricSurface,
    minU,
    maxU,
    minV,
    maxV,
    step,
    nSteps,
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
    step: number
    nSteps: number
}) {
    const startPos = useMemo(() => parametricSurface(startU, startV), [startU, startV, parametricSurface])

    const lineRef = useRef<BufferGeometry>(null)
    useEffect(() => {
        lineRef.current!.setFromPoints(
            solveGeodesic(parametricSurface, startU, startV, uVel, vVel, step, nSteps).map(([u, v]) => parametricSurface(u, v))
        )
    }, [startU, startV, uVel, vVel, parametricSurface, step, nSteps])

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

    const [parameters, setParameters] = useState<ParametersObj>({})

    const [xFn, setXFn] = useState("")
    const [yFn, setYFn] = useState("")
    const [zFn, setZFn] = useState("")

    useEffect(() => {
        const parametersList = [...new Set([
            ...findParameters(xFn),
            ...findParameters(yFn),
            ...findParameters(zFn),
        ])]

        setParameters(prev => Object.fromEntries(parametersList.map((k) => 
            [k, prev[k] ?? 0]
        )))
    }, [xFn, yFn, zFn])

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
        runFunction(xFn, parameters, u, v),
        runFunction(yFn, parameters, u, v),
        runFunction(zFn, parameters, u, v),
    ), [xFn, yFn, zFn, parameters])

    const [startU, startUNumber, setStartU] = useStringNumber(Math.PI / 4)
    const [startV, startVNumber, setStartV] = useStringNumber(0)

    const [uVel, uVelNumber, setUVel] = useStringNumber(1)
    const [vVel, vVelNumber, setVVel] = useStringNumber(1)

    const [step, stepNumber, setStep] = useStringNumber(0.05)
    const [nSteps, nStepsNumber, setNSteps] = useStringNumber(50)

    return (
        <>
            <div className="absolute right-0 top-0 p-4 flex flex-col gap-2 z-10 h-full overflow-y-auto">
                <label className="flex items-center gap-2">x(u, v) = <input value={xFn} onChange={e => setXFn(e.target.value)} type="text" /></label>
                <label className="flex items-center gap-2">y(u, v) = <input value={yFn} onChange={e => setYFn(e.target.value)} type="text" /></label>
                <label className="flex items-center gap-2">z(u, v) = <input value={zFn} onChange={e => setZFn(e.target.value)} type="text" /></label>

                <label className="flex items-center gap-2">u minimum: <input value={minU} onChange={e => setMinU(e.target.value)} type="text" /></label>
                <label className="flex items-center gap-2">u maximum: <input value={maxU} onChange={e => setMaxU(e.target.value)} type="text" /></label>
                <label className="flex items-center gap-2">v minimum: <input value={minV} onChange={e => setMinV(e.target.value)} type="text" /></label>
                <label className="flex items-center gap-2">v maximum: <input value={maxV} onChange={e => setMaxV(e.target.value)} type="text" /></label>

                {Object.entries(parameters).map(([k, v], i) => 
                    <label key={`param-${i}`} className="flex items-center gap-2">
                        {k}: <input value={v} onChange={e => setParameters(prev => ({
                            ...prev,
                            [k]: +e.target.value,
                        }))} type="text" />
                    </label>
                )}

                <p className="underline">Path</p>
                <label className="flex items-center gap-2">start u: <input value={startU} onChange={e => setStartU(e.target.value)} type="text" /></label>
                <label className="flex items-center gap-2">start v: <input value={startV} onChange={e => setStartV(e.target.value)} type="text" /></label>
                <label className="flex items-center gap-2">velocity u: <input value={uVel} onChange={e => setUVel(e.target.value)} type="text" /></label>
                <label className="flex items-center gap-2">velocity v: <input value={vVel} onChange={e => setVVel(e.target.value)} type="text" /></label>

                <p className="underline">Numerical Parameters</p>
                <label className="flex items-center gap-2">step: <input value={step} onChange={e => setStep(e.target.value)} type="text" /></label>
                <label className="flex items-center gap-2">n steps: <input value={nSteps} onChange={e => setNSteps(e.target.value)} type="text" /></label>

                <p className="underline">Presets</p>
                {presetList.map((preset, i) => 
                    <button onClick={() => usePreset(preset)} key={`preset-button-${i}`}>{capitalize(preset)}</button>
                )}
            </div>

            <Canvas camera={{position: [0, 10, 10]}} className="w-full h-full">
                <ThreeScene
                    parametricSurface={parametricSurface}
                    startU={startUNumber}
                    startV={startVNumber}
                    uVel={uVelNumber}
                    vVel={vVelNumber}
                    minU={minUNumber}
                    maxU={maxUNumber}
                    minV={minVNumber}
                    maxV={maxVNumber}
                    step={stepNumber}
                    nSteps={nStepsNumber}
                />
                <OrbitControls/>
            </Canvas>
        </>
    )
}
