import JXG from "jsxgraph";
import { forwardRef, Ref, useEffect, useRef } from "react";

export const CustomJXGBoard = forwardRef(({
    bbox,
    className,
    u,
    v,
    uVel,
    vVel,
    velocityVisible,
    curvePoints,
}: {
    bbox: [number, number, number, number]
    className: string
    u: number
    v: number
    uVel: number
    vVel: number
    velocityVisible: boolean
    curvePoints: [number, number][]
}, ref: Ref<HTMLDivElement>) => {
    const boardRef = useRef<JXG.Board>()

    useEffect(() => {
        const board = JXG.JSXGraph.initBoard("intrinsic-view", {
            renderer: "canvas",
            axis: true,
            boundingBox: bbox,
            showCopyright: false,
            keepAspectRatio: true,
        })
        boardRef.current = board

        const arrow: JXG.Arrow = board.create("arrow", [[u, v], [u + uVel, v + vVel]], {
            id: "arrow",
            color: "#00ff00",
            visible: velocityVisible,
        })

        board.create("curve", [[u], [v]], {
            id: "curve",
            strokeColor: "#000000",
        })

        const point: JXG.Point = board.create("point", [u, v], {
            name: "",
            id: "point",
            color: "#00ff00",
        })

        arrow.point1 = point

        return () => JXG.JSXGraph.freeBoard(board)
    }, [])

    useEffect(() => {
        const board = JXG.getBoardByContainerId("intrinsic-view")
        if (!board) {
            return
        }

        const point = board.select("point", true) as JXG.Point 
        const curve = board.select("curve", true) as JXG.Curve 
        const arrow = board.select("arrow", true) as JXG.Arrow 

        // @ts-ignore
        point.coords.setCoordinates(JXG.COORDS_BY_USER, [u, v])
        curve.dataX = curvePoints.map(([u]) => u)
        curve.dataY = curvePoints.map(([_, v]) => v)
        // @ts-ignore
        arrow.point2.coords.setCoordinates(JXG.COORDS_BY_USER, [u + uVel, v + vVel])
        board.update()
    }, [u, v, curvePoints, uVel, vVel])

    useEffect(() => {
        const board = JXG.getBoardByContainerId("intrinsic-view")
        if (!board) {
            return
        }

        board.setBoundingBox(bbox)
        board.update()
    }, [bbox])

    useEffect(() => {
        const board = JXG.getBoardByContainerId("intrinsic-view")
        if (!board) {
            return
        }

        const arrow = board.select("arrow", true) as JXG.Arrow 

        arrow.setAttribute({
            visible: velocityVisible,
        })
    }, [velocityVisible])

    return (
        <div ref={ref} className={`w-full ${className}`} id="intrinsic-view" />
    )
})