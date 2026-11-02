//@see https://antfu.me/projects
import { useEffect, useRef } from "react";
import { Sky as SkyClass } from "./sky"
import { useSize } from "ahooks";
import { BaseWrapper } from "../../components";

const Sky = () => {
	const containerRef = useRef<HTMLDivElement>(null);
	const skyRef = useRef<SkyClass | null>(null);
	const size = useSize(containerRef);

	useEffect(() => {
		if (!size || !size.width || !size.height) return;

		if (!skyRef.current) {
			const sky = new SkyClass(size.width, size.height)
			//@ts-expect-error global sky
			window.sky = sky;
			skyRef.current = sky;
			containerRef.current!.append(sky.el)
			return;
		}

		// 尺寸变化只重设缓冲区，不重建实例，否则每次 resize 都会残留一个 canvas
		skyRef.current.resize(size.width, size.height);
	}, [size])

	return <BaseWrapper>
		<div className="h-full w-full" ref={containerRef} />
	</BaseWrapper>
}
export default Sky;