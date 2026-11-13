const slotEligibility = {
  FLEX: ["RB", "WR", "TE"],
  SUPER_FLEX: ["QB", "RB", "WR", "TE"],
  REC_FLEX: ["WR", "TE"],
  WRRB_FLEX: ["RB", "WR"],
  IDP_FLEX: ["DL", "LB", "DB"],
};

const nonStartingSlots = new Set(["BN", "BENCH", "IR", "RESERVE", "TAXI"]);

const getPlayerId = (player) => {
  if (typeof player === "string" || typeof player === "number") {
    return String(player);
  }

  const id =
    player?.player_id ??
    player?.sleeperPlayerId ??
    player?.playerId ??
    player?.id;
  return id === undefined || id === null ? null : String(id);
};

const getPlayerPositions = (player) => {
  const positions = [
    player?.fantasyPositions,
    player?.fantasy_positions,
    player?.position,
  ].find((value) => (Array.isArray(value) ? value.length > 0 : Boolean(value)));

  return (Array.isArray(positions) ? positions : [positions])
    .filter((position) => typeof position === "string")
    .map((position) => position.toUpperCase());
};

const getEligiblePositions = (slot) => {
  const normalizedSlot = slot.toUpperCase();
  if (nonStartingSlots.has(normalizedSlot)) return [];
  return slotEligibility[normalizedSlot] || [normalizedSlot];
};
const getStartingSlots = (rosterPositions) =>
  rosterPositions
    .filter((position) => typeof position === "string")
    .filter((position) => getEligiblePositions(position).length)
    .map((position) => position.toUpperCase());

const { success, failure } = require("./result");

const addEdge = (graph, from, to, capacity, cost, assignment = null) => {
  const forward = {
    to,
    reverseIndex: graph[to].length,
    capacity,
    cost,
    assignment,
  };
  const reverse = {
    to: from,
    reverseIndex: graph[from].length,
    capacity: 0,
    cost: -cost,
    assignment: null,
  };

  graph[from].push(forward);
  graph[to].push(reverse);
};

const getShortestPath = (graph, source, sink) => {
  const distances = Array(graph.length).fill(Infinity);
  const previousNodes = Array(graph.length).fill(-1);
  const previousEdges = Array(graph.length).fill(-1);
  distances[source] = 0;

  for (let iteration = 0; iteration < graph.length - 1; iteration += 1) {
    let updated = false;

    graph.forEach((edges, node) => {
      if (!Number.isFinite(distances[node])) return;

      edges.forEach((edge, edgeIndex) => {
        const distance = distances[node] + edge.cost;
        if (edge.capacity > 0 && distance < distances[edge.to]) {
          distances[edge.to] = distance;
          previousNodes[edge.to] = node;
          previousEdges[edge.to] = edgeIndex;
          updated = true;
        }
      });
    });

    if (!updated) break;
  }

  if (previousNodes[sink] === -1) return null;
  return {
    previousNodes,
    previousEdges,
    distance: distances[sink],
  };
};

