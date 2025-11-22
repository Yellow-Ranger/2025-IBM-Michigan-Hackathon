import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";
import {
  type Floorplan2D,
  type Point2D,
  formatDimension,
} from "./roomPlanParser";

/**
 * Generate SVG markup from floorplan data
 */
export function generateFloorplanSVG(
  floorplan: Floorplan2D,
  width: number = 800,
  height: number = 600,
  options: {
    showGrid?: boolean;
    showDimensions?: boolean;
    showLabels?: boolean;
    title?: string;
  } = {}
): string {
  const {
    showGrid = true,
    showDimensions = true,
    showLabels = true,
    title = "Floor Plan",
  } = options;

  const padding = 40;
  const { bounds, scale } = floorplan;

  // Helper to convert world coordinates to SVG coordinates
  const toSVG = (worldPos: Point2D): Point2D => {
    const x = (worldPos.x - bounds.minX) * scale + padding;
    const y = (worldPos.y - bounds.minY) * scale + padding;
    return { x, y };
  };

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <title>${title}</title>
  <desc>Generated floor plan from RoomPlan scan</desc>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="#ffffff"/>

`;

  // Grid
  if (showGrid) {
    svg += `  <!-- Grid -->\n  <g id="grid" opacity="0.3">\n`;
    const gridSize = 1; // 1 meter

    // Vertical lines
    for (let x = Math.floor(bounds.minX); x <= Math.ceil(bounds.maxX); x += gridSize) {
      const start = toSVG({ x, y: bounds.minY });
      const end = toSVG({ x, y: bounds.maxY });
      svg += `    <line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="#e0e0e0" stroke-width="1" stroke-dasharray="2,2"/>\n`;
    }

    // Horizontal lines
    for (let y = Math.floor(bounds.minY); y <= Math.ceil(bounds.maxY); y += gridSize) {
      const start = toSVG({ x: bounds.minX, y });
      const end = toSVG({ x: bounds.maxX, y });
      svg += `    <line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="#e0e0e0" stroke-width="1" stroke-dasharray="2,2"/>\n`;
    }

    svg += `  </g>\n\n`;
  }

  // Walls
  svg += `  <!-- Walls -->\n  <g id="walls">\n`;
  floorplan.walls.forEach((wall, i) => {
    const start = toSVG(wall.start);
    const end = toSVG(wall.end);
    const strokeWidth = Math.max(wall.thickness * scale, 4);
    svg += `    <line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="#333333" stroke-width="${strokeWidth}" stroke-linecap="round"/>\n`;
  });
  svg += `  </g>\n\n`;

  // Doors
  if (floorplan.doors.length > 0) {
    svg += `  <!-- Doors -->\n  <g id="doors">\n`;
    floorplan.doors.forEach((door, i) => {
      const pos = toSVG(door.position);
      const width = door.width * scale;
      const arcPath = `M ${pos.x - width / 2} ${pos.y} Q ${pos.x} ${pos.y - width / 2} ${pos.x + width / 2} ${pos.y}`;
      svg += `    <path d="${arcPath}" stroke="#4CAF50" stroke-width="2" fill="none"/>\n`;
      svg += `    <line x1="${pos.x - width / 2}" y1="${pos.y}" x2="${pos.x + width / 2}" y2="${pos.y}" stroke="#4CAF50" stroke-width="2"/>\n`;
    });
    svg += `  </g>\n\n`;
  }

  // Windows
  if (floorplan.windows.length > 0) {
    svg += `  <!-- Windows -->\n  <g id="windows">\n`;
    floorplan.windows.forEach((window, i) => {
      const pos = toSVG(window.position);
      const width = window.width * scale;
      svg += `    <rect x="${pos.x - width / 2}" y="${pos.y - 4}" width="${width}" height="8" fill="#2196F3" opacity="0.7"/>\n`;
    });
    svg += `  </g>\n\n`;
  }

  // Objects
  if (floorplan.objects.length > 0) {
    svg += `  <!-- Objects -->\n  <g id="objects">\n`;
    floorplan.objects.forEach((obj, i) => {
      const pos = toSVG(obj.position);
      const width = obj.width * scale;
      const depth = obj.depth * scale;
      const rotation = obj.rotation || 0;

      const getObjectColor = (category: string): string => {
        const colors: Record<string, string> = {
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
        return colors[category] || "#9E9E9E";
      };

      const color = getObjectColor(obj.category);
      const transform = rotation !== 0 ? ` transform="rotate(${rotation} ${pos.x} ${pos.y})"` : "";

      svg += `    <g${transform}>\n`;
      svg += `      <rect x="${pos.x - width / 2}" y="${pos.y - depth / 2}" width="${width}" height="${depth}" fill="${color}" stroke="#333" stroke-width="1" opacity="0.7"/>\n`;

      if (showLabels && obj.label && width > 30 && depth > 30) {
        svg += `      <text x="${pos.x}" y="${pos.y}" font-size="10" fill="#fff" text-anchor="middle" dominant-baseline="middle">${escapeXML(obj.label)}</text>\n`;
      }

      svg += `    </g>\n`;
    });
    svg += `  </g>\n\n`;
  }

  // Dimensions
  if (showDimensions) {
    const widthText = formatDimension(bounds.width);
    const heightText = formatDimension(bounds.height);

    svg += `  <!-- Dimensions -->\n  <g id="dimensions">\n`;
    svg += `    <text x="${width / 2}" y="${padding - 15}" font-size="14" fill="#333" text-anchor="middle" font-weight="bold">${widthText}</text>\n`;
    svg += `    <text x="${padding - 15}" y="${height / 2}" font-size="14" fill="#333" text-anchor="middle" font-weight="bold" transform="rotate(-90 ${padding - 15} ${height / 2})">${heightText}</text>\n`;
    svg += `  </g>\n\n`;
  }

  // Legend
  svg += `  <!-- Legend -->\n  <g id="legend">\n`;
  const legendItems = [
    { color: "#333333", label: "Walls" },
    { color: "#4CAF50", label: "Doors" },
    { color: "#2196F3", label: "Windows" },
    { color: "#9E9E9E", label: "Objects" },
  ];

  legendItems.forEach((item, i) => {
    const y = height - padding + 10 + i * 20;
    svg += `    <rect x="${padding}" y="${y}" width="15" height="15" fill="${item.color}"/>\n`;
    svg += `    <text x="${padding + 20}" y="${y + 12}" font-size="12" fill="#666">${item.label}</text>\n`;
  });
  svg += `  </g>\n\n`;

  // Info text
  const roomWidthText = formatDimension(bounds.width);
  const roomHeightText = formatDimension(bounds.height);
  svg += `  <!-- Info -->\n`;
  svg += `  <text x="${width - padding}" y="${padding - 15}" font-size="12" fill="#666" text-anchor="end">Room: ${roomWidthText} × ${roomHeightText}</text>\n`;
  svg += `  <text x="${width - padding}" y="${padding}" font-size="12" fill="#666" text-anchor="end">Objects: ${floorplan.objects.length} | Walls: ${floorplan.walls.length}</text>\n`;

  svg += `</svg>`;

  return svg;
}

/**
 * Escape XML special characters
 */
function escapeXML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Export floorplan as SVG file
 */
export async function exportFloorplanAsSVG(
  floorplan: Floorplan2D,
  filename: string = "floorplan.svg",
  options?: {
    showGrid?: boolean;
    showDimensions?: boolean;
    showLabels?: boolean;
    title?: string;
  }
): Promise<void> {
  try {
    // Generate SVG content
    const svgContent = generateFloorplanSVG(floorplan, 800, 600, options);

    // Save to document directory using legacy FileSystem API
    const fileUri = `${FileSystem.documentDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, svgContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    console.log("[SVGExport] SVG saved to:", fileUri);

    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: "image/svg+xml",
        dialogTitle: "Export Floor Plan",
        UTI: "public.svg-image",
      });
    } else {
      Alert.alert(
        "Export Successful",
        `Floor plan saved to:\n${fileUri}`,
        [{ text: "OK" }]
      );
    }
  } catch (error) {
    console.error("[SVGExport] Error exporting SVG:", error);
    Alert.alert("Export Failed", "Failed to export floor plan as SVG");
    throw error;
  }
}

/**
 * Export floorplan as PNG (requires converting SVG to bitmap)
 * Note: This is a placeholder - actual PNG export would require additional libraries
 */
export async function exportFloorplanAsPNG(
  floorplan: Floorplan2D,
  filename: string = "floorplan.png"
): Promise<void> {
  Alert.alert(
    "PNG Export Not Available",
    "PNG export requires additional setup. Please use SVG export or take a screenshot.",
    [{ text: "OK" }]
  );
}

/**
 * Get SVG data URL for embedding
 */
export function getFloorplanSVGDataURL(
  floorplan: Floorplan2D,
  options?: {
    showGrid?: boolean;
    showDimensions?: boolean;
    showLabels?: boolean;
    title?: string;
  }
): string {
  const svgContent = generateFloorplanSVG(floorplan, 800, 600, options);
  // URL encode for data URI
  const encoded = encodeURIComponent(svgContent);
  return `data:image/svg+xml,${encoded}`;
}
