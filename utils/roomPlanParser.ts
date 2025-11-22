import * as FileSystem from "expo-file-system/legacy";

/**
 * RoomPlan JSON structure based on Apple's CapturedRoom format
 * https://developer.apple.com/documentation/roomplan/capturedroom
 */

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Size3D {
  width: number;
  height: number;
  depth: number;
}

export interface Transform {
  position: Point3D;
  rotation?: {
    x: number;
    y: number;
    z: number;
    w: number; // quaternion
  };
}

export interface RoomPlanWall {
  identifier: string;
  transform: Transform;
  dimensions: Size3D;
  curve?: any; // For curved walls
}

export interface RoomPlanOpening {
  identifier: string;
  transform: Transform;
  dimensions: Size3D;
  type: "door" | "window" | "opening";
}

export interface RoomPlanObject {
  identifier: string;
  transform: Transform;
  dimensions: Size3D;
  category:
    | "storage"
    | "refrigerator"
    | "stove"
    | "bed"
    | "sink"
    | "washerDryer"
    | "toilet"
    | "bathtub"
    | "oven"
    | "dishwasher"
    | "table"
    | "sofa"
    | "chair"
    | "fireplace"
    | "television"
    | "stairs";
  confidence: "low" | "medium" | "high";
}

export interface RoomPlanSurface {
  identifier: string;
  category: "wall" | "floor" | "ceiling" | "door" | "window" | "opening";
  transform: Transform;
  dimensions: Size3D;
  curve?: any;
}

export interface CapturedRoom {
  walls: RoomPlanWall[];
  doors: RoomPlanOpening[];
  windows: RoomPlanOpening[];
  openings: RoomPlanOpening[];
  objects: RoomPlanObject[];
  surfaces?: RoomPlanSurface[];
}

// 2D Floorplan representation
export interface Point2D {
  x: number;
  y: number;
}

export interface FloorplanWall {
  start: Point2D;
  end: Point2D;
  thickness: number;
  height: number;
}

export interface FloorplanOpening {
  position: Point2D;
  width: number;
  type: "door" | "window" | "opening";
  wallIndex?: number; // Reference to which wall it's in
}

export interface FloorplanObject {
  position: Point2D;
  width: number;
  depth: number;
  rotation: number; // in degrees
  category: string;
  label?: string;
}

export interface FloorplanBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
}

export interface Floorplan2D {
  walls: FloorplanWall[];
  doors: FloorplanOpening[];
  windows: FloorplanOpening[];
  objects: FloorplanObject[];
  bounds: FloorplanBounds;
  scale: number; // Scale factor from meters to display units
}

/**
 * Load and parse RoomPlan JSON file
 */
export async function loadRoomPlanJSON(
  jsonUrl: string
): Promise<CapturedRoom | null> {
  try {
    console.log("[RoomPlanParser] Loading JSON from:", jsonUrl);
    const jsonContent = await FileSystem.readAsStringAsync(jsonUrl);
    const parsed = JSON.parse(jsonContent) as CapturedRoom;
    console.log("[RoomPlanParser] Parsed room data:", {
      walls: parsed.walls?.length || 0,
      doors: parsed.doors?.length || 0,
      windows: parsed.windows?.length || 0,
      objects: parsed.objects?.length || 0,
    });
    return parsed;
  } catch (error) {
    console.error("[RoomPlanParser] Failed to load JSON:", error);
    return null;
  }
}

/**
 * Convert quaternion rotation to euler angles (in radians)
 */
