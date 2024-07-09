import JXG from "jsxgraph";
import { forwardRef, Ref, useEffect } from "react";

export type BoardProps = {
    bbox?: [number, number, number, number]
    axis?: boolean
    offsetX?: number
    offsetY?: number
    className?: string
}

export const CustomJXGBoard = forwardRef(({
    id,
    bbox,
    axis,
    initFn,
    className,
}: BoardProps & {
    id: string
    initFn?: (board: JXG.Board) => void
}, ref: Ref<HTMLDivElement>) => {
    useEffect(() => {
        const board = JXG.JSXGraph.initBoard(id, {
            renderer: "canvas",
            axis: axis ?? true,
            boundingBox: bbox ?? [-8, 4.5, 8, -4.5],
            showCopyright: false,
            keepAspectRatio: true,
        })

        if (initFn) {
            initFn(board)
        }

        return () => JXG.JSXGraph.freeBoard(board)
    }, [bbox, initFn, axis, id])

    return (
        <div ref={ref} className={`w-full aspect-video ${className}`} id={id} />
    )
})