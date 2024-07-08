import { Canvas } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Vector3 } from "three";
import { ParametricGeometry } from "three/addons/geometries/ParametricGeometry.js";
import { ParametersMap, ParametricSurfaceFn, Preset, presets, translateFunction } from "./utils/functions";

function ThreeScene() {
    const [minU, setMinU] = useState(0)
    const [maxU, setMaxU] = useState(1)
    const [minV, setMinV] = useState(0)
    const [maxV, setMaxV] = useState(1)

    const uRange: [number, number] = useMemo(() => [minU, maxU], [minU, maxU])
    const vRange: [number, number] = useMemo(() => [minV, maxV], [minV, maxV])

    const [parameters, setParameters] = useState<ParametersMap>(new Map())
    const [preset, setPreset] = useState<"" | Preset>("cylinder")

    const [xFn, setXFn] = useState("")
    const [yFn, setYFn] = useState("")
    const [zFn, setZFn] = useState("")

    useEffect(() => {
        if (preset !== "") {
            const presetObj = presets[preset]

            setXFn(presetObj.x)
            setYFn(presetObj.y)
            setZFn(presetObj.z)

            setMinU(presetObj.uRange[0])
            setMaxU(presetObj.uRange[1])
            setMinV(presetObj.vRange[0])
            setMaxV(presetObj.vRange[1])
            
            setParameters(presetObj.parameters)
        }
    }, [preset])

    const parametricSurface = useCallback<ParametricSurfaceFn>((u, v, target) => {
        target.x = translateFunction(xFn, uRange, vRange, parameters)(u, v)
        target.y = translateFunction(yFn, uRange, vRange, parameters)(u, v)
        target.z = translateFunction(zFn, uRange, vRange, parameters)(u, v)
    }, [xFn, yFn, zFn])

    return (
        <>
            <ambientLight intensity={Math.PI / 2} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} decay={0} intensity={Math.PI} />
            <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />
            <mesh geometry={new ParametricGeometry(parametricSurface, 25, 25)}>
                <meshBasicMaterial color="gray" />
            </mesh>
        </>
    )
}

export default function App() {
    return (
        <Canvas camera={{position: [10, 10, 10]}} className="w-full h-full">
            <ThreeScene/>
        </Canvas>
    )
}
