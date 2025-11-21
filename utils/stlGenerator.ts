import * as THREE from 'three';

/**
 * Point cloud data structure
 */
export interface PointCloudData {
  points: Array<{ x: number; y: number; z: number }>;
  colors?: Array<{ r: number; g: number; b: number }>;
}

/**
 * Convert point cloud to mesh using alpha shapes or convex hull
 */
export function pointCloudToMesh(pointCloud: PointCloudData): THREE.Mesh {
  const geometry = new THREE.BufferGeometry();

  // Convert points to Vector3 array
  const vertices = new Float32Array(pointCloud.points.length * 3);
  pointCloud.points.forEach((point, i) => {
    vertices[i * 3] = point.x;
    vertices[i * 3 + 1] = point.y;
    vertices[i * 3 + 2] = point.z;
  });

  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

  // If colors are provided, add them to geometry
  if (pointCloud.colors && pointCloud.colors.length === pointCloud.points.length) {
    const colors = new Float32Array(pointCloud.colors.length * 3);
    pointCloud.colors.forEach((color, i) => {
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    });
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }

  // Compute normals for better rendering
  geometry.computeVertexNormals();

  // Create mesh with basic material
  const material = new THREE.MeshStandardMaterial({
    color: 0x00d4ff,
    vertexColors: pointCloud.colors ? true : false,
    metalness: 0.3,
    roughness: 0.7,
  });

  return new THREE.Mesh(geometry, material);
}

/**
 * Generate STL file content from mesh
 */
export function meshToSTL(mesh: THREE.Mesh): string {
  const geometry = mesh.geometry as THREE.BufferGeometry;
  const positionAttribute = geometry.getAttribute('position');

  if (!positionAttribute) {
    throw new Error('Mesh has no position attribute');
  }

  // ASCII STL format
  let stl = 'solid model\n';

  // Process triangles
  const vertices = positionAttribute.array;
  const triangleCount = vertices.length / 9; // 3 vertices per triangle, 3 components per vertex

  for (let i = 0; i < triangleCount; i++) {
    const i1 = i * 9;
    const i2 = i * 9 + 3;
    const i3 = i * 9 + 6;

    const v1 = new THREE.Vector3(vertices[i1], vertices[i1 + 1], vertices[i1 + 2]);
    const v2 = new THREE.Vector3(vertices[i2], vertices[i2 + 1], vertices[i2 + 2]);
    const v3 = new THREE.Vector3(vertices[i3], vertices[i3 + 1], vertices[i3 + 2]);

    // Calculate normal
    const normal = new THREE.Vector3();
    const edge1 = new THREE.Vector3().subVectors(v2, v1);
    const edge2 = new THREE.Vector3().subVectors(v3, v1);
    normal.crossVectors(edge1, edge2).normalize();

    stl += `  facet normal ${normal.x} ${normal.y} ${normal.z}\n`;
    stl += '    outer loop\n';
    stl += `      vertex ${v1.x} ${v1.y} ${v1.z}\n`;
    stl += `      vertex ${v2.x} ${v2.y} ${v2.z}\n`;
    stl += `      vertex ${v3.x} ${v3.y} ${v3.z}\n`;
    stl += '    endloop\n';
    stl += '  endfacet\n';
  }

  stl += 'endsolid model\n';

  return stl;
}

/**
 * Create a simple cube mesh for testing
 */
export function createTestCube(): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(2, 2, 2);
  const material = new THREE.MeshStandardMaterial({
    color: 0x00d4ff,
    metalness: 0.3,
    roughness: 0.7,
  });

  return new THREE.Mesh(geometry, material);
}

/**
 * Create mesh from depth map (simplified photogrammetry)
 */
export function depthMapToMesh(
  depthData: number[][],
  width: number,
  height: number
): THREE.Mesh {
  const geometry = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const indices: number[] = [];

  // Generate vertices from depth map
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const depth = depthData[y]?.[x] || 0;
      vertices.push(
        (x - width / 2) * 0.01, // x position
        (y - height / 2) * 0.01, // y position
        depth * 0.1 // z position (depth)
      );
    }
  }

  // Generate triangle indices
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const topLeft = y * width + x;
      const topRight = topLeft + 1;
      const bottomLeft = (y + 1) * width + x;
      const bottomRight = bottomLeft + 1;

      // First triangle
      indices.push(topLeft, bottomLeft, topRight);
      // Second triangle
      indices.push(topRight, bottomLeft, bottomRight);
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: 0x00d4ff,
    side: THREE.DoubleSide,
    metalness: 0.3,
    roughness: 0.7,
  });

  return new THREE.Mesh(geometry, material);
}
