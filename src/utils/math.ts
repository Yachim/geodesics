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

// returns accelerations
function geodesicEquation(surface: ParametricSurfaceFn, u: number, v: number, uVel: number, vVel: number): [number, number] {
        const css = christoffelSymbolsSecondKind(surface, u, v);

        const duVelDt = -(css[0][0][0] * uVel * uVel + 2 * css[0][0][1] * uVel * vVel + css[0][1][1] * vVel * vVel);
        const dvVelDt = -(css[1][0][0] * uVel * uVel + 2 * css[1][0][1] * uVel * vVel + css[1][1][1] * vVel * vVel);

        return [duVelDt, dvVelDt];
    }

export function geodesicEulerStep(surface: ParametricSurfaceFn, u: number, v: number, uVel: number, vVel: number, dt: number): [
    [number, number],
    [number, number],
] {
    const newU = u + uVel * dt
    const newV = v + vVel * dt

    const [uAcc, vAcc] = geodesicEquation(surface, u, v, uVel, vVel)
    const newUVel = uVel + uAcc * dt
    const newVVel = vVel + vAcc * dt

    return [
        [newU, newV],
        [newUVel, newVVel],
    ]
}

export function geodesicRK4Step(surface: ParametricSurfaceFn, u: number, v: number, uVel: number, vVel: number, dt: number): [
    [number, number],
    [number, number],
] {
    const k1 = [uVel, vVel]
    const l1 = geodesicEquation(surface, u, v, uVel, vVel);

    const k2 = [uVel + 0.5 * dt * l1[0], vVel + 0.5 * dt * l1[1]]
    const l2 = geodesicEquation(surface, u + 0.5 * dt * k1[0], v + 0.5 * dt * k1[1], uVel + 0.5 * dt * l1[0], vVel + 0.5 * dt * l1[1])

    const k3 = [uVel + 0.5 * dt * l2[0], vVel + 0.5 * dt * l2[1]]
    const l3 = geodesicEquation(surface, u + 0.5 * dt * k2[0], v + 0.5 * dt * k2[1], uVel + 0.5 * dt * l2[0], vVel + 0.5 * dt * l2[1])

    const k4 = [uVel + dt * l3[0], vVel + dt * l3[1]]
    const l4 = geodesicEquation(surface, u + dt * k3[0], v + dt * k3[1], uVel + dt * l3[0], vVel + dt * l3[1])

    const newU = u + dt / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0])
    const newV = v + dt / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])
    const newUVel = uVel + dt / 6 * (l1[0] + 2 * l2[0] + 2 * l3[0] + l4[0])
    const newVVel = vVel + dt / 6 * (l1[1] + 2 * l2[1] + 2 * l3[1] + l4[1])

    return [
        [newU, newV],
        [newUVel, newVVel],
    ];
}

export type Solver = "rk" | "euler"
export function geodesicStep(surface: ParametricSurfaceFn, u: number, v: number, uVel: number, vVel: number, dt: number, solver: Solver): [
    [number, number],
    [number, number],
] {
    if (solver === "rk") {
        return geodesicRK4Step(surface, u, v, uVel, vVel, dt)
    }
    else {
        return geodesicEulerStep(surface, u, v, uVel, vVel, dt)
    }
}