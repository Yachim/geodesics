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

export function uBase(surface: ParametricSurfaceFn, u: number, v: number): Vector3 {
    return diffVec3WrtU(surface, u, v)
}

export function vBase(surface: ParametricSurfaceFn, u: number, v: number): Vector3 {
    return diffVec3WrtV(surface, u, v)
}

// g[i, j] = g[j, i]
function metric(surface: ParametricSurfaceFn, u: number, v: number): Matrix2 {
    // bases
    const partialU = uBase(surface, u, v)
    const partialV = vBase(surface, u, v)

    const uu = partialU.dot(partialU)
    const uv = partialU.dot(partialV)
    const vv = partialV.dot(partialV)

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

// returns the squared norm of the vector [uVel, vVel]
export function normSquared(surface: ParametricSurfaceFn, u: number, v: number, uVel: number, vVel: number): number {
    const lg = metric(surface, u, v)    
    const uu = lg[0][0]
    const uv = lg[0][1]
    const vv = lg[1][1]

    return uu * (uVel ** 2) + 2 * uv * uVel * vVel + vv * (vVel ** 2)
}

// returns the norm of the vector [uVel, vVel]
export function norm(surface: ParametricSurfaceFn, u: number, v: number, uVel: number, vVel: number): number {
    return Math.sqrt(normSquared(surface, u, v, uVel, vVel))
}

type ChristoffelSymbols = [Matrix2, Matrix2]

// Γ[k, i, j] = Γ[k, j, i]
// using extrinsic definition
function christoffelSymbolsFirstKind(surface: ParametricSurfaceFn, u: number, v: number): ChristoffelSymbols {
    // bases derivative
    const u_u = diffVec3WrtU((u_, v_) => uBase(surface, u_, v_), u, v)
    // u_v = v_u
    const u_v = diffVec3WrtV((u_, v_) => uBase(surface, u_, v_), u, v)
    const v_v = diffVec3WrtV((u_, v_) => vBase(surface, u_, v_), u, v)

    // bases
    const eu = uBase(surface, u, v)
    const ev = vBase(surface, u, v)

    // christoffel symbols
    const uuu = u_u.dot(eu)
    const vuu = u_u.dot(ev)
    const uuv = u_v.dot(eu)
    const vuv = u_v.dot(ev)
    const uvv = v_v.dot(eu)
    const vvv = v_v.dot(ev)

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

// the velocity always gets normalized
export function solveGeodesic(surface: ParametricSurfaceFn, u: number, v: number, uVel: number, vVel: number, dt: number, nSteps: number, maxLength: number): [number, number][] {
    const points: [number, number][] = [[u, v]]
    let prevU = u
    let prevV = v
    let prevUVel = uVel
    let prevVVel = vVel
    let length = 0
    for (let i = 0; i < nSteps; i++) {
        const css = christoffelSymbolsSecondKind(surface, prevU, prevV)
        const newUVel = prevUVel - (css[0][0][0] * (prevUVel ** 2) + 2 * css[0][0][1] * prevUVel * prevVVel + css[0][1][1] * (prevVVel ** 2)) * dt
        const newVVel = prevVVel - (css[1][0][0] * (prevUVel ** 2) + 2 * css[1][0][1] * prevUVel * prevVVel + css[1][1][1] * (prevVVel ** 2)) * dt
        const newU = prevU + prevUVel * dt
        const newV = prevV + prevVVel * dt

        length += norm(surface, prevU, prevV, newU - prevU, newV - prevV)
        points.push([newU, newV])

        if (length >= maxLength && maxLength !== 0) {
            break
        }

        prevU = newU
        prevV = newV
        prevUVel = newUVel
        prevVVel = newVVel
    }

    return points
}