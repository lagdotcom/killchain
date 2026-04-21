import { useCallback, useEffect, useMemo, useRef } from "react";

import type { Cells, Pixels } from "../flavours.js";
import { MapTool } from "../geometry/tool.js";
import type { XY } from "../killchain/EuclideanEngine.js";
import type { MapLayout } from "../state/maps.js";

class PanZoomController {
  svg!: SVGSVGElement;
  g!: SVGGElement;

  dragging: boolean;
  start: XY<Pixels>;
  ox: Pixels;
  oy: Pixels;
  zr: number;

  constructor() {
    this.dragging = false;
    this.start = { x: NaN, y: NaN };
    this.ox = 0;
    this.oy = 0;
    this.zr = 1;
  }

  attach(svg: SVGSVGElement, g: SVGGElement) {
    this.svg = svg;
    this.g = g;

    svg.addEventListener("wheel", this.onWheel);
    svg.addEventListener("mousedown", this.onMouseDown);
    svg.addEventListener("mousemove", this.onMouseMove);
    svg.addEventListener("mouseup", this.onMouseUp);
    svg.addEventListener("mouseleave", this.onMouseUp);
    svg.addEventListener("contextmenu", this.onContext);

    return () => {
      svg.removeEventListener("wheel", this.onWheel);
      svg.removeEventListener("mousedown", this.onMouseDown);
      svg.removeEventListener("mousemove", this.onMouseMove);
      svg.removeEventListener("mouseup", this.onMouseUp);
      svg.removeEventListener("mouseleave", this.onMouseUp);
      svg.removeEventListener("contextmenu", this.onContext);
    };
  }

  onContext = (e: PointerEvent) => {
    e.preventDefault();
  };

  onWheel = (e: WheelEvent) => {
    e.preventDefault();

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    this.zoom(e.clientX, e.clientY, delta);
  };

  onMouseDown = (e: MouseEvent) => {
    if (e.button === 1 || e.button === 2) this.drag(e.clientX, e.clientY);
  };

  onMouseMove = (e: MouseEvent) => {
    if (!this.dragging) return;

    const dx = e.clientX - this.start.x;
    const dy = e.clientY - this.start.y;
    this.pan(dx, dy);
    this.drag(e.clientX, e.clientY);
  };

  onMouseUp = () => {
    this.dragging = false;
    this.svg.classList.remove("isDragging");
  };

  drag(x: Pixels, y: Pixels) {
    this.dragging = true;
    this.start = { x, y };
    this.svg.classList.add("isDragging");
  }

  goto(x: Pixels, y: Pixels) {
    this.ox = x;
    this.oy = y;
    this.updateTransform();
  }

  pan(dx: Pixels, dy: Pixels) {
    this.ox += dx;
    this.oy += dy;
    this.updateTransform();
  }

  zoom(cx: Pixels, cy: Pixels, dz: number) {
    const zoom = Math.max(0.1, Math.min(3, this.zr * dz));
    if (zoom === this.zr) return;

    const ratio = zoom / this.zr;
    this.ox = cx - (cx - this.ox) * ratio;
    this.oy = cy - (cy - this.oy) * ratio;
    this.zr = zoom;
    this.updateTransform();
  }

  updateTransform() {
    const trans = this.svg.createSVGTransform();
    trans.setTranslate(this.ox, this.oy);

    const scale = this.svg.createSVGTransform();
    scale.setScale(this.zr, this.zr);

    this.g.transform.baseVal.initialize(trans);
    this.g.transform.baseVal.appendItem(scale);
  }
}

export function usePanZoom(
  layout: MapLayout,
  svgRef: React.RefObject<SVGSVGElement | null>,
  gRef: React.RefObject<SVGGElement | null>,
) {
  const controllerRef = useRef(new PanZoomController());
  const tool = useMemo(() => new MapTool(layout), [layout]);

  useEffect(() => {
    if (svgRef.current && gRef.current)
      return controllerRef.current.attach(svgRef.current, gRef.current);
  }, [svgRef, gRef]);

  const centre = useCallback(() => {
    const rect = svgRef.current?.getBoundingClientRect();
    const image = gRef.current?.getBoundingClientRect();
    if (!rect || !image) return;

    const ctrl = controllerRef.current;
    ctrl.goto(
      rect.width / 2 - image.width / 2,
      rect.height / 2 - image.height / 2,
    );
  }, [gRef, svgRef]);

  const gotoCell = useCallback(
    (x: Cells, y: Cells) => {
      const svg = svgRef.current;
      if (!svg) return;
      const ctrl = controllerRef.current;
      const rect = svg.getBoundingClientRect();
      const { x: px, y: py } = tool.getCentre(x, y);
      ctrl.goto(rect.width / 2 - px * ctrl.zr, rect.height / 2 - py * ctrl.zr);
    },
    [svgRef, tool],
  );

  return { centre, gotoCell };
}
