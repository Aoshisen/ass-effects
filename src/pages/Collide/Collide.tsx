import { useEffect, useRef } from "react";
import { BaseWrapper } from "../../components";
import * as d3 from "d3";
import { data, width } from "./data"

export default () => {
	const containerRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		if (!containerRef.current || !canvasRef.current) return;

		const container = containerRef.current;
		const canvas = canvasRef.current;
		const context = canvas.getContext("2d");
		if (!context) return;

		const height = width;
		const color = d3.scaleOrdinal(d3.schemeTableau10);
		const nodes = data.map((d: any) => Object.create(d));

		// 设备像素 / 逻辑坐标的缩放比，随容器尺寸与 dpr 变化
		let scale = 1;

		function resize() {
			const rect = container.getBoundingClientRect();
			if (!rect.width || !rect.height) return;

			const dpr = window.devicePixelRatio || 1;
			canvas.width = Math.round(rect.width * dpr);
			canvas.height = Math.round(rect.height * dpr);
			// 后备缓冲区铺满 CSS 尺寸，绘制时再把 400×400 逻辑空间映射上去
			scale = Math.min(canvas.width / width, canvas.height / height);
			ticked();
		}

		const simulation = d3.forceSimulation(nodes)
			.alphaTarget(0.3) // stay hot
			.velocityDecay(0.1) // low friction
			.force("x", d3.forceX().strength(0.01))
			.force("y", d3.forceY().strength(0.01))
			.force("collide", d3.forceCollide().radius((d: any) => d.r + 1).iterations(3))
			.force("charge", d3.forceManyBody().strength((_, i: number) => i ? 0 : -width * 2 / 3))
			.on("tick", ticked);

		d3.select(canvas)
			.on("touchmove", event => event.preventDefault())
			.on("pointermove", pointermoved);

		function pointermoved(event: PointerEvent) {
			const [x, y] = d3.pointer(event); // CSS px
			// CSS px → 400×400 逻辑坐标
			nodes[0].fx = (x - canvas.clientWidth / 2) / scale;
			nodes[0].fy = (y - canvas.clientHeight / 2) / scale;
		}

		function ticked() {
			if (!context) return;
			context.setTransform(1, 0, 0, 1, 0, 0);
			context.clearRect(0, 0, canvas.width, canvas.height);
			context.setTransform(scale, 0, 0, scale, canvas.width / 2, canvas.height / 2);
			for (let i = 1; i < nodes.length; ++i) {
				const d = nodes[i];
				context.beginPath();
				context.moveTo(d.x + d.r, d.y);
				context.arc(d.x, d.y, d.r, 0, 2 * Math.PI);
				context.fillStyle = color(d.group);
				context.fill();
			}
		}

		resize();
		const observer = new ResizeObserver(resize);
		observer.observe(container);

		return () => {
			observer.disconnect();
			simulation.stop();
			d3.select(canvas).on("touchmove", null).on("pointermove", null);
		};

	}, []);

	return (
		<BaseWrapper>
			<div className="h-full w-full relative" ref={containerRef}>
				<canvas
					ref={canvasRef}
					className="block h-full w-full"
				/>
			</div>
		</BaseWrapper>
	);
};