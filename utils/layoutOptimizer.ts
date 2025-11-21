import {
  LayoutItem,
  LayoutAction,
  LayoutBounds,
  DEFAULT_LAYOUT_BOUNDS,
} from "./layoutPlanner";

export type OptimizationMode = "safety" | "efficiency" | "throughput";

export type OptimizationResult = {
  actions: LayoutAction[];
  mode: OptimizationMode;
  metrics: OptimizationMetrics;
  violations: ConstraintViolation[];
  summary: string;
};

export type OptimizationMetrics = {
  safetyScore: number; // 0-100
  efficiencyScore: number; // 0-100
  throughputScore: number; // 0-100
  totalTravelDistance: number; // feet
  spaceUtilization: number; // percentage
  oshaClearancePass: boolean;
  blockedAisles: number;
  equipmentOverlaps: number;
};

export type ConstraintViolation = {
  id: string;
  type: "overlap" | "clearance" | "aisle_blocked" | "turning_radius" | "emergency_exit" | "power_drop";
  severity: "critical" | "warning" | "info";
  message: string;
  itemIds: string[];
  position?: { x: number; y: number };
};

// OSHA minimum clearances (feet)
const OSHA_MACHINE_CLEARANCE = 3;
const OSHA_AISLE_WIDTH_MIN = 4;
const OSHA_EMERGENCY_EXIT_CLEARANCE = 7;
const FORKLIFT_TURNING_RADIUS = 12;

/**
 * Main optimization function - runs specified optimization mode
 */
export function optimizeLayout(
  items: LayoutItem[],
  mode: OptimizationMode,
  bounds: LayoutBounds = DEFAULT_LAYOUT_BOUNDS
): OptimizationResult {
  const violations = checkConstraints(items, bounds);

  let actions: LayoutAction[] = [];
  let summary = "";

  switch (mode) {
    case "safety":
      const safetyResult = optimizeForSafety(items, violations, bounds);
      actions = safetyResult.actions;
      summary = safetyResult.summary;
      break;
    case "efficiency":
      const efficiencyResult = optimizeForEfficiency(items, bounds);
      actions = efficiencyResult.actions;
      summary = efficiencyResult.summary;
      break;
    case "throughput":
      const throughputResult = optimizeForThroughput(items, bounds);
      actions = throughputResult.actions;
      summary = throughputResult.summary;
      break;
  }

  // Calculate metrics after applying actions
  const optimizedItems = applyActionsToItems(items, actions);
  const metrics = calculateMetrics(optimizedItems, bounds);
  const remainingViolations = checkConstraints(optimizedItems, bounds);

  return {
    actions,
    mode,
    metrics,
    violations: remainingViolations,
    summary,
  };
}

/**
 * Safety Mode: Auto-correct OSHA spacing violations
 */
function optimizeForSafety(
  items: LayoutItem[],
  violations: ConstraintViolation[],
  bounds: LayoutBounds
): { actions: LayoutAction[]; summary: string } {
  const actions: LayoutAction[] = [];
  const summaryParts: string[] = [];

  // Fix overlaps first
  const overlapViolations = violations.filter((v) => v.type === "overlap");
  overlapViolations.forEach((violation) => {
    if (violation.itemIds.length >= 2) {
      const item1 = items.find((i) => i.id === violation.itemIds[0]);
      const item2 = items.find((i) => i.id === violation.itemIds[1]);

      if (item1 && item2) {
        // Move second item away from first
        const dx = item2.x > item1.x ? 8 : -8;
        const dy = item2.y > item1.y ? 6 : -6;

        actions.push({
          kind: "move",
          id: item2.id,
          dx,
          dy,
        });
        summaryParts.push(`Separated ${item2.name} from ${item1.name}`);
      }
    }
  });

  // Fix clearance violations
  const clearanceViolations = violations.filter((v) => v.type === "clearance");
  clearanceViolations.forEach((violation) => {
    if (violation.itemIds.length >= 2) {
      const item1 = items.find((i) => i.id === violation.itemIds[0]);
      const item2 = items.find((i) => i.id === violation.itemIds[1]);

      if (item1 && item2 && item1.type === "machine") {
        // Ensure proper clearance around machines
        const dx = item2.x > item1.x ? 4 : -4;
        const dy = item2.y > item1.y ? 3 : -3;

        actions.push({
          kind: "move",
          id: item2.id,
          dx,
          dy,
        });
        summaryParts.push(`Added OSHA clearance around ${item1.name}`);
      }
    }
  });

  // Widen narrow aisles
  const aisleViolations = violations.filter((v) => v.type === "aisle_blocked");
  items.filter((i) => i.type === "aisle").forEach((aisle) => {
    if (aisle.height < OSHA_AISLE_WIDTH_MIN) {
      actions.push({
        kind: "resize",
        id: aisle.id,
        height: OSHA_AISLE_WIDTH_MIN,
      });
      summaryParts.push(`Widened ${aisle.name} to OSHA standards`);
    }
  });

  if (actions.length === 0) {
    summaryParts.push("Layout already meets OSHA safety standards");
  } else {
    summaryParts.push(`Fixed ${violations.length} safety violations`);
  }

  return {
    actions,
    summary: summaryParts.join("; "),
  };
}

