import { useRef, useEffect } from "react";
import { BufferGeometry, DoubleSide } from "three";
import { ParametricSurfaceFn } from "../utils/functions";
import { getNormal } from "../utils/math";

export default function Trails({
    parametricSurface,
    side,
    points,
    dist,
    width,
}: {
    parametricSurface: ParametricSurfaceFn,
    side: number,
    points: [number, number][],
    dist: number,
    width: number,
}) {
    const line1 = useRef<BufferGeometry>(null)
    const line2 = useRef<BufferGeometry>(null)
    useEffect(() => {
        line1.current!.setFromPoints(points.slice(1).map(([u, v], i) => {
            const v3 = parametricSurface(u, v)
            const velocity = v3.clone().sub(parametricSurface(...points[i]))
            const bitangent = velocity.clone().cross(getNormal(parametricSurface, u, v, side)).normalize()
            return v3.clone().addScaledVector(bitangent, dist / 2)
        }))
        line2.current!.setFromPoints(points.slice(1).map(([u, v], i) => {
            const v3 = parametricSurface(u, v)
            const velocity = v3.clone().sub(parametricSurface(...points[i]))
            const bitangent = velocity.clone().cross(getNormal(parametricSurface, u, v, side)).normalize()
            return v3.clone().addScaledVector(bitangent, -dist / 2)
        }))
    }, [points, dist])

    return (
        <>
            <line>
                <bufferGeometry ref={line1} />
                <lineBasicMaterial linewidth={width} color={"#000000"} side={DoubleSide} />
            </line>
            <line>
                <bufferGeometry ref={line2} />
                <lineBasicMaterial linewidth={width} color={"#000000"} side={DoubleSide} />
            </line>
        </>
    )
}