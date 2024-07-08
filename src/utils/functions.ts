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

export function translateFunction(
    textFn: string,
    parametersMap: ParametersObj,
): ParametricCoordFn {
    let result = textFn
    result = result.replace(/\b(sin|cos|tan|acos|asin|atan)\b/g, "Math.$1")
    result = result.replace(/%u/g, "u")
    result = result.replace(/%v/g, "v")
    result = result.replace(/\^/g, "**")
    result = result.replace(/%([a-tw-zA-Z])/g, (_, p1) => parametersMap[p1].toString() ?? "NaN")

    return (u, v) => eval(result)
}

export function findParameters(
    textFn: string,
): string[] {
    const result = [...textFn.matchAll(/%([a-tw-zA-Z])/g)]
    const parameters = result.map(([_, p1]) => p1)
    return parameters
}

export const presetList = ["sphere", "cylinder", "torus", "saddle"] as const
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
        z: "-%r * sin(%u) * sin(%v)",
        uRange: [0, Math.PI],
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
}