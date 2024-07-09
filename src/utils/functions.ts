import { Vector3 } from "three"

export type ParametersObj = Record<string, number>
export type ParametricCoordFn = (u: number, v: number) => number
export type ParametricSurfaceFn = (u: number, v: number) => Vector3
export type Range = [number, number]

// format of the text
// parameters and variables u, v are represented as %u, %v, %r
// only one character parameters are allowed
// trig functions are without Math. prefix, e.g. sin(x)
// ^ is used for exponentiation
// %pi and %e are reserved

export function runFunction(
    textFn: string,
    parametersMap: ParametersObj,
    u: number,
    v: number,
): number {
    let result = textFn
    result = result.replace(/\b(sin|cos|tan|acos|asin|atan|sinh|cosh|tanh|asinh|acosh|atanh)\b/g, "Math.$1")
    result = result.replace(/%pi/g, Math.PI.toString())
    result = result.replace(/%e/g, Math.E.toString())
    result = result.replace(/%u/g, `(${u})`)
    result = result.replace(/%v/g, `(${v})`)
    result = result.replace(/\^/g, "**")
    result = result.replace(/%([a-tw-zA-Z])/g, (_, p1) => `(${parametersMap[p1] ?? "NaN"})`)

    return eval(result)
}

export function findParameters(
    textFn: string,
): string[] {
    let text = textFn.replace(/%pi/g, Math.PI.toString())
    text = text.replace(/%e/g, Math.E.toString())
    const result = [
        ...text.matchAll(/%([a-tw-zA-Z])/g),
    ]
    const parameters = result.map(([_, p1]) => p1)
    return parameters
}

export const presetList = [
    "plane",
    "sphere",
    "cylinder",
    "cone",
    "ellipsoid",
    "torus",
    "saddle",
    "hyperboloid1",
    "hyperboloid2",
    "paraboloid",
    "crossed through"
] as const
export type Preset = typeof presetList[number]
export const presets: {
    [key in Preset]: {
        x: string
        y: string
        z: string
        uRange: Range,
        vRange: Range,
        parameters: ParametersObj,
    }
} = {
    sphere: {
        x: "%r * sin(%u) * cos(%v)",
        y: "%r * cos(%u)",
        z: "%r * sin(%u) * sin(%v)",
        uRange: [1e-20, Math.PI], // weird overlap if minU = 0
        vRange: [0, 2 * Math.PI],
        parameters: {r: 5},
    },
    cylinder: {
        x: "%r * cos(%v)",
        y: "%u",
        z: "-%r * sin(%v)",
        uRange: [-10, 10],
        vRange: [0, 2 * Math.PI],
        parameters: {r: 5},
    },
    ellipsoid: {
        x: "%a * sin(%u) * cos(%v)",
        y: "%b * cos(%u)",
        z: "%c * sin(%u) * sin(%v)",
        uRange: [1e-20, Math.PI],
        vRange: [0, 2 * Math.PI],
        parameters: {
            a: 2,
            b: 3,
            c: 4,
        },
    },
    plane: {
        x: "%u",
        y: "%y",
        z: "%v",
        uRange: [-10, 10],
        vRange: [-10, 10],
        parameters: {
            y: 0,
        },
    },
    cone: {
        x: "%u * cos(%v)",
        y: "%h - %u",
        z: "%u * sin(%v)",
        uRange: [1e-20, 5],
        vRange: [0, 2 * Math.PI],
        parameters: {
            h: 5,
        },
    },
    torus: {
        x: "(%R + %r * cos(%u)) * cos(%v)",
        y: "%r * sin(%u)",
        z: "(%R + %r * cos(%u)) * sin(%v)",
        uRange: [0, 2 * Math.PI],
        vRange: [0, 2 * Math.PI],
        parameters: {
            R: 5,
            r: 1,
        },
    },
    saddle: {
        x: "%u",
        y: "(%u^2 - %v^2) / %s",
        z: "%v",
        uRange: [-10, 10],
        vRange: [-10, 10],
        parameters: {
            s: 10,
        },
    },
    hyperboloid1: {
        x: "%a * cosh(%u) * cos(%v)",
        y: "%b * sinh(%u)",
        z: "%c * cosh(%u) * sin(%v)",
        uRange: [-2, 2],
        vRange: [0, 2 * Math.PI],
        parameters: {
            a: 1,
            b: 1,
            c: 1,
        },
    },
    hyperboloid2: {
        x: "%a * sinh(%u) * cos(%v)",
        y: "%b * cosh(%u)",
        z: "%c * sinh(%u) * sin(%v)",
        uRange: [0, 2.5],
        vRange: [0, 2 * Math.PI],
        parameters: {
            a: 1,
            b: 1,
            c: 1,
        },
    },
    paraboloid: {
        x: "%u * cos(%v)",
        y: "%u^2",
        z: "%u * sin(%v)",
        uRange: [1e-20, 2.5],
        vRange: [0, 2 * Math.PI],
        parameters: {},
    },
    "crossed through": {
        x: "%u",
        y: "%u^2 * %v^2 / %s",
        z: "%v",
        uRange: [-20, 20],
        vRange: [-20, 20],
        parameters: {
            s: 1000,
        },
    },
}