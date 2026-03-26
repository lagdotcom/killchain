import type { Cells, TerrainId } from "./flavours.js";
import { xyId } from "./killchain/EuclideanEngine.js";
import { getMovementCost } from "./killchain/rules.js";
import type { KillChain, TerrainType } from "./killchain/types.js";
import type { TerrainEntity } from "./state/terrain.js";

export interface BFSNode {
  id: string;
  x: Cells;
  y: Cells;
  explored: boolean;
  cost: number;
  parent: string | undefined;
}

export interface BFSEdge {
  cost: number;
  destination: string;
}

export function bfs(
  getEdges: (id: string) => BFSEdge[],
  getNode: (id: string) => BFSNode,
  start: string,
  maxCost = Infinity,
) {
  const q: BFSNode[] = [];
  const visited = new Set<BFSNode>();

  const root = getNode(start);
  root.explored = true;
  root.cost = 0;

  q.push(root);

  while (q.length) {
    const node = q.shift()!;
    visited.add(node);

    for (const edge of getEdges(node.id)) {
      const cost = node.cost + edge.cost;
      if (cost > maxCost) continue;

      const target = getNode(edge.destination);

      if (!target.explored) {
        target.explored = true;
        target.cost = cost;
        target.parent = node.id;
        q.push(target);
      } else if (cost < target.cost) {
        target.cost = cost;
        target.parent = node.id;
      }
    }
  }

  return visited;
}

const directions = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 },
];

function runBfs(
  getCost: (from: TerrainId, to: TerrainId) => number,
  start: TerrainId,
  terrain: TerrainEntity[],
  maxCost = Infinity,
) {
  const nodes = Object.fromEntries(
    terrain.map<[string, BFSNode]>((t) => [
      t.id,
      {
        id: t.id,
        x: t.x,
        y: t.y,
        explored: false,
        cost: Infinity,
        parent: undefined,
      },
    ]),
  );

  const edges = Object.fromEntries(
    terrain.map((t) => [
      t.id,
      directions
        .map(({ x, y }) => xyId(t.x + x, t.y + y))
        .filter((id) => id in nodes)
        .map<BFSEdge>((destination) => ({
          cost: getCost(t.id, destination),
          destination,
        })),
    ]),
  );

  return bfs(
    (id) => edges[id]!,
    (id) => nodes[id]!,
    start,
    maxCost,
  );
}

export function bfsAbsolute(
  start: TerrainId,
  terrain: TerrainEntity[],
  maxCost = Infinity,
) {
  return runBfs(() => 1, start, terrain, maxCost);
}

export function bfsByTerrain(
  g: KillChain<TerrainId>,
  invalidTerrain: Set<TerrainType>,
  start: TerrainId,
  terrain: TerrainEntity[],
  maxCost = Infinity,
) {
  return runBfs(
    (from, to) =>
      g.getUnitAt(to) || invalidTerrain.has(g.getTerrainAt(to).type)
        ? Infinity
        : getMovementCost(g, from, to),
    start,
    terrain,
    maxCost,
  );
}
