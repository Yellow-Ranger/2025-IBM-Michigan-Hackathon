export type LayoutItemType = "machine" | "storage" | "aisle" | "support";

export type LayoutItem = {
  id: string;
  name: string;
  type: LayoutItemType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zone?: string;
  power?: number;
  clearance?: number;
  color?: string;
};

export type LayoutAction =
  | { kind: "move"; id: string; dx: number; dy: number }
  | { kind: "resize"; id: string; width?: number; height?: number }
  | { kind: "rotate"; id: string; rotation: number }
  | { kind: "add"; item: LayoutItem }
  | { kind: "delete"; id: string };

export type LayoutPlan = {
  actions: LayoutAction[];
  summary: string;
  source: "watsonx" | "heuristic";
  raw?: string;
};

export type LayoutBounds = {
  width: number;
  height: number;
};

export const DEFAULT_LAYOUT_BOUNDS: LayoutBounds = {
  width: 120, // feet
  height: 72,
};

export function buildSampleLayout(): LayoutItem[] {
  return [
    {
      id: "cnc-1",
      name: "CNC Mill #1",
      type: "machine",
      x: 18,
      y: 14,
      width: 18,
      height: 10,
      rotation: 0,
      zone: "Machining",
      power: 30,
      clearance: 3,
      color: "#4c8dff",
    },
    {
      id: "cnc-2",
      name: "CNC Mill #2",
      type: "machine",
      x: 44,
      y: 14,
      width: 18,
      height: 10,
      rotation: 0,
      zone: "Machining",
      power: 30,
      clearance: 3,
      color: "#4c8dff",
    },
    {
      id: "weld-1",
      name: "Welding Cell",
      type: "machine",
      x: 18,
      y: 36,
      width: 16,
      height: 12,
      rotation: 0,
      zone: "Fabrication",
      power: 25,
      clearance: 4,
      color: "#f97316",
    },
    {
      id: "storage-1",
      name: "Pallet Rack",
      type: "storage",
      x: 70,
      y: 12,
      width: 28,
      height: 8,
      rotation: 0,
      zone: "Storage",
      clearance: 2,
      color: "#facc15",
    },
    {
      id: "aisle-main",
      name: "Main Aisle",
      type: "aisle",
      x: 14,
      y: 28,
      width: 84,
      height: 6,
      rotation: 0,
      zone: "Transit",
      color: "#0ea5e9",
    },
    {
      id: "dock",
      name: "Loading Dock",
      type: "support",
      x: 86,
      y: 40,
      width: 26,
      height: 20,
      rotation: 0,
      zone: "Shipping",
      clearance: 5,
      color: "#22c55e",
    },
  ];
}

export function applyLayoutActions(
  items: LayoutItem[],
  actions: LayoutAction[],
  bounds: LayoutBounds = DEFAULT_LAYOUT_BOUNDS
): LayoutItem[] {
  return actions.reduce((current, action) => {
    switch (action.kind) {
      case "add":
        return [...current, action.item];
      case "delete":
        return current.filter((item) => item.id !== action.id);
      case "move":
        return current.map((item) => {
          if (item.id !== action.id) return item;
          const moved: LayoutItem = {
            ...item,
            x: item.x + action.dx,
            y: item.y + action.dy,
          };
          return clampToBounds(moved, bounds);
        });
      case "resize":
        return current.map((item) => {
          if (item.id !== action.id) return item;
          const nextWidth = action.width ?? item.width;
          const nextHeight = action.height ?? item.height;
          const resized: LayoutItem = {
            ...item,
            width: Math.max(4, nextWidth),
            height: Math.max(4, nextHeight),
          };
          return clampToBounds(resized, bounds);
        });
      case "rotate":
        return current.map((item) => {
          if (item.id !== action.id) return item;
          return { ...item, rotation: ((action.rotation % 360) + 360) % 360 };
        });
      default:
        return current;
    }
  }, items);
}

export function clampToBounds(
  item: LayoutItem,
  bounds: LayoutBounds = DEFAULT_LAYOUT_BOUNDS
): LayoutItem {
  const clampedX = Math.min(
    Math.max(0, item.x),
    Math.max(0, bounds.width - item.width)
  );
  const clampedY = Math.min(
    Math.max(0, item.y),
    Math.max(0, bounds.height - item.height)
  );

  return {
    ...item,
    x: clampedX,
    y: clampedY,
  };
}

export function buildHeuristicPlan(
  prompt: string,
  items: LayoutItem[],
  bounds: LayoutBounds = DEFAULT_LAYOUT_BOUNDS
): LayoutPlan {
  const lower = prompt.toLowerCase();
  const actions: LayoutAction[] = [];
  const summaryParts: string[] = [];

  const biggestMachine =
    items
      .filter((item) => item.type === "machine")
      .sort((a, b) => b.width * b.height - a.width * a.height)[0] ?? items[0];

  if (lower.includes("add") || lower.includes("new")) {
    const newId = `cell-${Date.now()}`;
    const x = Math.min(bounds.width - 20, Math.max(4, bounds.width * 0.55));
    const y = Math.min(bounds.height - 14, Math.max(4, bounds.height * 0.35));

    actions.push({
      kind: "add",
      item: clampToBounds(
        {
          id: newId,
          name: "New Workcell",
          type: "machine",
          x,
          y,
          width: 16,
          height: 10,
          rotation: 0,
          zone: "Proposed",
          power: 20,
          clearance: 3,
          color: "#a855f7",
        },
        bounds
      ),
    });
    summaryParts.push("Added a new workcell footprint");
  }

  if (
    lower.includes("move") ||
    lower.includes("shift") ||
    lower.includes("closer") ||
    lower.includes("toward")
  ) {
    const dx = lower.includes("left")
      ? -6
      : lower.includes("right")
        ? 6
        : lower.includes("dock")
          ? 5
          : 0;
    const dy = lower.includes("up")
      ? -4
      : lower.includes("down")
        ? 4
        : lower.includes("dock")
          ? -3
          : 0;

    if (biggestMachine) {
      actions.push({ kind: "move", id: biggestMachine.id, dx, dy });
      summaryParts.push(`Shifted ${biggestMachine.name}`);
    }
  }

  if (lower.includes("rotate") || lower.includes("turn")) {
    if (biggestMachine) {
      actions.push({
        kind: "rotate",
        id: biggestMachine.id,
        rotation: ((biggestMachine.rotation ?? 0) + 90) % 360,
      });
      summaryParts.push(`Rotated ${biggestMachine.name} 90°`);
    }
  }

  if (lower.includes("widen") || lower.includes("aisle")) {
    const aisle = items.find((item) => item.type === "aisle");
    if (aisle) {
      actions.push({
        kind: "resize",
        id: aisle.id,
        height: Math.min(bounds.height * 0.25, aisle.height + 2),
      });
      summaryParts.push("Widened main aisle for safety");
    }
  }

  if (actions.length === 0) {
    summaryParts.push("Logged request — no layout changes applied");
  }

  return {
    actions,
    summary: summaryParts.join("; "),
    source: "heuristic",
  };
}