const assignRosterSlots = (roster, rosterPositions, getPlayerPoints) => {
  const startedAt = Date.now();
  const rosterId = roster?.rosterId ?? roster?.roster_id ?? null;

  try {
    if (!roster || !Array.isArray(rosterPositions)) {
      return failure(
        "A roster and rosterPositions array are required",
        400,
        "INVALID_LINEUP_INPUT",
      );
    }
    if (typeof getPlayerPoints !== "function") {
      return failure(
        "getPlayerPoints must be a function",
        400,
        "INVALID_LINEUP_INPUT",
      );
    }

    const excludedIds = new Set(
      [...(roster.reserve || []), ...(roster.taxi || [])]
        .map(getPlayerId)
        .filter(Boolean),
    );
    const candidatesById = new Map();
    [...(roster.players || []), ...(roster.starters || [])].forEach(
      (player) => {
        const playerId = getPlayerId(player);
        if (playerId && excludedIds.has(playerId)) return;
        const key = playerId || player;
        if (!candidatesById.has(key)) candidatesById.set(key, player);
      },
    );

    const candidates = [...candidatesById.values()].filter((player) => {
      const playerId = getPlayerId(player);
      return (
        (!playerId || !excludedIds.has(playerId)) &&
        getPlayerPositions(player).length
      );
    });

    const slots = getStartingSlots(rosterPositions);

    let pointsError = null;
    const pointsByPlayer = candidates.map((player, index) => {
      const playerId = getPlayerId(player);
      try {
        const points = getPlayerPoints(player);
        if (!Number.isFinite(points)) {
          console.error("Roster slot player points failed", {
            rosterId,
            index,
            playerId,
            error: "getPlayerPoints must return a finite number",
          });
          pointsError = failure(
            "getPlayerPoints must return a finite number",
            422,
            "INVALID_PLAYER_POINTS",
          );
          return 0;
        }

        return points;
      } catch (error) {
        console.error("Roster slot player points failed", {
          rosterId,
          index,
          playerId,
          error: error.message,
        });
        pointsError = failure(error, 422, "PLAYER_POINTS_LOOKUP_FAILED");
        return 0;
      }
    });
    if (pointsError) return pointsError;

    const source = 0;
    const firstPlayerNode = 1;
    const firstSlotNode = firstPlayerNode + candidates.length;
    const sink = firstSlotNode + slots.length;
    const graph = Array.from({ length: sink + 1 }, () => []);

    candidates.forEach((player, playerIndex) => {
      const playerNode = firstPlayerNode + playerIndex;
      addEdge(graph, source, playerNode, 1, 0);

      const positions = getPlayerPositions(player);
      slots.forEach((slot, slotIndex) => {
        if (
          !getEligiblePositions(slot).some((position) =>
            positions.includes(position),
          )
        ) {
          return;
        }

        addEdge(
          graph,
          playerNode,
          firstSlotNode + slotIndex,
          1,
          -pointsByPlayer[playerIndex],
          { playerIndex, slotIndex },
        );
      });
    });

    slots.forEach((_, slotIndex) => {
      addEdge(graph, firstSlotNode + slotIndex, sink, 1, 0);
    });

    let path = getShortestPath(graph, source, sink);
    let augmentations = 0;
    let matchingComplete = true;
    while (path && path.distance <= 0 && matchingComplete) {
      let node = sink;
      const visitedNodes = new Set();
      const pathEdges = [];
      let pathError;

      while (node !== source) {
        if (visitedNodes.has(node)) {
          pathError = "Roster slot matching path contains a cycle";
          break;
        }
        visitedNodes.add(node);

        const previousNode = path.previousNodes[node];
        const previousEdgeIndex = path.previousEdges[node];
        if (
          previousNode < 0 ||
          previousNode >= graph.length ||
          previousEdgeIndex < 0 ||
          !graph[previousNode][previousEdgeIndex] ||
          graph[previousNode][previousEdgeIndex].to !== node
        ) {
          pathError = "Roster slot matching path is incomplete";
          break;
        }

        const edge = graph[previousNode][previousEdgeIndex];
        if (edge.capacity <= 0) {
          pathError = "Roster slot matching path contains a saturated edge";
          break;
        }
        pathEdges.push({ previousNode, previousEdgeIndex, node });
        node = previousNode;
      }

      if (pathError) {
        matchingComplete = false;
        console.error(
          "Roster slot matching stopped; returning partial lineup",
          {
            rosterId,
            augmentations,
            error: pathError,
          },
        );
      } else {
        pathEdges.forEach(
          ({ previousNode, previousEdgeIndex, node: nextNode }) => {
            const edge = graph[previousNode][previousEdgeIndex];
            edge.capacity -= 1;
            graph[nextNode][edge.reverseIndex].capacity += 1;
          },
        );

        augmentations += 1;

        path = getShortestPath(graph, source, sink);
      }
    }

    const assignments = [];
    graph.slice(firstPlayerNode, firstSlotNode).forEach((edges) => {
      edges.forEach((edge) => {
        if (!edge.assignment || edge.capacity !== 0) return;

        const { playerIndex, slotIndex } = edge.assignment;
        assignments.push({
          player: candidates[playerIndex],
          slot: slots[slotIndex],
          points: pointsByPlayer[playerIndex],
        });
      });
    });

    const assignedPlayers = new Set(assignments.map(({ player }) => player));
    const slotCounts = slots.reduce(
      (counts, slot) => ({
        ...counts,
        [slot]: (counts[slot] || 0) + 1,
      }),
      {},
    );
    const assignedSlotCounts = assignments.reduce(
      (counts, { slot }) => ({
        ...counts,
        [slot]: (counts[slot] || 0) + 1,
      }),
      {},
    );

    const result = {
      assignments,
      totalPoints: assignments.reduce(
        (sum, assignment) => sum + assignment.points,
        0,
      ),
      matchingComplete,
      unassignedPlayers: candidates.filter(
        (player) => !assignedPlayers.has(player),
      ),
      unfilledSlots: Object.entries(slotCounts).flatMap(([slot, count]) =>
        Array(Math.max(count - (assignedSlotCounts[slot] || 0), 0)).fill(slot),
      ),
    };

    return success(result);
  } catch (error) {
    console.error("Roster slot assignment failed", {
      rosterId,
      durationMs: Date.now() - startedAt,
      error: error.message,
    });
    return failure(error, 500, "ROSTER_SLOT_ASSIGNMENT_FAILED");
  }
};

module.exports = { assignRosterSlots, getStartingSlots };
