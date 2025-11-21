import * as FileSystem from "expo-file-system/legacy";

/**
 * Generate a mock STL file (ASCII format) representing a simple room/box
 * This is useful for testing and demonstration purposes when real 3D reconstruction is not available
 *
 * @param width - Room width in meters (default: 5)
 * @param depth - Room depth in meters (default: 4)
 * @param height - Room height in meters (default: 3)
 * @returns The file path to the generated STL file
 */
export async function generateMockRoomSTL(
  width: number = 5,
  depth: number = 4,
  height: number = 3
): Promise<string> {
  // Simple box room STL (ASCII format)
  // We'll create a box with the specified dimensions
  const stlContent = generateBoxSTL(width, depth, height);

  // Save to file system
  const timestamp = Date.now();
  const filename = `mock_room_${timestamp}.stl`;
  const directory = `${FileSystem.documentDirectory}scans/`;

  // Ensure directory exists
  const dirInfo = await FileSystem.getInfoAsync(directory);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  }

  const filePath = `${directory}${filename}`;
  await FileSystem.writeAsStringAsync(filePath, stlContent);

  console.log(`Mock STL file generated: ${filePath}`);
  return filePath;
}

/**
 * Generate STL content for a simple box (room)
 */
function generateBoxSTL(width: number, depth: number, height: number): string {
  const w = width / 2;
  const d = depth / 2;
  const h = height;

  // Define vertices
  const v = {
    // Bottom vertices
    v0: [-w, -d, 0],
    v1: [w, -d, 0],
    v2: [w, d, 0],
    v3: [-w, d, 0],
    // Top vertices
    v4: [-w, -d, h],
    v5: [w, -d, h],
    v6: [w, d, h],
    v7: [-w, d, h],
  };

  // Build STL content (ASCII format)
  let stl = "solid room\n";

  // Helper to add a triangle
  const addTriangle = (
    normal: number[],
    p1: number[],
    p2: number[],
    p3: number[]
  ) => {
    stl += `  facet normal ${normal[0]} ${normal[1]} ${normal[2]}\n`;
    stl += `    outer loop\n`;
    stl += `      vertex ${p1[0]} ${p1[1]} ${p1[2]}\n`;
    stl += `      vertex ${p2[0]} ${p2[1]} ${p2[2]}\n`;
    stl += `      vertex ${p3[0]} ${p3[1]} ${p3[2]}\n`;
    stl += `    endloop\n`;
    stl += `  endfacet\n`;
  };

  // Bottom face (2 triangles)
  addTriangle([0, 0, -1], v.v0, v.v2, v.v1);
  addTriangle([0, 0, -1], v.v0, v.v3, v.v2);

  // Top face (2 triangles)
  addTriangle([0, 0, 1], v.v4, v.v5, v.v6);
  addTriangle([0, 0, 1], v.v4, v.v6, v.v7);

  // Front face (facing +Y, 2 triangles)
  addTriangle([0, 1, 0], v.v2, v.v3, v.v7);
  addTriangle([0, 1, 0], v.v2, v.v7, v.v6);

  // Back face (facing -Y, 2 triangles)
  addTriangle([0, -1, 0], v.v0, v.v1, v.v5);
  addTriangle([0, -1, 0], v.v0, v.v5, v.v4);

  // Right face (facing +X, 2 triangles)
  addTriangle([1, 0, 0], v.v1, v.v2, v.v6);
  addTriangle([1, 0, 0], v.v1, v.v6, v.v5);

  // Left face (facing -X, 2 triangles)
  addTriangle([-1, 0, 0], v.v3, v.v0, v.v4);
  addTriangle([-1, 0, 0], v.v3, v.v4, v.v7);

  stl += "endsolid room\n";

  return stl;
}

/**
 * Generate a mock STL with random dimensions based on captured images
 * This simulates a realistic output from photogrammetry processing
 *
 * @param imageCount - Number of images captured (affects perceived accuracy)
 * @returns The file path to the generated STL file
 */
export async function generateMockSTLFromPhotos(
  imageCount: number
): Promise<string> {
  // Vary dimensions based on image count to simulate reconstruction
  // More images = slightly larger perceived room
  const baseWidth = 4 + Math.min(imageCount * 0.05, 2);
  const baseDepth = 3.5 + Math.min(imageCount * 0.04, 1.5);
  const baseHeight = 2.5 + Math.min(imageCount * 0.02, 0.5);

  // Add some randomness to make it feel more realistic
  const width = baseWidth + (Math.random() - 0.5) * 0.5;
  const depth = baseDepth + (Math.random() - 0.5) * 0.5;
  const height = baseHeight + (Math.random() - 0.5) * 0.3;

  return generateMockRoomSTL(width, depth, height);
}
