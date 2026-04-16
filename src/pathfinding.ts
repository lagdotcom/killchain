import type { Cells, Feet, TerrainId } from "./flavours.js";
import { type XY, xyId } from "./killchain/EuclideanEngine.js";
import { getMovementCost } from "./killchain/rules.js";
import type { KillChain, TerrainType } from "./killchain/types.js";
import MinHeap from "./MinHeap.js";
import type { MapEntity, MapLayout } from "./state/maps.js";

export type AdjacencyFn = (x: Cells, y: Cells) => XY[];

export const squareAdjacency: AdjacencyFn = (x, y) => [
  { x: x + 1, y },
  { x, y: y + 1 },
  { x: x - 1, y },
  { x, y: y - 1 },
];

export const hexAdjacencyEvenQ: AdjacencyFn = (x, y) =>
  x % 2 === 0
    ? [
        { x: x + 1, y: y - 1 },
        { x: x + 1, y },
        { x, y: y + 1 },
        { x: x - 1, y },
        { x: x - 1, y: y - 1 },
        { x, y: y - 1 },
      ]
    : [
        { x: x + 1, y },
        { x: x + 1, y: y + 1 },
        { x, y: y + 1 },
        { x: x - 1, y: y + 1 },
        { x: x - 1, y },
        { x, y: y - 1 },
      ];

export const hexAdjacencyOddQ: AdjacencyFn = (x, y) =>
  x % 2 === 0
    ? [
        { x: x + 1, y },
        { x: x + 1, y: y + 1 },
        { x, y: y + 1 },
        { x: x - 1, y: y + 1 },
        { x: x - 1, y },
        { x, y: y - 1 },
      ]
    : [
        { x: x + 1, y: y - 1 },
        { x: x + 1, y },
        { x, y: y + 1 },
        { x: x - 1, y },
        { x: x - 1, y: y - 1 },
        { x, y: y - 1 },
      ];

const adjacencyByLayout: Record<MapLayout, AdjacencyFn> = {
  square: squareAdjacency,
};

export interface PathNode extends XY {
  id: string;
  cost: Feet;
  parent: string | undefined;
}

export interface PathEdge {
  cost: Feet;
  destination: string;
}

export function shortestPath(
  getEdges: (id: string) => PathEdge[],
  getNode: (id: string) => PathNode,
  start: string,
  maxCost = Infinity,
) {
  const finalized = new Map<string, PathNode>();
  const pq = new MinHeap<PathNode>();

  const root = getNode(start);
  root.cost = 0;
  pq.push(root);

  while (pq.length) {
    const node = pq.pop()!;

    // Lazy deletion: skip if already finalized at a lower cost
    if (finalized.has(node.id)) continue;
    finalized.set(node.id, node);

    for (const edge of getEdges(node.id)) {
      const cost = node.cost + edge.cost;
      if (cost > maxCost) continue;

      const target = getNode(edge.destination);
      if (finalized.has(target.id)) continue;

      if (cost < target.cost) {
        target.cost = cost;
        target.parent = node.id;
        pq.push(target);
      }
    }
  }

  return finalized;
}

function runSearch(
  map: MapEntity,
  getCost: (from: TerrainId, to: TerrainId) => Feet,
  start: TerrainId,
  maxCost: Feet = Infinity,
) {
  const adjacency = adjacencyByLayout[map.layout];

  const edges: Record<TerrainId, PathEdge[]> = {};
  const nodes: Record<TerrainId, PathNode> = {};
  for (const [id, cell] of Object.entries(map.cells.entities)) {
    nodes[id] = { id, x: cell.x, y: cell.y, cost: Infinity, parent: undefined };

    const cellEdges: PathEdge[] = [];
    for (const target of adjacency(cell.x, cell.y)) {
      const destination = xyId(target.x, target.y);
      const dest = map.cells.entities[destination];
      if (dest) cellEdges.push({ destination, cost: getCost(id, destination) });
    }
    edges[id] = cellEdges;
  }

  return shortestPath(
    (id) => edges[id] ?? [],
    (id) =>
      nodes[id] ?? {
        id,
        x: NaN,
        y: NaN,
        cost: Infinity,
        parent: undefined,
      },
    start,
    maxCost,
  );
}

export function searchAbsolute(
  map: MapEntity,
  start: TerrainId,
  maxCost: Feet = Infinity,
) {
  return runSearch(map, () => map.cellSize, start, maxCost);
}

export function searchByTerrain(
  g: KillChain<TerrainId>,
  map: MapEntity,
  invalidTerrain: Set<TerrainType>,
  start: TerrainId,
  maxCost: Feet = Infinity,
  flying = false,
) {
  return runSearch(
    map,
    (from, to) => {
      if (g.getUnitAt(to)) return Infinity;
      if (!flying && invalidTerrain.has(g.getTerrainAt(to).type))
        return Infinity;
      return flying ? map.cellSize : getMovementCost(g, from, to);
    },
    start,
    maxCost,
  );
}