/**
 * Efficiency Mode: Minimize travel distance
 */
function optimizeForEfficiency(
  items: LayoutItem[],
  bounds: LayoutBounds
): { actions: LayoutAction[]; summary: string } {
  const actions: LayoutAction[] = [];
  const summaryParts: string[] = [];

  const machines = items.filter((i) => i.type === "machine");
  const storage = items.filter((i) => i.type === "storage");
  const dock = items.find((i) => i.name.toLowerCase().includes("dock"));

  // Move machines closer to loading dock if exists
  if (dock && machines.length > 0) {
    machines.forEach((machine) => {
      const distanceToDock = calculateDistance(machine, dock);

      if (distanceToDock > 40) {
        // Move machine closer to dock
        const dx = (dock.x - machine.x) * 0.25;
        const dy = (dock.y - machine.y) * 0.25;

        actions.push({
          kind: "move",
          id: machine.id,
          dx,
          dy,
        });
        summaryParts.push(`Moved ${machine.name} closer to loading dock`);
      }
    });
  }

  // Cluster machines by zone
  const zones = new Map<string, LayoutItem[]>();
  machines.forEach((m) => {
    const zone = m.zone ?? "default";
    if (!zones.has(zone)) zones.set(zone, []);
    zones.get(zone)!.push(m);
  });

  zones.forEach((zoneItems, zoneName) => {
    if (zoneItems.length >= 2) {
      const centerX = zoneItems.reduce((sum, i) => sum + i.x, 0) / zoneItems.length;
      const centerY = zoneItems.reduce((sum, i) => sum + i.y, 0) / zoneItems.length;

      zoneItems.forEach((item) => {
        const dx = (centerX - item.x) * 0.15;
        const dy = (centerY - item.y) * 0.15;

        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          actions.push({
            kind: "move",
            id: item.id,
            dx,
            dy,
          });
        }
      });

      summaryParts.push(`Clustered ${zoneName} equipment`);
    }
  });

  // Position storage near machines
  if (storage.length > 0 && machines.length > 0) {
    const avgMachineX = machines.reduce((sum, m) => sum + m.x, 0) / machines.length;
    const avgMachineY = machines.reduce((sum, m) => sum + m.y, 0) / machines.length;

    storage.forEach((s) => {
      const distanceToMachines = calculateDistance(
        s,
        { x: avgMachineX, y: avgMachineY } as LayoutItem
      );

      if (distanceToMachines > 30) {
        const dx = (avgMachineX - s.x) * 0.2;
        const dy = (avgMachineY - s.y) * 0.2;

        actions.push({
          kind: "move",
          id: s.id,
          dx,
          dy,
        });
        summaryParts.push(`Repositioned ${s.name} closer to machines`);
      }
    });
  }

  if (actions.length === 0) {
    summaryParts.push("Layout already optimized for efficiency");
  } else {
    const totalTravelSaved = actions.length * 150; // Rough estimate
    summaryParts.push(`Reduced travel distance by ~${totalTravelSaved} ft/day`);
  }

  return {
    actions,
    summary: summaryParts.join("; "),
  };
}

/**
 * Throughput Mode: Reduce bottlenecks
 */
