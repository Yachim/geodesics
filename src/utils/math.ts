import { Vector3 } from "three"
import { ParametricSurfaceFn } from "./functions"

// h in derivative
const diffDelta = 0.0001

// returns f'(x)
function diff(f: (val: number) => number, val: number): number {
    return (f(val + diffDelta) - f(val)) / diffDelta    
}

// returns df/du (u, v)
function diffWrtU(f: (u: number, v: number) => number, u: number, v: number): number {
    return diff(u_ => f(u_, v), u)
}

function diffVec3WrtU(f: (u: number, v: number) => Vector3, u: number, v: number): Vector3 {
    return new Vector3(
        diffWrtU((u_, v_) => f(u_, v_).x, u, v),
        diffWrtU((u_, v_) => f(u_, v_).y, u, v),
        diffWrtU((u_, v_) => f(u_, v_).z, u, v),
    )
}

// returns df/dv (u, v)
function diffWrtV(f: (u: number, v: number) => number, u: number, v: number): number {
    return diff(v_ => f(u, v_), v)
}

function diffVec3WrtV(f: (u: number, v: number) => Vector3, u: number, v: number): Vector3 {
    return new Vector3(
        diffWrtV((u_, v_) => f(u_, v_).x, u, v),
        diffWrtV((u_, v_) => f(u_, v_).y, u, v),
        diffWrtV((u_, v_) => f(u_, v_).z, u, v),
    )
}

type Matrix2 = [
    [number, number],
    [number, number],
]

// g[i, j] = g[j, i]
function metric(surface: ParametricSurfaceFn, u: number, v: number): Matrix2 {
    const uu = diffVec3WrtU(surface, u, v).dot(diffVec3WrtU(surface, u, v))
    const uv = diffVec3WrtU(surface, u, v).dot(diffVec3WrtV(surface, u, v))
    const vv = diffVec3WrtV(surface, u, v).dot(diffVec3WrtV(surface, u, v))

    return [
        [uu, uv],
        [uv, vv],
    ]
}

function inverseMetric(metric: Matrix2): Matrix2 {
    const uu = metric[0][0]
    const uv = metric[0][1]
    const vv = metric[1][1]

    const det = uu * vv - uv ** 2
    const detReciprocal = 1 / det

    return [
        [detReciprocal * vv, -detReciprocal * uv],
        [-detReciprocal * uv, detReciprocal * uu],
    ]
}

type ChristoffelSymbols = [Matrix2, Matrix2]

// Γ[k, i, j] = Γ[k, j, i]
function christoffelSymbolsFirstKind(surface: ParametricSurfaceFn, u: number, v: number): ChristoffelSymbols {
    // metric derivatives
    const uu_u = diffWrtU((u_, v_) => metric(surface, u_, v_)[0][0], u, v)
    const uu_v = diffWrtV((u_, v_) => metric(surface, u_, v_)[0][0], u, v)
    const uv_u = diffWrtU((u_, v_) => metric(surface, u_, v_)[0][1], u, v)
    const uv_v = diffWrtV((u_, v_) => metric(surface, u_, v_)[0][1], u, v)
    const vv_u = diffWrtU((u_, v_) => metric(surface, u_, v_)[1][1], u, v)
    const vv_v = diffWrtV((u_, v_) => metric(surface, u_, v_)[1][1], u, v)

    // christoffel symbols
    const uuu = uu_u / 2
    const uuv = uu_v / 2
    const uvv = (2 * uv_v - vv_u) / 2
    const vuu = (2 * uv_u - uu_v) / 2
    const vuv = vv_u / 2
    const vvv = vv_v / 2

    return [
        [
            [uuu, uuv],
            [uuv, uvv],
        ],
        [
            [vuu, vuv],
            [vuv, vvv],
        ],
    ]
}

// Γ[k, i, j] = Γ[k, j, i]
// k is contravariant
function christoffelSymbolsSecondKind(surface: ParametricSurfaceFn, u: number, v: number): ChristoffelSymbols {
    const lg = metric(surface, u, v)
    const ug = inverseMetric(lg)

    const csf = christoffelSymbolsFirstKind(surface, u, v)

    return [
        [
            [ug[0][0] * csf[0][0][0] + ug[0][1] * csf[1][0][0], ug[0][0] * csf[0][0][1] + ug[0][1] * csf[1][0][1]],
            [ug[0][0] * csf[0][0][1] + ug[0][1] * csf[1][0][1], ug[0][0] * csf[0][1][1] + ug[0][1] * csf[1][1][1]],
        ],
        [
            [ug[1][0] * csf[0][0][0] + ug[1][1] * csf[1][0][0], ug[1][0] * csf[0][0][1] + ug[1][1] * csf[1][0][1]],
            [ug[1][0] * csf[0][0][1] + ug[1][1] * csf[1][0][1], ug[1][0] * csf[0][1][1] + ug[1][1] * csf[1][1][1]],
        ],
    ]
}

export function solveGeodesic(surface: ParametricSurfaceFn, u: number, v: number, uVel: number, vVel: number, dt: number, nSteps: number): [number, number][] {
    const points: [number, number][] = [[u, v]]
    let prevU = u
    let prevV = v
    let prevUVel = uVel
    let prevVVel = vVel
    for (let i = 0; i < nSteps; i++) {
        const css = christoffelSymbolsSecondKind(surface, u, v)
        const newUVel = -(css[0][0][0] * (prevUVel ** 2) + 2 * css[0][0][1] * prevUVel * prevVVel + css[0][1][1] * (prevVVel ** 2)) * dt + prevUVel
        const newVVel = -(css[1][0][0] * (prevUVel ** 2) + 2 * css[1][0][1] * prevUVel * prevVVel + css[1][1][1] * (prevVVel ** 2)) * dt + prevVVel
        const newU = prevU + prevUVel * dt
        const newV = prevV + prevVVel * dt

        points.push([newU, newV])

        prevU = newU
        prevV = newV
        prevUVel = newUVel
        prevVVel = newVVel
    }

    return points
}

const tries = 30
export function findGeodesic(surface: ParametricSurfaceFn, startU: number, startV: number, endU: number, endV: number, dt: number, nSteps: number, maxDist: number): [number, number][] {
    let bestPoints: [number, number][] | undefined
    let bestDist = Infinity

    for (let i = 0; i < tries; i++) {
        const angle = i * 2 * Math.PI / tries
        const uVel = Math.cos(angle)
        const vVel = Math.sin(angle)

        const points = solveGeodesic(surface, startU, startV, uVel, vVel, dt, nSteps)
        if (bestPoints === undefined) {
            bestPoints = points
        }

        const newPoints: [number, number][] = []

        let bestTryDist = Infinity
        points.some(([u, v]) => {
            newPoints.push([u, v])

            const lg = metric(surface, u, v)
            const du = endU - u
            const dv = endV - v
            const dist = Math.sqrt(lg[0][0] * du ** 2 + 2 * lg[0][1] * du * dv + lg[1][1] * dv ** 2)

            bestTryDist = Math.min(dist, bestTryDist)
            return (dist <= maxDist)
        })

        if (bestTryDist < bestDist) {
            bestDist = bestTryDist
            bestPoints = newPoints
        }
    }

    return bestPoints!
}