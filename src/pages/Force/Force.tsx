import { useEffect, useRef } from "react";
import { BaseWrapper } from "../../components";
import * as d3 from "d3";
import data from "./graph.json"

type GraphNode = d3.SimulationNodeDatum & {
	id: string;
	group: string;
	radius: number;
};

type GraphLink = d3.SimulationLinkDatum<GraphNode> & {
	value: number;
};

// 节点半径与描边宽度都用逻辑坐标，绘制时统一整体缩放
const NODE_RADIUS = 5;
const NODE_STROKE = 1.5;

export default () => {
	const containerRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		if (!containerRef.current || !canvasRef.current) return;

		const container = containerRef.current;
		const canvas = canvasRef.current;
		const context = canvas.getContext("2d");
		if (!context) return;

		// 逻辑坐标空间，原点在画布中心（等价于原来的 viewBox）
		const width = 700;
		const height = 700;

		const color = d3.scaleOrdinal(d3.schemeCategory10);

		// The force simulation mutates links and nodes, so create a copy
		const links = (data.links as unknown as GraphLink[]).map((d) => ({ ...d }));
		const nodes = (data.nodes as unknown as GraphNode[]).map((d) => ({ ...d }));

		// 逻辑坐标 → 缓冲区像素的缩放比，随容器尺寸与 dpr 变化
		let scale = 1;

		function resize() {
			const rect = container.getBoundingClientRect();
			if (!rect.width || !rect.height) return;

			const dpr = window.devicePixelRatio || 1;
			canvas.width = Math.round(rect.width * dpr);
			canvas.height = Math.round(rect.height * dpr);
			// 保持等比缩放，避免圆被拉成椭圆
			scale = Math.min(canvas.width / width, canvas.height / height);
			ticked();
		}

		// pointer 事件用的是 CSS 像素，换算回以中心为原点的逻辑坐标
		function toLogical(event: PointerEvent): [number, number] {
			const [x, y] = d3.pointer(event, canvas);
			return [
				(x - canvas.clientWidth / 2) * (width / canvas.clientWidth),
				(y - canvas.clientHeight / 2) * (height / canvas.clientHeight),
			];
		}

		function findNode(event: PointerEvent): GraphNode | undefined {
			const [px, py] = toLogical(event);
			// 留一点容差，细小的点也容易点中
			const tolerance = NODE_RADIUS + 4;
			let found: GraphNode | undefined;
			let minDistance = Infinity;
			for (const node of nodes) {
				const dx = (node.x ?? 0) - px;
				const dy = (node.y ?? 0) - py;
				const distance = Math.hypot(dx, dy);
				if (distance < tolerance && distance < minDistance) {
					minDistance = distance;
					found = node;
				}
			}
			return found;
		}

		// 拖拽：canvas 没有 DOM 元素可绑 d3.drag，改成手动拾取 + 设置 fx/fy
		let dragging: GraphNode | null = null;

		function pointerdown(event: PointerEvent) {
			const node = findNode(event);
			if (!node) return;
			canvas.setPointerCapture(event.pointerId);
			dragging = node;
			if (!simulation.alphaTarget()) simulation.alphaTarget(0.3).restart();
			const [x, y] = toLogical(event);
			node.fx = x;
			node.fy = y;
			event.preventDefault();
		}

		function pointermove(event: PointerEvent) {
			if (!dragging) {
				canvas.style.cursor = findNode(event) ? "grab" : "default";
				return;
			}
			const [x, y] = toLogical(event);
			dragging.fx = x;
			dragging.fy = y;
			event.preventDefault();
		}

		function pointerup(event: PointerEvent) {
			if (!dragging) return;
			canvas.releasePointerCapture(event.pointerId);
			// 松手后节点回到自由状态
			dragging.fx = null;
			dragging.fy = null;
			dragging = null;
			simulation.alphaTarget(0);
			canvas.style.cursor = "default";
		}

		canvas.addEventListener("pointerdown", pointerdown);
		canvas.addEventListener("pointermove", pointermove);
		canvas.addEventListener("pointerup", pointerup);
		canvas.addEventListener("pointercancel", pointerup);

		function ticked() {
			const cw = canvas.width;
			const ch = canvas.height;

			context.setTransform(1, 0, 0, 1, 0, 0);
			context.clearRect(0, 0, cw, ch);
			context.setTransform(scale, 0, 0, scale, cw / 2, ch / 2);
			context.lineCap = "round";

			// 边
			context.save();
			context.globalAlpha = 0.6;
			context.strokeStyle = "#999";
			for (const d of links) {
				const source = d.source as GraphNode;
				const target = d.target as GraphNode;
				context.beginPath();
				context.moveTo(source.x ?? 0, source.y ?? 0);
				context.lineTo(target.x ?? 0, target.y ?? 0);
				context.lineWidth = Math.sqrt(d.value);
				context.stroke();
			}
			context.restore();

			// 节点
			context.save();
			context.strokeStyle = "#fff";
			context.lineWidth = NODE_STROKE;
			for (const d of nodes) {
				context.beginPath();
				context.arc(d.x ?? 0, d.y ?? 0, NODE_RADIUS, 0, 2 * Math.PI);
				context.fillStyle = color(d.group);
				context.fill();
				context.stroke();
			}
			context.restore();
		}

		// Create a simulation with several forces.
		const simulation = d3.forceSimulation(nodes)
			.force("link", d3.forceLink(links).id((d) => (d as GraphNode).id))
			.force("charge", d3.forceManyBody())
			.force("x", d3.forceX())
			.force("y", d3.forceY())
			.on("tick", ticked);

		resize();
		const observer = new ResizeObserver(resize);
		observer.observe(container);

		// Cleanup function
		return () => {
			observer.disconnect();
			simulation.stop();
			canvas.removeEventListener("pointerdown", pointerdown);
			canvas.removeEventListener("pointermove", pointermove);
			canvas.removeEventListener("pointerup", pointerup);
			canvas.removeEventListener("pointercancel", pointerup);
		};
	}, []);

	return (
		<BaseWrapper >
			<div className="h-full w-full relative" ref={containerRef}>
				<canvas
					ref={canvasRef}
					className="block h-full w-full"
				/>
			</div>
		</BaseWrapper>
	);
};