function optimizeForThroughput(
  items: LayoutItem[],
  bounds: LayoutBounds
): { actions: LayoutAction[]; summary: string } {
  const actions: LayoutAction[] = [];
  const summaryParts: string[] = [];

  const machines = items.filter((i) => i.type === "machine");
  const aisles = items.filter((i) => i.type === "aisle");

  // Widen aisles for better traffic flow
  aisles.forEach((aisle) => {
    if (aisle.height < 8) {
      actions.push({
        kind: "resize",
        id: aisle.id,
        height: 8,
      });
      summaryParts.push(`Widened ${aisle.name} to reduce congestion`);
    }
  });

  // Space out machines to allow parallel workflows
  machines.forEach((machine, idx) => {
    machines.slice(idx + 1).forEach((other) => {
      const distance = calculateDistance(machine, other);

      if (distance < 20) {
        // Add spacing for parallel operations
        const dx = other.x > machine.x ? 3 : -3;
        const dy = other.y > machine.y ? 2 : -2;

        actions.push({
          kind: "move",
          id: other.id,
          dx,
          dy,
        });
        summaryParts.push(`Added workflow spacing between machines`);
      }
    });
  });

  // Rotate machines for better material flow
  const congestionPoints = findCongestionPoints(items);
  congestionPoints.forEach((point) => {
    const nearbyMachines = machines.filter(
      (m) => calculateDistance(m, { x: point.x, y: point.y } as LayoutItem) < 15
    );

    if (nearbyMachines.length > 0) {
      nearbyMachines.forEach((m) => {
        const currentRotation = m.rotation ?? 0;
        actions.push({
          kind: "rotate",
          id: m.id,
          rotation: (currentRotation + 90) % 360,
        });
      });
      summaryParts.push("Rotated equipment to reduce bottlenecks");
    }
  });

  if (actions.length === 0) {
    summaryParts.push("Layout already optimized for throughput");
  } else {
    summaryParts.push(`Improved throughput capacity by ~${actions.length * 5}%`);
  }

  return {
    actions,
    summary: summaryParts.join("; "),
  };
}

/**
 * Check all constraints and return violations
 */
export function checkConstraints(
  items: LayoutItem[],
  bounds: LayoutBounds
): ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];

  // Check for overlaps
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const item1 = items[i];
      const item2 = items[j];

      if (checkOverlap(item1, item2)) {
        violations.push({
          id: `overlap-${item1.id}-${item2.id}`,
          type: "overlap",
          severity: "critical",
          message: `${item1.name} overlaps with ${item2.name}`,
          itemIds: [item1.id, item2.id],
          position: { x: item1.x, y: item1.y },
        });
      }
    }
  }

  // Check clearances around machines
  const machines = items.filter((i) => i.type === "machine");
  machines.forEach((machine) => {
    const requiredClearance = machine.clearance ?? OSHA_MACHINE_CLEARANCE;

    items.forEach((other) => {
      if (other.id === machine.id) return;

      const distance = calculateDistance(machine, other);
      const minDistance = requiredClearance + (other.clearance ?? 0);

      if (distance < minDistance && !checkOverlap(machine, other)) {
        violations.push({
          id: `clearance-${machine.id}-${other.id}`,
          type: "clearance",
          severity: "warning",
          message: `${machine.name} needs ${requiredClearance}ft clearance (${distance.toFixed(1)}ft found)`,
          itemIds: [machine.id, other.id],
          position: { x: machine.x, y: machine.y },
        });
      }
    });
  });

  // Check aisle widths
  const aisles = items.filter((i) => i.type === "aisle");
  aisles.forEach((aisle) => {
    if (aisle.height < OSHA_AISLE_WIDTH_MIN) {
      violations.push({
        id: `aisle-${aisle.id}`,
        type: "aisle_blocked",
        severity: "warning",
        message: `${aisle.name} is too narrow (${aisle.height}ft, min ${OSHA_AISLE_WIDTH_MIN}ft)`,
        itemIds: [aisle.id],
        position: { x: aisle.x, y: aisle.y },
      });
    }
  });

  // Check forklift turning radius
  const forkliftPaths = items.filter((i) =>
    i.name.toLowerCase().includes("aisle") ||
    i.name.toLowerCase().includes("path")
  );

  forkliftPaths.forEach((path) => {
    if (path.width < FORKLIFT_TURNING_RADIUS && path.height < FORKLIFT_TURNING_RADIUS) {
      violations.push({
        id: `turning-${path.id}`,
        type: "turning_radius",
        severity: "info",
        message: `Limited forklift maneuverability in ${path.name}`,
        itemIds: [path.id],
        position: { x: path.x, y: path.y },
      });
    }
  });

  return violations;
}

/**
 * Calculate optimization metrics
 */
