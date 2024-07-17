import { Points } from "@react-three/drei"
import { useRef, useMemo } from "react"
import { Vector3, Points as PointsType } from "three"
import { useFrame } from "@react-three/fiber"

// direction and normal are normalized
// direction is the direction of the particles
// normal is perpendicular to the surface
export function Dust({
    originPos,
    color,
    direction,
    velocity,
    normal,
    density,
    nParticles,
    playing,
    particleSize,
    deviation,
}: {
    originPos: Vector3
    color: string
    direction: Vector3
    velocity: number
    normal: Vector3
    density: number
    nParticles: number
    playing: boolean
    particleSize: number
    deviation: number
}) {
    const pointsRef = useRef<PointsType>(null)

    const bitangent = useMemo(() => 
        direction.clone().cross(normal).normalize()
    , [direction, normal])

    const positionsRef = useRef(new Float32Array(Array(nParticles * 3).fill(NaN)))

    useFrame((_, delta) => {
        if (!pointsRef.current || !playing) {
            return
        }

        const positions = positionsRef.current

        for (let i = 0; i < nParticles; i++) {
            const pos = new Vector3(
                positions[i * 3],
                positions[i * 3 + 1],
                positions[i * 3 + 2],
            )

            let newPos = pos.clone()
                .addScaledVector(direction, velocity * delta)
                .addScaledVector(bitangent, (Math.random() - 0.5) * deviation)
                .addScaledVector(normal, (Math.random() - 0.5) * deviation)

            positions[i * 3 + 0] = newPos.x
            positions[i * 3 + 1] = newPos.y
            positions[i * 3 + 2] = newPos.z
        }

        positionsRef.current = new Float32Array([
            ...Array(density).fill(0).map(() => [0, 0, 0]).flat(),
            ...positions,
        ]).slice(0, nParticles)

        pointsRef.current.geometry.attributes.position.array.set(positionsRef.current)
        pointsRef.current.geometry.attributes.position.needsUpdate = true;
    });

    return (
        <Points
            position={originPos}
            ref={pointsRef}
            positions={new Float32Array(Array(nParticles * 3).fill(NaN))}
        >
            <pointsMaterial color={color} size={particleSize} />
        </Points>
    )
}