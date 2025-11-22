import { loadRoomPlanJSON, convertTo2DFloorplan, metersToFeet } from "./roomPlanParser";
import { LayoutItem } from "./layoutPlanner";

/**
 * Convert RoomPlan object category to LayoutItem type
 */
function roomPlanCategoryToLayoutType(category: string): "machine" | "storage" | "aisle" {
  // Map RoomPlan categories to layout types
  const storageCategories = [
    "storage",
    "refrigerator",
    "dishwasher",
    "washerDryer",
  ];

  const machineCategories = [
    "stove",
    "oven",
    "sink",
    "toilet",
    "bathtub",
  ];

  if (storageCategories.includes(category)) {
    return "storage";
  }

  if (machineCategories.includes(category)) {
    return "machine";
  }

  // Default to aisle for furniture and other items
  return "aisle";
}

/**
 * Get a color based on RoomPlan category
 */
function roomPlanCategoryToColor(category: string): string {
  const colorMap: Record<string, string> = {
    storage: "#FFA726",
    refrigerator: "#42A5F5",
    stove: "#EF5350",
    bed: "#AB47BC",
    sink: "#29B6F6",
    washerDryer: "#26A69A",
    toilet: "#66BB6A",
    bathtub: "#5C6BC0",
    oven: "#FF7043",
    dishwasher: "#26C6DA",
    table: "#8D6E63",
    sofa: "#7E57C2",
    chair: "#9CCC65",
    fireplace: "#FF8A65",
    television: "#78909C",
    stairs: "#BDBDBD",
  };

  return colorMap[category] || "#9E9E9E";
}

/**
 * Get a readable name from RoomPlan category
 */
function formatCategoryName(category: string): string {
  // Convert camelCase to Title Case with spaces
  const result = category.replace(/([A-Z])/g, " $1");
  return result.charAt(0).toUpperCase() + result.slice(1);
}

/**
 * Convert RoomPlan scan to LayoutItems
 */
export async function convertRoomPlanToLayout(
  jsonUrl: string
): Promise<LayoutItem[]> {
  try {
    const roomData = await loadRoomPlanJSON(jsonUrl);
    if (!roomData) {
      console.error("[RoomPlanToLayout] Failed to load room data");
      return [];
    }

    const floorplan2D = convertTo2DFloorplan(roomData);
    const items: LayoutItem[] = [];

    // Convert objects to LayoutItems
    floorplan2D.objects.forEach((obj, index) => {
      // Convert from meters to feet
      const xFeet = metersToFeet(obj.position.x);
      const yFeet = metersToFeet(obj.position.y);
      const widthFeet = metersToFeet(obj.width);
      const depthFeet = metersToFeet(obj.depth);

      // Center the layout around origin (0, 0)
      // The LayoutPlanner uses 0-120 for X and 0-72 for Y
      const centerX = 60; // Center of 120ft width
      const centerY = 36; // Center of 72ft height

      // Calculate offset to center the room
      const roomCenterX = metersToFeet(floorplan2D.bounds.minX + floorplan2D.bounds.width / 2);
      const roomCenterY = metersToFeet(floorplan2D.bounds.minY + floorplan2D.bounds.height / 2);
      const offsetX = centerX - roomCenterX;
      const offsetY = centerY - roomCenterY;

      items.push({
        id: `roomplan-obj-${index}`,
        name: obj.label || formatCategoryName(obj.category),
        type: roomPlanCategoryToLayoutType(obj.category),
        x: xFeet + offsetX,
        y: yFeet + offsetY,
        width: widthFeet,
        height: depthFeet,
        rotation: obj.rotation || 0,
        zone: "production", // Default zone
        color: roomPlanCategoryToColor(obj.category),
      });
    });

    // Optionally add wall markers (as aisle/boundary items)
    floorplan2D.walls.forEach((wall, index) => {
      const startXFeet = metersToFeet(wall.start.x);
      const startYFeet = metersToFeet(wall.start.y);
      const endXFeet = metersToFeet(wall.end.x);
      const endYFeet = metersToFeet(wall.end.y);

      // Calculate wall center and dimensions
      const centerX = 60;
      const centerY = 36;
      const roomCenterX = metersToFeet(floorplan2D.bounds.minX + floorplan2D.bounds.width / 2);
      const roomCenterY = metersToFeet(floorplan2D.bounds.minY + floorplan2D.bounds.height / 2);
      const offsetX = centerX - roomCenterX;
      const offsetY = centerY - roomCenterY;

      const wallCenterX = (startXFeet + endXFeet) / 2 + offsetX;
      const wallCenterY = (startYFeet + endYFeet) / 2 + offsetY;
      const wallLength = Math.sqrt(
        Math.pow(endXFeet - startXFeet, 2) + Math.pow(endYFeet - startYFeet, 2)
      );
      const wallThickness = metersToFeet(wall.thickness);
      const wallAngle = Math.atan2(endYFeet - startYFeet, endXFeet - startXFeet) * (180 / Math.PI);

      items.push({
        id: `roomplan-wall-${index}`,
        name: `Wall ${index + 1}`,
        type: "aisle",
        x: wallCenterX,
        y: wallCenterY,
        width: wallLength,
        height: wallThickness,
        rotation: wallAngle,
        zone: "boundary",
        color: "#333333",
      });
    });

    console.log(`[RoomPlanToLayout] Converted ${items.length} items from RoomPlan scan`);
    return items;
  } catch (error) {
    console.error("[RoomPlanToLayout] Error converting RoomPlan to layout:", error);
    return [];
  }
}

/**
 * Merge RoomPlan items with existing layout items
 * This allows users to keep manually added items while importing scanned data
 */
export function mergeLayoutItems(
  existingItems: LayoutItem[],
  roomPlanItems: LayoutItem[]
): LayoutItem[] {
  // Filter out any existing RoomPlan items (they have IDs starting with "roomplan-")
  const nonRoomPlanItems = existingItems.filter(
    (item) => !item.id.startsWith("roomplan-")
  );

  // Combine with new RoomPlan items
  return [...roomPlanItems, ...nonRoomPlanItems];
}