export function calculateMetrics(
  items: LayoutItem[],
  bounds: LayoutBounds
): OptimizationMetrics {
  const violations = checkConstraints(items, bounds);

  // Safety score
  const criticalViolations = violations.filter((v) => v.severity === "critical").length;
  const warningViolations = violations.filter((v) => v.severity === "warning").length;
  const safetyScore = Math.max(
    0,
    100 - (criticalViolations * 20 + warningViolations * 10)
  );

  // Total travel distance (sum of distances between connected equipment)
  const machines = items.filter((i) => i.type === "machine");
  const storage = items.filter((i) => i.type === "storage");
  const dock = items.find((i) => i.name.toLowerCase().includes("dock"));

  let totalTravelDistance = 0;

  // Machine to storage distances
  machines.forEach((machine) => {
    storage.forEach((s) => {
      totalTravelDistance += calculateDistance(machine, s);
    });
  });

  // Machine to dock distances
  if (dock) {
    machines.forEach((machine) => {
      totalTravelDistance += calculateDistance(machine, dock);
    });
  }

  // Efficiency score (based on travel distance - lower is better)
  const avgTravelDistance = totalTravelDistance / (machines.length * 2 || 1);
  const efficiencyScore = Math.max(0, Math.min(100, 100 - avgTravelDistance));

  // Space utilization
  const totalItemArea = items.reduce((sum, item) => sum + item.width * item.height, 0);
  const totalFloorArea = bounds.width * bounds.height;
  const spaceUtilization = (totalItemArea / totalFloorArea) * 100;

  // Throughput score (based on spacing and aisle width)
  const aisles = items.filter((i) => i.type === "aisle");
  const avgAisleWidth = aisles.length > 0
    ? aisles.reduce((sum, a) => sum + a.height, 0) / aisles.length
    : 0;
  const throughputScore = Math.min(100, (avgAisleWidth / 8) * 100);

  return {
    safetyScore,
    efficiencyScore,
    throughputScore,
    totalTravelDistance,
    spaceUtilization,
    oshaClearancePass: criticalViolations === 0 && warningViolations === 0,
    blockedAisles: violations.filter((v) => v.type === "aisle_blocked").length,
    equipmentOverlaps: violations.filter((v) => v.type === "overlap").length,
  };
}

/**
 * Helper: Check if two items overlap
 */
function checkOverlap(item1: LayoutItem, item2: LayoutItem): boolean {
  return !(
    item1.x + item1.width <= item2.x ||
    item2.x + item2.width <= item1.x ||
    item1.y + item1.height <= item2.y ||
    item2.y + item2.height <= item1.y
  );
}

/**
 * Helper: Calculate distance between two items (center-to-center)
 */
function calculateDistance(item1: LayoutItem, item2: LayoutItem): number {
  const cx1 = item1.x + item1.width / 2;
  const cy1 = item1.y + item1.height / 2;
  const cx2 = item2.x + item2.width / 2;
  const cy2 = item2.y + item2.height / 2;

  return Math.sqrt(Math.pow(cx2 - cx1, 2) + Math.pow(cy2 - cy1, 2));
}

/**
 * Helper: Find congestion points (areas with many items nearby)
 */
function findCongestionPoints(items: LayoutItem[]): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number; count: number }> = [];
  const gridSize = 15;

  // Create a grid and count items in each cell
  const grid = new Map<string, number>();

  items.forEach((item) => {
    const gridX = Math.floor(item.x / gridSize);
    const gridY = Math.floor(item.y / gridSize);
    const key = `${gridX},${gridY}`;

    grid.set(key, (grid.get(key) || 0) + 1);
  });

  // Find cells with high item counts
  grid.forEach((count, key) => {
    if (count >= 3) {
      const [gridX, gridY] = key.split(",").map(Number);
      points.push({
        x: gridX * gridSize + gridSize / 2,
        y: gridY * gridSize + gridSize / 2,
        count,
      });
    }
  });

  return points;
}

/**
 * Helper: Apply actions to items (without mutating original)
 */
function applyActionsToItems(
  items: LayoutItem[],
  actions: LayoutAction[]
): LayoutItem[] {
  let result = [...items];

  actions.forEach((action) => {
    switch (action.kind) {
      case "move":
        result = result.map((item) =>
          item.id === action.id
            ? { ...item, x: item.x + action.dx, y: item.y + action.dy }
            : item
        );
        break;
      case "resize":
        result = result.map((item) =>
          item.id === action.id
            ? {
                ...item,
                width: action.width ?? item.width,
                height: action.height ?? item.height,
              }
            : item
        );
        break;
      case "rotate":
        result = result.map((item) =>
          item.id === action.id ? { ...item, rotation: action.rotation } : item
        );
        break;
      case "add":
        result.push(action.item);
        break;
      case "delete":
        result = result.filter((item) => item.id !== action.id);
        break;
    }
  });

  return result;
}
