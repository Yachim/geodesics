import { Canvas, useFrame } from "@react-three/fiber"
import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { findParameters, ParametersObj, ParametricSurfaceFn, prepareFunction, Preset, presetList, presets, runFunction } from "./utils/functions"
import { Vector3 } from "three"
import { useStringNumber } from "./utils/stringNumber"
import { geodesicStep, Solver } from "./utils/math"
import { capitalize } from "./utils/capitalize"
import { CustomJXGBoard } from "./components/JXGBoard"
import { ThreeScene } from "./components/ThreeScene"

function AxesScene({
    camPosRef,
    targetRef,
    distance,
    size,
}: {
    camPosRef: RefObject<Vector3>
    targetRef: RefObject<Vector3>
    distance: number
    size: number
}) {
    useFrame(({camera, scene}) => {
        if (!camPosRef.current || !targetRef.current) {
            return
        }

        camera.position.copy(camPosRef.current)
        camera.position.sub(targetRef.current)
        camera.position.setLength(distance)
        camera.lookAt(scene.position)
    })

    return (
        <axesHelper args={[size]} />
    )
}

type State = "playing" | "paused" | "stopped"
export default function App() {
    const [minU, minUNumber, setMinU] = useStringNumber(0)
    const [maxU, maxUNumber, setMaxU] = useStringNumber(1)
    const [minV, minVNumber, setMinV] = useStringNumber(0)
    const [maxV, maxVNumber, setMaxV] = useStringNumber(1)

    const [parameters, setParameters] = useState<ParametersObj>({})

    const [xFn, setXFn] = useState("")
    const xFnPrepared = useMemo(() => prepareFunction(xFn, parameters), [xFn, parameters])
    const [yFn, setYFn] = useState("")
    const yFnPrepared = useMemo(() => prepareFunction(yFn, parameters), [yFn, parameters])
    const [zFn, setZFn] = useState("")
    const zFnPrepared = useMemo(() => prepareFunction(zFn, parameters), [zFn, parameters])

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

    const parametricSurface = useCallback<ParametricSurfaceFn>((u, v) => {
        try {
            return new Vector3(
                runFunction(xFnPrepared, u, v),
                runFunction(yFnPrepared, u, v),
                runFunction(zFnPrepared, u, v),
            )
        }
        catch {
            return new Vector3(NaN, NaN, NaN)
        }
    }, [xFnPrepared, yFnPrepared, zFnPrepared, parameters])

    useEffect(() => {
        parametricSurfaceRef.current = parametricSurface
    }, [parametricSurface])

    const [bgColor, setBgColor] = useState("#dcdfe3")
    const [dirLightColor, setDirLightColor] = useState("#fcd14d")
    const [ambientLightColor, setAmbientLightColor] = useState("#ffffff")

    const [surfaceColor, setSurfaceColor] = useState("#7c9946") // grass
    // const [surfaceColor, setSurfaceColor] = useState("#edc9af") // sand
    // const [surfaceColor, setSurfaceColor] = useState("#836539") // dirt
    // const [surfaceColor, setSurfaceColor] = useState("#1ca3ec") // water?

    const [planeColor, setPlaneColor] = useState("#6fc0d8")
    const [planeOpacity, planeOpacityNumber, setPlaneOpacity] = useStringNumber(0.4)

    const [pointColor, setPointColor] = useState("#00ff00")
    const [pointSize, pointSizeNumber, setPointSize] = useStringNumber(0.1)

    const [uBaseColor, setUBaseColor] = useState("#ff0000")
    const [vBaseColor, setVBaseColor] = useState("#0000ff")
    const [velocityColor, setVelocityColor] = useState("#00ff00")

    const [showVelocity, setShowVelocity] = useState(true)
    const [showBases, setShowBases] = useState(true)

    const [startU, startUNumber, setStartU] = useStringNumber(Math.PI / 4)
    const [startV, startVNumber, setStartV] = useStringNumber(0)
    const [u, setU] = useState(startUNumber)
    const [v, setV] = useState(startVNumber)

    const [startUVel, startUVelNumber, setStartUVel] = useStringNumber(0)
    const [startVVel, startVVelNumber, setStartVVel] = useStringNumber(1)
    const [uVel, setUVel] = useState(startUVelNumber)
    const [vVel, setVVel] = useState(startVVelNumber)

    const [curvePoints, setCurvePoints] = useState<[number, number][]>([])

    const [state, setState] = useState<State>("stopped")

    const reset = useCallback(() => {
        setState("stopped")
        stateRef.current = "stopped"
        setCurvePoints([])

        setU(startUNumber)
        setV(startVNumber)
        currentU.current = startUNumber
        currentV.current = startVNumber

        setUVel(startUVelNumber)
        setVVel(startVVelNumber)
        currentUVel.current = startUVelNumber
        currentVVel.current = startVVelNumber
    }, [startUNumber, startVNumber, startUVel, startVVel])

    useEffect(() => {
        if (state === "stopped") {
            reset()
        }
    }, [state, reset])

    useEffect(() => {
        reset()
    }, [xFnPrepared, yFnPrepared, zFnPrepared, reset])

    const animationFrame = useRef<number>()
    const stateRef = useRef<State>("stopped")
    const parametricSurfaceRef = useRef<ParametricSurfaceFn>()
    const currentU = useRef(startUNumber)
    const currentV = useRef(startVNumber)
    const currentUVel = useRef(startUVelNumber)
    const currentVVel = useRef(startVVelNumber)
    const prevTimestamp = useRef<number>()
    const stepsPerFrame = useRef(1)
    const solver = useRef<Solver>("rk")

    const step = useCallback((timestamp: number) => {
        if (!prevTimestamp.current || stateRef.current !== "playing" || parametricSurfaceRef.current === undefined) {
            prevTimestamp.current = timestamp
            animationFrame.current = requestAnimationFrame(step)
            return
        }

        const steps = stepsPerFrame.current
        const dt = (timestamp - prevTimestamp.current) / 1000 / steps
        let newU = currentU.current
        let newV = currentV.current
        let newUVel = currentUVel.current
        let newVVel = currentVVel.current
        for (let i = 0; i < steps; i++) {
            [[newU, newV], [newUVel, newVVel]] = geodesicStep(parametricSurfaceRef.current, newU, newV, newUVel, newVVel, dt, solver.current)
        }

        setU(newU)
        setV(newV)
        setUVel(newUVel)
        setVVel(newVVel)

        currentU.current = newU
        currentV.current = newV
        currentUVel.current = newUVel
        currentVVel.current = newVVel

        setCurvePoints(prev => [...prev, [newU, newV]])

        prevTimestamp.current = timestamp
        animationFrame.current = requestAnimationFrame(step)
    }, [])

    useEffect(() => {
        animationFrame.current = requestAnimationFrame(step)
        return () => cancelAnimationFrame(animationFrame.current!)
    }, [])
    
    const [view, setView] = useState<"intrinsic" | "extrinsic">("extrinsic")
    const bbox = useMemo(() => {
        const width = maxUNumber - minUNumber
        const height = maxVNumber - minVNumber
        let centerX = minUNumber + width / 2
        let centerY = minVNumber + height / 2

        const size = Math.max(width, height)

        const marginSize = size * 0.05

        return [
            centerX - size / 2 - marginSize,
            centerY + size / 2 + marginSize,
            centerX + size / 2 + marginSize,
            centerY - size / 2 - marginSize,
        ] as [number, number, number, number]
    }, [maxUNumber, minUNumber, maxVNumber, minVNumber])

    const camPosRef = useRef(new Vector3())
    const targetRef = useRef(new Vector3())

    return (
        <>
            <button className="absolute left-2 top-2 px-2 z-10" onClick={() => setView(prev => prev === "intrinsic" ? "extrinsic" : "intrinsic")}>Switch to {view === "intrinsic" ? "extrinsic" : "intrinsic"} view</button>
            <div className="flex w-full h-full">
                {view === "extrinsic" ? <>
                    <Canvas camera={{position: [0, 10, 10]}}>
                        <ThreeScene
                            parametricSurface={parametricSurface}
                            startU={u}
                            startV={v}
                            uVel={uVel}
                            vVel={vVel}
                            minU={minUNumber}
                            maxU={maxUNumber}
                            minV={minVNumber}
                            maxV={maxVNumber}
                            bgColor={bgColor}
                            dirLightColor={dirLightColor}
                            ambientLightColor={ambientLightColor}
                            surfaceColor={surfaceColor}
                            planeColor={planeColor}
                            planeOpacity={planeOpacityNumber}
                            pointColor={pointColor}
                            pointSize={pointSizeNumber}
                            velocityColor={velocityColor}
                            showVelocity={showVelocity}
                            uBaseColor={uBaseColor}
                            vBaseColor={vBaseColor}
                            showBases={showBases}
                            curvePoints={curvePoints.map(([u, v]) => parametricSurface(u, v))}
                            camPosRef={camPosRef}
                            targetRef={targetRef}
                            playing={state === "playing"}
                        />
                    </Canvas>
                    <div className="absolute left-0 bottom-0 w-[150px] h-[150px]">
                        <Canvas className="w-full h-full" camera={{position: [0, 10, 10]}}>
                            <AxesScene
                                camPosRef={camPosRef}
                                targetRef={targetRef}
                                size={5}
                                distance={10}
                            />
                        </Canvas>
                    </div>
                </> : <CustomJXGBoard
                    className="w-full h-full"
                    bbox={bbox}
                    u={u}
                    v={v}
                    uVel={uVel}
                    vVel={vVel}
                    velocityColor={velocityColor}
                    velocityVisible={showVelocity}
                    pointColor={pointColor}
                    curvePoints={curvePoints}
                />}

                <div className="flex flex-col bg-gray-300 border-2 border-text z-10 overflow-y-auto max-h-full overflow-x-hidden flex-shrink-0">
                    <p className="p-1 font-bold text-center">Surface</p>
                    <div className="flex flex-col gap-2 p-2">
                        <label className="flex items-center gap-2">x(u, v) = <input value={xFn} onChange={e => setXFn(e.target.value)} type="text" /></label>
                        <label className="flex items-center gap-2">y(u, v) = <input value={yFn} onChange={e => setYFn(e.target.value)} type="text" /></label>
                        <label className="flex items-center gap-2">z(u, v) = <input value={zFn} onChange={e => setZFn(e.target.value)} type="text" /></label>

                        {Object.entries(parameters).map(([k, v], i) => 
                            <label key={`param-${i}`} className="flex items-center gap-2">
                                {k}: <input value={v} onChange={e => setParameters(prev => ({
                                    ...prev,
                                    [k]: +e.target.value,
                                }))} type="number" />
                            </label>
                        )}

                        <label className="flex items-center gap-2">u minimum: <input value={minU} onChange={e => setMinU(e.target.value)} type="number" /></label>
                        <label className="flex items-center gap-2">u maximum: <input value={maxU} onChange={e => setMaxU(e.target.value)} type="number" /></label>
                        <label className="flex items-center gap-2">v minimum: <input value={minV} onChange={e => setMinV(e.target.value)} type="number" /></label>
                        <label className="flex items-center gap-2">v maximum: <input value={maxV} onChange={e => setMaxV(e.target.value)} type="number" /></label>
                    </div>

                    <p className="p-1 font-bold text-center">Presets</p>
                    <div className="gap-2 grid grid-cols-2 p-2">
                        {presetList.map((preset, i) => 
                            <button onClick={() => usePreset(preset)} key={`preset-button-${i}`}>{capitalize(preset)}</button>
                        )}
                    </div>

                    <p className="p-1 font-bold text-center">Path</p>
                    <div className="flex flex-col gap-2 p-2">
                        <label className="flex items-center gap-2">start u: <input value={startU} onChange={e => setStartU(e.target.value)} type="number" /></label>
                        <label className="flex items-center gap-2">start v: <input value={startV} onChange={e => setStartV(e.target.value)} type="number" /></label>
                        <label className="flex items-center gap-2">velocity u: <input value={startUVel} onChange={e => setStartUVel(e.target.value)} type="number" /></label>
                        <label className="flex items-center gap-2">velocity v: <input value={startVVel} onChange={e => setStartVVel(e.target.value)} type="number" /></label>
                        <label className="flex items-center gap-2">steps per frame: <input onChange={e => stepsPerFrame.current = +e.target.value} type="number" defaultValue={1} /></label>
                        <label className="flex items-center gap-2">solver: <select onChange={e => solver.current = e.target.value as Solver}>
                            <option value="rk">Runge-Kutta</option>
                            <option value="euler">Euler</option>
                        </select></label>
                        {state === "playing" || state === "paused" ?
                            <>
                                <button onClick={() => {
                                    const newValue = state === "playing" ? "paused" : "playing"
                                    setState(newValue)
                                    stateRef.current = newValue
                                }}>{state === "playing" ? "Pause" : "Play"}</button>
                                <button onClick={() => {
                                    setState("stopped")
                                    stateRef.current = "stopped"
                                }}>Stop</button>
                            </>
                        :
                            <button onClick={() => {
                                setState("playing")
                                stateRef.current = "playing"
                            }}>Play</button>
                        }
                    </div>

                    <p className="p-1 font-bold text-center">Cosmetic</p>
                    <div className="flex flex-col gap-2 p-2">
                        <label className="flex items-center gap-2">background color: <input value={bgColor} onChange={e => setBgColor(e.target.value)} type="color" /></label>
                        <label className="flex items-center gap-2">directinal light color: <input value={dirLightColor} onChange={e => setDirLightColor(e.target.value)} type="color" /></label>
                        <label className="flex items-center gap-2">ambient light color: <input value={ambientLightColor} onChange={e => setAmbientLightColor(e.target.value)} type="color" /></label>
                        <label className="flex items-center gap-2">surface color: <input value={surfaceColor} onChange={e => setSurfaceColor(e.target.value)} type="color" /></label>

                        <label className="flex items-center gap-2">plane color: <input value={planeColor} onChange={e => setPlaneColor(e.target.value)} type="color" /></label>
                        <label className="flex items-center gap-2">plane opacity: <input value={planeOpacity} onChange={e => setPlaneOpacity(e.target.value)} type="number" /></label>

                        <label className="flex items-center gap-2">point color: <input value={pointColor} onChange={e => setPointColor(e.target.value)} type="color" /></label>
                        <label className="flex items-center gap-2">point size: <input value={pointSize} onChange={e => setPointSize(e.target.value)} type="number" /></label>

                        <label className="flex items-center gap-2">velocity color: <input value={velocityColor} onChange={e => setVelocityColor(e.target.value)} type="color" /></label>
                        <label className="flex items-center gap-2">show velocity: <input checked={showVelocity} onChange={e => setShowVelocity(e.target.checked)} type="checkbox" /></label>

                        <label className="flex items-center gap-2">u base color: <input value={uBaseColor} onChange={e => setUBaseColor(e.target.value)} type="color" /></label>
                        <label className="flex items-center gap-2">v base color: <input value={vBaseColor} onChange={e => setVBaseColor(e.target.value)} type="color" /></label>
                        <label className="flex items-center gap-2">show bases: <input checked={showBases} onChange={e => setShowBases(e.target.checked)} type="checkbox" /></label>
                    </div>
                </div>
            </div>
        </>
    )
}