function quaternionToEuler(q: { x: number; y: number; z: number; w: number }): {
  x: number;
  y: number;
  z: number;
} {
  // Convert quaternion to euler angles
  const sinr_cosp = 2 * (q.w * q.x + q.y * q.z);
  const cosr_cosp = 1 - 2 * (q.x * q.x + q.y * q.y);
  const roll = Math.atan2(sinr_cosp, cosr_cosp);

  const sinp = 2 * (q.w * q.y - q.z * q.x);
  const pitch =
    Math.abs(sinp) >= 1 ? Math.sign(sinp) * (Math.PI / 2) : Math.asin(sinp);

  const siny_cosp = 2 * (q.w * q.z + q.x * q.y);
  const cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
  const yaw = Math.atan2(siny_cosp, cosy_cosp);

  return { x: roll, y: pitch, z: yaw };
}

/**
 * Get rotation angle in degrees from transform (around Y axis for top-down view)
 */
function getRotationDegrees(transform: Transform): number {
  if (!transform.rotation) return 0;

  const euler = quaternionToEuler(transform.rotation);
  // Y-axis rotation is what matters for top-down view
  return (euler.y * 180) / Math.PI;
}

/**
 * Convert 3D CapturedRoom to 2D floorplan
 * Projects onto XZ plane (top-down view, Y is up)
 */
export function convertTo2DFloorplan(room: CapturedRoom): Floorplan2D {
  const walls: FloorplanWall[] = [];
  const doors: FloorplanOpening[] = [];
  const windows: FloorplanOpening[] = [];
  const objects: FloorplanObject[] = [];

  let minX = Infinity,
    maxX = -Infinity;
  let minZ = Infinity,
    maxZ = -Infinity;

  console.log("[RoomPlanParser] convertTo2DFloorplan input counts:", {
    walls: room.walls?.length || 0,
    surfaces: room.surfaces?.length || 0,
    doors: room.doors?.length || 0,
    windows: room.windows?.length || 0,
    objects: room.objects?.length || 0,
  });

  // Detect "simplified" RoomPlan JSON that omits wall positions
  const hasWalls = room.walls && room.walls.length > 0;
  const hasAnyWallPosition =
    hasWalls && room.walls!.some((w) => !!w?.transform?.position);

  if (hasWalls && !hasAnyWallPosition) {
    const errorMessage =
      "RoomPlan simplified JSON detected (walls have no positions). Please export the Full RoomPlan JSON to generate a floorplan.";
    console.error("[RoomPlanParser]", errorMessage, {
      wallCount: room.walls.length,
    });
    throw new Error(errorMessage);
  }

  // Prefer explicit walls array; if empty, fall back to surfaces categorized as walls
  const wallSources: { transform?: Transform; dimensions?: Size3D }[] =
    room.walls && room.walls.length > 0
      ? room.walls
      : room.surfaces?.filter((s) => s.category === "wall") || [];

  // Process walls - RoomPlan walls are centered rectangles
  wallSources.forEach((wall, index) => {
    // Defensive checks in case the RoomPlan JSON has partial/missing data
    if (!wall || !wall.transform || !wall.transform.position || !wall.dimensions) {
      console.warn("[RoomPlanParser] Skipping wall with missing transform/position/dimensions", {
        index,
        hasWall: !!wall,
        hasTransform: !!wall?.transform,
        hasPosition: !!wall?.transform && "position" in wall.transform,
        hasDimensions: !!wall?.dimensions,
      });
      return;
    }

    const pos = wall.transform.position;
    const dim = wall.dimensions;
    const rotation = getRotationDegrees(wall.transform);

    // Calculate wall endpoints based on rotation
    // Wall width is along the wall's local X axis
    const halfWidth = dim.width / 2;
    const radians = (rotation * Math.PI) / 180;

    const start: Point2D = {
      x: pos.x - halfWidth * Math.cos(radians),
      y: pos.z - halfWidth * Math.sin(radians),
    };

    const end: Point2D = {
      x: pos.x + halfWidth * Math.cos(radians),
      y: pos.z + halfWidth * Math.sin(radians),
    };

    walls.push({
      start,
      end,
      thickness: dim.depth || 0.1, // Wall thickness, default to 0.1m
      height: dim.height,
    });

    // Update bounds
    minX = Math.min(minX, start.x, end.x);
    maxX = Math.max(maxX, start.x, end.x);
    minZ = Math.min(minZ, start.y, end.y);
    maxZ = Math.max(maxZ, start.y, end.y);
  });

  // Process doors
  room.doors?.forEach((door) => {
    const pos = door.transform.position;
    doors.push({
      position: { x: pos.x, y: pos.z },
      width: door.dimensions.width,
      type: "door",
    });

    minX = Math.min(minX, pos.x);
    maxX = Math.max(maxX, pos.x);
    minZ = Math.min(minZ, pos.z);
    maxZ = Math.max(maxZ, pos.z);
  });

  // Process windows
  room.windows?.forEach((window) => {
    const pos = window.transform.position;
    windows.push({
      position: { x: pos.x, y: pos.z },
      width: window.dimensions.width,
      type: "window",
    });

    minX = Math.min(minX, pos.x);
    maxX = Math.max(maxX, pos.x);
    minZ = Math.min(minZ, pos.z);
    maxZ = Math.max(maxZ, pos.z);
  });

  // Process objects
  room.objects?.forEach((obj) => {
    const pos = obj.transform.position;
    objects.push({
      position: { x: pos.x, y: pos.z },
      width: obj.dimensions.width,
      depth: obj.dimensions.depth,
      rotation: getRotationDegrees(obj.transform),
      category: obj.category,
      label: obj.category.charAt(0).toUpperCase() + obj.category.slice(1),
    });

    // Update bounds considering object size
    const hw = obj.dimensions.width / 2;
    const hd = obj.dimensions.depth / 2;
    minX = Math.min(minX, pos.x - hw);
    maxX = Math.max(maxX, pos.x + hw);
    minZ = Math.min(minZ, pos.z - hd);
    maxZ = Math.max(maxZ, pos.z + hd);
  });

  const bounds: FloorplanBounds = {
    minX: minX === Infinity ? 0 : minX,
    maxX: maxX === -Infinity ? 10 : maxX,
    minY: minZ === Infinity ? 0 : minZ,
    maxY: maxZ === -Infinity ? 10 : maxZ,
    width: maxX - minX || 10,
    height: maxZ - minZ || 10,
  };

  return {
    walls,
    doors,
    windows,
    objects,
    bounds,
    scale: 1, // Will be calculated when rendering
  };
}

