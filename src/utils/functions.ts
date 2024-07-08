import { Vector3 } from "three"

export type ParametersMap = Map<string, number>
export type ParametricSurfaceFn = (u: number, v: number, target: Vector3) => void
export type Range = [number, number]

// format of the text
// parameters and variables u, v are represented as %u, %v, %r
// only one character parameters are allowed
// trig functions are without Math. prefix, e.g. sin(x)
// the variables are represented as %u and %v

export function translateFunction(
    textFn: string,
    uRange: Range,
    vRange: Range,
    parametersMap: ParametersMap,
): (u: number, v: number) => number {
    let result = textFn
    result = result.replace(/\b(sin|cos|tan|acos|asin|atan)\b/g, "Math.$1")
    result = result.replace("%u", `${uRange[0]} + u * (${uRange[1]} - ${uRange[0]})`)
    result = result.replace("%v", `${vRange[0]} + v * (${vRange[1]} - ${vRange[0]})`)
    result = result.replace(/%([a-zA-Z])/g, (_, p1) => parametersMap.get(p1)?.toString() ?? "NaN")

    return (u, v) => eval(result)
}

export const presetList = ["sphere", "cylinder"] as const
export type Preset = typeof presetList[number]
export const presets: {
    [key in Preset]: {
        x: string
        y: string
        z: string
        uRange: Range,
        vRange: Range,
        parameters: ParametersMap,
    }
} = {
    sphere: {
        x: "%r * sin(%u) * cos(%v)",
        y: "%r * cos(%u)",
        z: "%r * sin(%u) * sin(%v)",
        uRange: [0, Math.PI],
        vRange: [0, 2 * Math.PI],
        parameters: new Map([["r", 5]]),
    },
    cylinder: {
        x: "%r * cos(%v)",
        y: "%u",
        z: "%r * sin(%v)",
        uRange: [-10, 10],
        vRange: [0, 2 * Math.PI],
        parameters: new Map([["r", 5]]),
    },
}