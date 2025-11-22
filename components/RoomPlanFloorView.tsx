import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Dimensions } from "react-native";
import Svg, { Line, Rect, Circle, Polygon, Text as SvgText, G, Path } from "react-native-svg";
import {
  loadRoomPlanJSON,
  convertTo2DFloorplan,
  scaleFloorplanToFit,
  worldToScreen,
  formatDimension,
  type Floorplan2D,
  type Point2D,
} from "../utils/roomPlanParser";

interface RoomPlanFloorViewProps {
  jsonUrl: string;
  width?: number;
  height?: number;
  showGrid?: boolean;
  showDimensions?: boolean;
  showLabels?: boolean;
}

export function RoomPlanFloorView({
  jsonUrl,
  width: propWidth,
  height: propHeight,
  showGrid = true,
  showDimensions = false,
  showLabels = true,
}: RoomPlanFloorViewProps) {
  const [floorplan, setFloorplan] = useState<Floorplan2D | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const screenWidth = propWidth || Dimensions.get("window").width;
  const screenHeight = propHeight || 400;
  const padding = 40;

  useEffect(() => {
    loadFloorplan();
  }, [jsonUrl]);

  const loadFloorplan = async () => {
    try {
      setLoading(true);
      setError(null);

      const roomData = await loadRoomPlanJSON(jsonUrl);
      if (!roomData) {
        setError("Failed to load room plan data");
        return;
      }

      const floorplan2D = convertTo2DFloorplan(roomData);
      const scaledFloorplan = scaleFloorplanToFit(
        floorplan2D,
        screenWidth,
        screenHeight,
        padding
      );

      setFloorplan(scaledFloorplan);
    } catch (err) {
      console.error("[RoomPlanFloorView] Error:", err);
      setError("Error processing room plan");
    } finally {
      setLoading(false);
    }
  };

  const toScreen = (worldPos: Point2D): Point2D => {
    if (!floorplan) return { x: 0, y: 0 };
    return worldToScreen(worldPos, floorplan, screenWidth, screenHeight, padding);
  };

  const renderGrid = () => {
    if (!showGrid || !floorplan) return null;

    const lines = [];
    const gridSize = 1; // 1 meter grid
    const { bounds, scale } = floorplan;

    // Vertical lines
    for (
      let x = Math.floor(bounds.minX);
      x <= Math.ceil(bounds.maxX);
      x += gridSize
    ) {
      const start = toScreen({ x, y: bounds.minY });
      const end = toScreen({ x, y: bounds.maxY });
      lines.push(
        <Line
          key={`v-${x}`}
          x1={start.x}
          y1={start.y}
          x2={end.x}
          y2={end.y}
          stroke="#e0e0e0"
          strokeWidth="1"
          strokeDasharray="2,2"
        />
      );
    }

    // Horizontal lines
    for (
      let y = Math.floor(bounds.minY);
      y <= Math.ceil(bounds.maxY);
      y += gridSize
    ) {
      const start = toScreen({ x: bounds.minX, y });
      const end = toScreen({ x: bounds.maxX, y });
      lines.push(
        <Line
          key={`h-${y}`}
          x1={start.x}
          y1={start.y}
          x2={end.x}
          y2={end.y}
          stroke="#e0e0e0"
          strokeWidth="1"
          strokeDasharray="2,2"
        />
      );
    }

    return <G>{lines}</G>;
  };

  const renderWalls = () => {
    if (!floorplan) return null;

    return floorplan.walls.map((wall, index) => {
      const start = toScreen(wall.start);
      const end = toScreen(wall.end);

      return (
        <Line
          key={`wall-${index}`}
          x1={start.x}
          y1={start.y}
          x2={end.x}
          y2={end.y}
          stroke="#333333"
          strokeWidth={Math.max(wall.thickness * floorplan.scale, 4)}
          strokeLinecap="round"
        />
      );
    });
  };

  const renderDoors = () => {
    if (!floorplan) return null;

    return floorplan.doors.map((door, index) => {
      const pos = toScreen(door.position);
      const width = door.width * floorplan.scale;

      // Draw door as an arc symbol
      const arcPath = `M ${pos.x - width / 2} ${pos.y} Q ${pos.x} ${
        pos.y - width / 2
      } ${pos.x + width / 2} ${pos.y}`;

      return (
        <G key={`door-${index}`}>
          <Path d={arcPath} stroke="#4CAF50" strokeWidth="2" fill="none" />
          <Line
            x1={pos.x - width / 2}
            y1={pos.y}
            x2={pos.x + width / 2}
            y2={pos.y}
            stroke="#4CAF50"
            strokeWidth="2"
          />
        </G>
      );
    });
  };

  const renderWindows = () => {
    if (!floorplan) return null;

    return floorplan.windows.map((window, index) => {
      const pos = toScreen(window.position);
      const width = window.width * floorplan.scale;

      return (
        <Rect
          key={`window-${index}`}
          x={pos.x - width / 2}
          y={pos.y - 4}
          width={width}
          height={8}
          fill="#2196F3"
          opacity={0.7}
        />
      );
    });
  };

  const renderObjects = () => {
    if (!floorplan) return null;

    return floorplan.objects.map((obj, index) => {
      const pos = toScreen(obj.position);
      const width = obj.width * floorplan.scale;
      const depth = obj.depth * floorplan.scale;

      // Get color based on category
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

      // Rotate rectangle if needed
      const rotation = obj.rotation || 0;
      const transform = `rotate(${rotation} ${pos.x} ${pos.y})`;

      return (
        <G key={`obj-${index}`} transform={transform}>
          <Rect
            x={pos.x - width / 2}
            y={pos.y - depth / 2}
            width={width}
            height={depth}
            fill={color}
            stroke="#333"
            strokeWidth="1"
            opacity={0.7}
          />
          {showLabels && width > 30 && depth > 30 && (
            <SvgText
              x={pos.x}
              y={pos.y}
              fontSize="10"
              fill="#fff"
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {obj.label}
            </SvgText>
          )}
        </G>
      );
    });
  };

  const renderLegend = () => {
    if (!floorplan) return null;

    const legendItems = [
      { color: "#333333", label: "Walls" },
      { color: "#4CAF50", label: "Doors" },
      { color: "#2196F3", label: "Windows" },
      { color: "#9E9E9E", label: "Objects" },
    ];

    return (
      <G>
        {legendItems.map((item, index) => (
          <G key={`legend-${index}`} transform={`translate(${padding}, ${screenHeight - padding + 10 + index * 20})`}>
            <Rect x={0} y={0} width={15} height={15} fill={item.color} />
            <SvgText x={20} y={12} fontSize="12" fill="#666">
              {item.label}
            </SvgText>
          </G>
        ))}
      </G>
    );
  };

  const renderDimensions = () => {
    if (!showDimensions || !floorplan) return null;

    const { bounds } = floorplan;
    const width = formatDimension(bounds.width);
    const height = formatDimension(bounds.height);

    return (
      <G>
        <SvgText
          x={screenWidth / 2}
          y={padding - 15}
          fontSize="14"
          fill="#333"
          textAnchor="middle"
          fontWeight="bold"
        >
          {width}
        </SvgText>
        <SvgText
          x={padding - 15}
          y={screenHeight / 2}
          fontSize="14"
          fill="#333"
          textAnchor="middle"
          fontWeight="bold"
          transform={`rotate(-90 ${padding - 15} ${screenHeight / 2})`}
        >
          {height}
        </SvgText>
      </G>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { width: screenWidth, height: screenHeight }]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading floorplan...</Text>
      </View>
    );
  }

  if (error || !floorplan) {
    return (
      <View style={[styles.container, { width: screenWidth, height: screenHeight }]}>
        <Text style={styles.errorText}>{error || "No floorplan data available"}</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <Svg width={screenWidth} height={screenHeight}>
        {renderGrid()}
        {renderWalls()}
        {renderDoors()}
        {renderWindows()}
        {renderObjects()}
        {renderDimensions()}
      </Svg>
      <View style={styles.info}>
        <Text style={styles.infoText}>
          Room: {formatDimension(floorplan.bounds.width)} x{" "}
          {formatDimension(floorplan.bounds.height)}
        </Text>
        <Text style={styles.infoText}>
          Objects: {floorplan.objects.length} | Walls: {floorplan.walls.length}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#666",
  },
  errorText: {
    fontSize: 14,
    color: "#f44336",
    textAlign: "center",
    padding: 20,
  },
  info: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    padding: 10,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoText: {
    fontSize: 12,
    color: "#333",
    marginBottom: 2,
  },
});
