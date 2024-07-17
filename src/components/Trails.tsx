import { useRef, useEffect } from "react";
import { BufferGeometry, DoubleSide, Vector3 } from "three";

export default function Trails({
    curvePoints,
    halfPerpSeparation,
    width,
}: {
    curvePoints: Vector3[]
    halfPerpSeparation: Vector3
    width: number,
}) {
    const line1 = useRef<BufferGeometry>(null)
    const line2 = useRef<BufferGeometry>(null)
    useEffect(() => {
        line1.current!.setFromPoints(curvePoints.map(val => val.clone().add(halfPerpSeparation)))
        line2.current!.setFromPoints(curvePoints.map(val => val.clone().sub(halfPerpSeparation)))
    }, [curvePoints])

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