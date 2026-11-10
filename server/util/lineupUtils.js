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
  return { previousNodes, previousEdges };
};

const assignRosterSlots = (roster, rosterPositions, getPlayerPoints) => {
  if (!roster || !Array.isArray(rosterPositions)) {
    throw new TypeError("A roster and rosterPositions array are required");
  }
  if (typeof getPlayerPoints !== "function") {
    throw new TypeError("getPlayerPoints must be a function");
  }

  const excludedIds = new Set(
    [...(roster.reserve || []), ...(roster.taxi || [])]
      .map(getPlayerId)
      .filter(Boolean),
  );
  const candidatesById = new Map();
  [...(roster.players || []), ...(roster.starters || [])].forEach((player) => {
    const playerId = getPlayerId(player);
    if (playerId && excludedIds.has(playerId)) return;
    const key = playerId || player;
    if (!candidatesById.has(key)) candidatesById.set(key, player);
  });

  const candidates = [...candidatesById.values()].filter(
    (player) => getPlayerPositions(player).length,
  );
  const slots = rosterPositions
    .filter((position) => typeof position === "string")
    .filter((position) => getEligiblePositions(position).length)
    .map((position) => position.toUpperCase());
  const pointsByPlayer = candidates.map((player) => {
    const points = getPlayerPoints(player);
    if (!Number.isFinite(points)) {
      throw new TypeError("getPlayerPoints must return a finite number");
    }
    return points;
  });

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
  while (path) {
    let node = sink;
    while (node !== source) {
      const previousNode = path.previousNodes[node];
      const edge = graph[previousNode][path.previousEdges[node]];
      edge.capacity -= 1;
      graph[node][edge.reverseIndex].capacity += 1;
      node = previousNode;
    }
    path = getShortestPath(graph, source, sink);
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

  return {
    assignments,
    totalPoints: assignments.reduce(
      (sum, assignment) => sum + assignment.points,
      0,
    ),
    unassignedPlayers: candidates.filter(
      (player) => !assignedPlayers.has(player),
    ),
    unfilledSlots: Object.entries(slotCounts).flatMap(([slot, count]) =>
      Array(Math.max(count - (assignedSlotCounts[slot] || 0), 0)).fill(slot),
    ),
  };
};

module.exports = { assignRosterSlots };
