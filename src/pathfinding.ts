import type { Cells, TerrainId } from "./flavours.js";
import { xyId } from "./killchain/EuclideanEngine.js";
import { getMovementCost } from "./killchain/rules.js";
import type { KillChain, TerrainType } from "./killchain/types.js";
import type { TerrainEntity } from "./state/terrain.js";

export interface PathNode {
  id: string;
  x: Cells;
  y: Cells;
  cost: number;
  parent: string | undefined;
}

export interface PathEdge {
  cost: number;
  destination: string;
}

class MinHeap {
  private heap: PathNode[] = [];

  get length() {
    return this.heap.length;
  }

  push(node: PathNode) {
    this.heap.push(node);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): PathNode | undefined {
    const first = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0 && last) {
      this.heap[0] = last;
      this.sinkDown(0);
    }
    return first;
  }

  private bubbleUp(i: number) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.heap[i]!.cost >= this.heap[parent]!.cost) break;
      [this.heap[i], this.heap[parent]] = [this.heap[parent]!, this.heap[i]!];
      i = parent;
    }
  }

  private sinkDown(i: number) {
    const n = this.heap.length;
    let smallest = i;
    for (;;) {
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < n && this.heap[left]!.cost < this.heap[smallest]!.cost)
        smallest = left;
      if (right < n && this.heap[right]!.cost < this.heap[smallest]!.cost)
        smallest = right;
      if (smallest === i) break;
      [this.heap[i], this.heap[smallest]] = [
        this.heap[smallest]!,
        this.heap[i]!,
      ];
      i = smallest;
    }
  }
}

export function shortestPath(
  getEdges: (id: string) => PathEdge[],
  getNode: (id: string) => PathNode,
  start: string,
  maxCost = Infinity,
) {
  const finalized = new Map<string, PathNode>();
  const pq = new MinHeap();

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

export type Adjacency = (x: number, y: number) => { x: number; y: number }[];

export const squareAdjacency: Adjacency = (x, y) => [
  { x: x + 1, y },
  { x, y: y + 1 },
  { x: x - 1, y },
  { x, y: y - 1 },
];

export const hexAdjacencyEvenQ: Adjacency = (x, y) =>
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

export const hexAdjacencyOddQ: Adjacency = (x, y) =>
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

function runSearch(
  getCost: (from: TerrainId, to: TerrainId) => number,
  adjacency: Adjacency,
  start: TerrainId,
  terrain: TerrainEntity[],
  maxCost = Infinity,
) {
  const terrainIds = new Set(terrain.map((t) => t.id));

  const nodes = Object.fromEntries(
    terrain.map<[string, PathNode]>((t) => [
      t.id,
      { id: t.id, x: t.x, y: t.y, cost: Infinity, parent: undefined },
    ]),
  );

  const edges = Object.fromEntries(
    terrain.map((t) => [
      t.id,
      adjacency(t.x, t.y)
        .map(({ x, y }) => xyId(x, y) as TerrainId)
        .filter((id) => terrainIds.has(id))
        .map<PathEdge>((destination) => ({
          cost: getCost(t.id, destination),
          destination,
        })),
    ]),
  );

  return shortestPath(
    (id) => edges[id] ?? [],
    (id) =>
      nodes[id] ?? {
        id,
        x: 0 as Cells,
        y: 0 as Cells,
        cost: Infinity,
        parent: undefined,
      },
    start,
    maxCost,
  );
}

export function searchAbsolute(
  adjacency: Adjacency,
  start: TerrainId,
  terrain: TerrainEntity[],
  maxCost = Infinity,
) {
  return runSearch(() => 1, adjacency, start, terrain, maxCost);
}

export function searchByTerrain(
  g: KillChain<TerrainId>,
  invalidTerrain: Set<TerrainType>,
  adjacency: Adjacency,
  start: TerrainId,
  terrain: TerrainEntity[],
  maxCost = Infinity,
) {
  return runSearch(
    (from, to) =>
      g.getUnitAt(to) || invalidTerrain.has(g.getTerrainAt(to).type)
        ? Infinity
        : getMovementCost(g, from, to),
    adjacency,
    start,
    terrain,
    maxCost,
  );
}
