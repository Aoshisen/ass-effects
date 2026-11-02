import { Noise } from "noisejs"
const noise = new Noise(Math.random());
const perlin3 = noise.perlin3.bind(noise);
import { ceil } from "lodash-es";
type Point = { x: number, y: number }

export class Sky {
	private readonly GAP = 20;
	private readonly RADIUS = 1.5;
	private readonly SCALE = 500;
	private readonly LENGTH = 10;
	// 最小/最大不透明度，拉开范围让亮暗对比更明显
	private readonly MIN_OPACITY = 0.15;
	private readonly MAX_OPACITY = 0.8;
	private readonly COLOR = "0,0,0";
	private pointsBuffer: Float32Array;
	private readonly POINT_DATA_SIZE = 2;
	private readonly FPS = 30;
	public el: HTMLCanvasElement;
	private timeStamp = performance.now();
	private dpr = 1;
	ctx: CanvasRenderingContext2D;

	constructor(width: number, height: number) {
		this.el = this.createCanvas(width, height);
		this.ctx = this.el.getContext("2d")!;
		this.dpr = window.devicePixelRatio || 1;
		this.el.width = Math.round(width * this.dpr);
		this.el.height = Math.round(height * this.dpr);
		this.el.style.width = `${width}px`;
		this.el.style.height = `${height}px`;
		this.pointsBuffer = new Float32Array(this.getBufferSize());
		this.initializePoints();
		this.startAnimate();
	}

	createCanvas(width: number, height: number) {
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		return canvas
	}

	/**
	 * 按 CSS 尺寸 × dpr 重设后备缓冲区。
	 * 改 canvas.width/height 会清空画布，点阵坐标也得跟着重建，
	 * 所以这里顺带重新初始化 pointsBuffer。
	 */
	resize(width: number, height: number) {
		this.dpr = window.devicePixelRatio || 1;
		this.el.width = Math.round(width * this.dpr);
		this.el.height = Math.round(height * this.dpr);
		this.el.style.width = `${width}px`;
		this.el.style.height = `${height}px`;
		this.pointsBuffer = new Float32Array(this.getBufferSize());
		this.initializePoints();
		this.dot();
	}

	getBufferSize() {
		const pointCount = ceil(this.el.width / this.GAP) * ceil(this.el.height / this.GAP);
		return (pointCount * this.POINT_DATA_SIZE);
	}

	private getForceOnPoint(p: Point) {
		const date = +new Date() / (this.SCALE * 10);
		return perlin3(p.x / this.SCALE, p.y / this.SCALE, date) * Math.PI;
	}

	private getLengthOnPoint(p: Point) {
		return (perlin3(p.x / this.SCALE, p.y / this.SCALE, 1)) * this.LENGTH;
	}

	private *generatePoints() {
		let currentBufferIndex = 0
		for (let x = 0; x < this.el.width; x += this.GAP) {
			for (let y = 0; y < this.el.height; y += this.GAP) {
				yield { x, y, currentBufferIndex };
				currentBufferIndex++;
			}
		}
	}

	private *generateBuffer(pointsBuffer: Float32Array<ArrayBufferLike>) {
		for (let index = 0; index < pointsBuffer.length; index += this.POINT_DATA_SIZE) {
			yield { x: pointsBuffer[index], y: pointsBuffer[index + 1] }
		}
	}

	initializePoints() {
		for (const { x, y, currentBufferIndex } of this.generatePoints()) {
			const bufferIndex = currentBufferIndex * this.POINT_DATA_SIZE;
			this.pointsBuffer[bufferIndex] = x;
			this.pointsBuffer[bufferIndex + 1] = y;
		}
	}

	shouldUpdate() {
		return performance.now() - this.timeStamp > (1000 / this.FPS)
	}

	nextPoint(p: Point) {
		const force = this.getForceOnPoint(p)
		// 原来只取到 [0.1, 0.4] 的灰，在白底上几乎看不清；改用近黑色并把范围拉满
		const opacity = (Math.abs(Math.cos(force)) * (this.MAX_OPACITY - this.MIN_OPACITY)) + this.MIN_OPACITY
		const length = this.getLengthOnPoint(p)
		const X = Math.cos(force) * length;
		const Y = Math.sin(force) * length;
		return {
			x: p.x + X,
			y: p.y + Y,
			color: `rgba(${this.COLOR},${opacity})`
		}
	}

	drawDot(p: Point) {
		const nextPoint = this.nextPoint(p)
		this.ctx.beginPath();
		this.ctx.fillStyle = nextPoint.color;
		// 半径吃 dpr，否则高分屏上点会小得发虚
		this.ctx.arc(nextPoint.x, nextPoint.y, this.RADIUS * this.dpr, 0, Math.PI * 2);
		this.ctx.fill();
		this.ctx.closePath()
	}

	dot() {
		this.ctx.clearRect(0, 0, this.el.width, this.el.height);
		for (const point of this.generateBuffer(this.pointsBuffer)) {
			this.drawDot(point)
		}
	}
	nextFrame() {
		requestAnimationFrame(() => this.startAnimate());
	}

	startAnimate() {
		if (this.shouldUpdate()) {
			this.dot();
			this.timeStamp = performance.now()
		}
		this.nextFrame()
	}
}