/**
 * Scale floorplan to fit within target dimensions
 */
export function scaleFloorplanToFit(
  floorplan: Floorplan2D,
  targetWidth: number,
  targetHeight: number,
  padding: number = 40
): Floorplan2D {
  const availableWidth = targetWidth - 2 * padding;
  const availableHeight = targetHeight - 2 * padding;

  const scaleX = availableWidth / floorplan.bounds.width;
  const scaleY = availableHeight / floorplan.bounds.height;
  const scale = Math.min(scaleX, scaleY);

  return {
    ...floorplan,
    scale,
  };
}

/**
 * Convert world coordinates to screen coordinates
 */
export function worldToScreen(
  worldPos: Point2D,
  floorplan: Floorplan2D,
  canvasWidth: number,
  canvasHeight: number,
  padding: number = 40
): Point2D {
  const { bounds, scale } = floorplan;

  // Translate to origin, scale, then center in canvas
  const x = (worldPos.x - bounds.minX) * scale + padding;
  const y = (worldPos.y - bounds.minY) * scale + padding;

  return { x, y };
}

/**
 * Convert meters to feet (for US users)
 */
export function metersToFeet(meters: number): number {
  return meters * 3.28084;
}

/**
 * Format dimension for display
 */
export function formatDimension(meters: number, unit: "m" | "ft" = "ft"): string {
  if (unit === "ft") {
    const feet = metersToFeet(meters);
    return `${feet.toFixed(1)}'`;
  }
  return `${meters.toFixed(2)}m`;
}
