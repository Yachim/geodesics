import { Canvas, useFrame } from "@react-three/fiber"
import { MutableRefObject, RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ParametricGeometry } from "three/addons/geometries/ParametricGeometry.js"
import { findParameters, ParametersObj, ParametricSurfaceFn, Preset, presetList, presets, runFunction } from "./utils/functions"
import { OrbitControls, Plane, Sphere } from "@react-three/drei"
import { BufferGeometry, DoubleSide, Vector3 } from "three"
import { useStringNumber } from "./utils/stringNumber"
import { solveGeodesic, uBase, vBase } from "./utils/math"
import { capitalize } from "./utils/capitalize"
import { animated, easings, useSpring } from "@react-spring/three"
import { CustomJXGBoard } from "./components/JXGBoard"
import { OrbitControls as OrbitControlsType } from "three/examples/jsm/Addons.js"

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
    surfaceColor,
    surfaceOpacity,
    planeColor,
    planeOpacity,
    pointColor,
    pointOpacity,
    pathColor,
    pathOpacity,
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
    surfaceOpacity: number
    planeColor: string
    planeOpacity: number
    pointColor: string
    pointOpacity: number
    pathColor: string
    pathOpacity: number
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

    const {
        currentSurfaceColor,
        currentSurfaceOpacity,
        currentPlaneColor,
        currentPlaneOpacity,
        currentPointColor,
        currentPointOpacity,
        currentPathColor,
        currentPathOpacity,
    } = useSpring({
        currentSurfaceColor: surfaceColor,
        currentSurfaceOpacity: surfaceOpacity,
        currentPlaneColor: planeColor,
        currentPlaneOpacity: planeOpacity,
        currentPointColor: pointColor,
        currentPointOpacity: pointOpacity,
        currentPathColor: pathColor,
        currentPathOpacity: pathOpacity,
        config: {
            duration: 500,
            easings: easings.easeInCubic,
        },
    })

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
            <mesh geometry={new ParametricGeometry((u, v, target) => {
                const out = parametricSurface(minU + u * (maxU - minU), minV + v * (maxV - minV))
                target.x = out.x
                target.y = out.y
                target.z = out.z
            }, 25, 25)}>
                <animated.meshStandardMaterial color={currentSurfaceColor} visible={currentSurfaceOpacity.to(val => val !== 0)} side={DoubleSide} transparent opacity={currentSurfaceOpacity} />
            </mesh>
            <Plane args={[100, 100]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                <animated.meshStandardMaterial color={currentPlaneColor} visible={currentPlaneOpacity.to(val => val !== 0)} side={DoubleSide} transparent opacity={currentPlaneOpacity} />
            </Plane>

            {velocityMagnitude !== 0 && showVelocity &&
                <arrowHelper args={[velocityNormalized, startPos, velocityMagnitude, velocityColor, 0.3, 0.15]}/>
            }
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

            <Sphere args={[0.2, 20, 20]} position={startPos}>
                <animated.meshStandardMaterial color={currentPointColor} visible={currentPointOpacity.to(val => val !== 0)} transparent opacity={currentPointOpacity} />
            </Sphere>

            <line>
                <bufferGeometry ref={lineRef} />
                <animated.lineBasicMaterial color={currentPathColor} side={DoubleSide} visible={currentPathOpacity.to(val => val !== 0)} transparent opacity={currentPathOpacity} />
            </line>
        </>
    )
}

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

    const parametricSurface = useCallback<ParametricSurfaceFn>((u, v) => {
        try {
            return new Vector3(
                runFunction(xFn, parameters, u, v),
                runFunction(yFn, parameters, u, v),
                runFunction(zFn, parameters, u, v),
            )
        }
        catch {
            return new Vector3(NaN, NaN, NaN)
        }
    }, [xFn, yFn, zFn, parameters])

    const [startU, startUNumber, setStartU] = useStringNumber(Math.PI / 4)
    const [startV, startVNumber, setStartV] = useStringNumber(0)

    const [uVel, uVelNumber, setUVel] = useStringNumber(0)
    const [vVel, vVelNumber, setVVel] = useStringNumber(1)

    const [step, stepNumber, setStep] = useStringNumber(0.01)
    const [nSteps, nStepsNumber, setNSteps] = useStringNumber(5000)
    const [maxLength, maxLengthNumber, setMaxLength] = useStringNumber(32, 0)

    const [surfaceColor, setSurfaceColor] = useState("#aaaaaa")
    const [surfaceOpacity, surfaceOpacityNumber, setSurfaceOpacity] = useStringNumber(1)

    const [planeColor, setPlaneColor] = useState("#6fc0d8")
    const [planeOpacity, planeOpacityNumber, setPlaneOpacity] = useStringNumber(0.5)

    const [pointColor, setPointColor] = useState("#00ff00")
    const [pointOpacity, pointOpacityNumber, setPointOpacity] = useStringNumber(1)

    const [pathColor, setPathColor] = useState("#000000")
    const [pathOpacity, pathOpacityNumber, setPathOpacity] = useStringNumber(1)

    const [velocityColor, setVelocityColor] = useState("#ff0000")
    const [uBaseColor, setUBaseColor] = useState("#ffff00")
    const [vBaseColor, setVBaseColor] = useState("#00ff00")

    const [showVelocity, setShowVelocity] = useState(true)
    const [showBases, setShowBases] = useState(true)

    const [curvePoints, setCurvePoints] = useState<[number, number][]>([])
    const getCurvePoints = useCallback(() =>
        setCurvePoints(solveGeodesic(parametricSurface, startUNumber, startVNumber, uVelNumber, vVelNumber, stepNumber, nStepsNumber, maxLengthNumber)),
    [parametricSurface, startUNumber, startVNumber, uVelNumber, vVelNumber, stepNumber, nStepsNumber, maxLength])

    const clearCurve = useCallback(() => {
        setCurvePoints([])
    }, [])

    useEffect(() => {
        clearCurve()
    }, [xFn, yFn, zFn])
    
    const [view, setView] = useState<"intrinsic" | "extrinsic">("extrinsic")
    const bbox: [number, number, number, number] = useMemo(() => {
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
        ]
    }, [maxUNumber, minUNumber, maxVNumber, minVNumber, view])

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
                            startU={startUNumber}
                            startV={startVNumber}
                            uVel={uVelNumber}
                            vVel={vVelNumber}
                            minU={minUNumber}
                            maxU={maxUNumber}
                            minV={minVNumber}
                            maxV={maxVNumber}
                            surfaceColor={surfaceColor}
                            surfaceOpacity={surfaceOpacityNumber}
                            planeColor={planeColor}
                            planeOpacity={planeOpacityNumber}
                            pointColor={pointColor}
                            pointOpacity={pointOpacityNumber}
                            pathColor={pathColor}
                            pathOpacity={pathOpacityNumber}
                            velocityColor={velocityColor}
                            showVelocity={showVelocity}
                            uBaseColor={uBaseColor}
                            vBaseColor={vBaseColor}
                            showBases={showBases}
                            curvePoints={curvePoints.map(([u, v]) => parametricSurface(u, v))}
                            camPosRef={camPosRef}
                            targetRef={targetRef}
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
                </> : <CustomJXGBoard className="w-full h-full" id="intrinsic-view" bbox={bbox} initFn={board => {
                    const point = board.create("point", [startUNumber, startVNumber], {
                        name: "",
                        color: pointColor,
                    })
                    board.create("arrow", [point, [startUNumber + uVelNumber, startVNumber + vVelNumber]], {
                        color: velocityColor,
                    })

                    board.create("curve", [curvePoints.map(([u]) => u), curvePoints.map(([_, v]) => v)], {
                        strokeColor: pathColor,
                    })
                }}/>}

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
                                }))} type="text" />
                            </label>
                        )}

                        <label className="flex items-center gap-2">u minimum: <input value={minU} onChange={e => setMinU(e.target.value)} type="text" /></label>
                        <label className="flex items-center gap-2">u maximum: <input value={maxU} onChange={e => setMaxU(e.target.value)} type="text" /></label>
                        <label className="flex items-center gap-2">v minimum: <input value={minV} onChange={e => setMinV(e.target.value)} type="text" /></label>
                        <label className="flex items-center gap-2">v maximum: <input value={maxV} onChange={e => setMaxV(e.target.value)} type="text" /></label>
                    </div>

                    <p className="p-1 font-bold text-center">Presets</p>
                    <div className="gap-2 grid grid-cols-2 p-2">
                        {presetList.map((preset, i) => 
                            <button onClick={() => usePreset(preset)} key={`preset-button-${i}`}>{capitalize(preset)}</button>
                        )}
                    </div>

                    <p className="p-1 font-bold text-center">Path</p>
                    <div className="flex flex-col gap-2 p-2">
                        <label className="flex items-center gap-2">start u: <input value={startU} onChange={e => setStartU(e.target.value)} type="text" /></label>
                        <label className="flex items-center gap-2">start v: <input value={startV} onChange={e => setStartV(e.target.value)} type="text" /></label>
                        <label className="flex items-center gap-2">velocity u: <input value={uVel} onChange={e => setUVel(e.target.value)} type="text" /></label>
                        <label className="flex items-center gap-2">velocity v: <input value={vVel} onChange={e => setVVel(e.target.value)} type="text" /></label>

                        <p className="p-1 font-bold text-center">Integration Parameters</p>
                        <label className="flex items-center gap-2">step: <input value={step} onChange={e => setStep(e.target.value)} type="text" /></label>
                        <label className="flex items-center gap-2">n steps: <input value={nSteps} onChange={e => setNSteps(e.target.value)} type="text" /></label>
                        <label className="flex items-center gap-2">max length: <input value={maxLength} onChange={e => setMaxLength(e.target.value)} type="text" /></label>
                        <button onClick={getCurvePoints}>Solve Geodesic</button>
                    </div>

                    <p className="p-1 font-bold text-center">Cosmetic</p>
                    <div className="flex flex-col gap-2 p-2">
                        <label className="flex items-center gap-2">surface color: <input value={surfaceColor} onChange={e => setSurfaceColor(e.target.value)} type="color" /></label>
                        <label className="flex items-center gap-2">surface opacity: <input value={surfaceOpacity} onChange={e => setSurfaceOpacity(e.target.value)} type="number" /></label>

                        <label className="flex items-center gap-2">plane color: <input value={planeColor} onChange={e => setPlaneColor(e.target.value)} type="color" /></label>
                        <label className="flex items-center gap-2">plane opacity: <input value={planeOpacity} onChange={e => setPlaneOpacity(e.target.value)} type="number" /></label>

                        <label className="flex items-center gap-2">point color: <input value={pointColor} onChange={e => setPointColor(e.target.value)} type="color" /></label>
                        <label className="flex items-center gap-2">point opacity: <input value={pointOpacity} onChange={e => setPointOpacity(e.target.value)} type="number" /></label>

                        <label className="flex items-center gap-2">path color: <input value={pathColor} onChange={e => setPathColor(e.target.value)} type="color" /></label>
                        <label className="flex items-center gap-2">path opacity: <input value={pathOpacity} onChange={e => setPathOpacity(e.target.value)} type="number" /></label>

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
