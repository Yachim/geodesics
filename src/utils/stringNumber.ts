import { useMemo, useState } from "react";

export function useStringNumber(initial: number, fallback?: number) {
    const [val, setVal] = useState(initial.toString())
    const valNum: number = useMemo(() => {
        if (val === "" || isNaN(+val)) {
            return fallback ?? initial
        }

        return +val
    }, [val, fallback, initial])

    return [val, valNum, setVal] as const
}