import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * Pure TypeScript GLB Binary Builder
 * Creates valid glTF 2.0 Binary (.glb) files with meshes, materials, and nodes.
 */
interface MeshData {
  name: string;
  positions: number[]; // [x, y, z, ...]
  normals: number[];
  indices: number[];
  materialIndex: number;
}

interface MaterialDef {
  name: string;
  baseColor: [number, number, number, number];
  metallic: number;
  roughness: number;
  emissive?: [number, number, number];
}

function buildGLB(meshes: MeshData[], materials: MaterialDef[]): Buffer {
  // Combine all binary buffers into one aligned buffer
  const binaryBuffers: Buffer[] = [];
  const bufferViews: any[] = [];
  const accessors: any[] = [];
  let currentOffset = 0;

  const gltfMeshes: any[] = [];

  meshes.forEach((mesh, meshIdx) => {
    // 1. Position Buffer (Float32)
    const posArray = new Float32Array(mesh.positions);
    const posBuf = Buffer.from(posArray.buffer);
    const posByteLen = posBuf.byteLength;
    bufferViews.push({
      buffer: 0,
      byteOffset: currentOffset,
      byteLength: posByteLen,
      target: 34962, // ARRAY_BUFFER
    });
    const posViewIdx = bufferViews.length - 1;
    currentOffset += posByteLen;
    binaryBuffers.push(posBuf);

    // Compute min/max for position
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let i = 0; i < mesh.positions.length; i += 3) {
      const x = mesh.positions[i];
      const y = mesh.positions[i + 1];
      const z = mesh.positions[i + 2];
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }

    accessors.push({
      bufferView: posViewIdx,
      byteOffset: 0,
      componentType: 5126, // FLOAT
      count: mesh.positions.length / 3,
      type: 'VEC3',
      max: [maxX, maxY, maxZ],
      min: [minX, minY, minZ],
    });
    const posAccessorIdx = accessors.length - 1;

    // 2. Normal Buffer (Float32)
    const normArray = new Float32Array(mesh.normals);
    const normBuf = Buffer.from(normArray.buffer);
    const normByteLen = normBuf.byteLength;
    bufferViews.push({
      buffer: 0,
      byteOffset: currentOffset,
      byteLength: normByteLen,
      target: 34962,
    });
    const normViewIdx = bufferViews.length - 1;
    currentOffset += normByteLen;
    binaryBuffers.push(normBuf);

    accessors.push({
      bufferView: normViewIdx,
      byteOffset: 0,
      componentType: 5126,
      count: mesh.normals.length / 3,
      type: 'VEC3',
    });
    const normAccessorIdx = accessors.length - 1;

    // 3. Index Buffer (Uint16)
    const indArray = new Uint16Array(mesh.indices);
    const indBuf = Buffer.from(indArray.buffer);
    // Align to 4 bytes
    const padLen = (4 - (indBuf.byteLength % 4)) % 4;
    const alignedIndBuf = padLen > 0 ? Buffer.concat([indBuf, Buffer.alloc(padLen)]) : indBuf;
    const indByteLen = alignedIndBuf.byteLength;

    bufferViews.push({
      buffer: 0,
      byteOffset: currentOffset,
      byteLength: indArray.byteLength,
      target: 34963, // ELEMENT_ARRAY_BUFFER
    });
    const indViewIdx = bufferViews.length - 1;
    currentOffset += indByteLen;
    binaryBuffers.push(alignedIndBuf);

    accessors.push({
      bufferView: indViewIdx,
      byteOffset: 0,
      componentType: 5123, // UNSIGNED_SHORT
      count: mesh.indices.length,
      type: 'SCALAR',
    });
    const indAccessorIdx = accessors.length - 1;

    gltfMeshes.push({
      name: mesh.name,
      primitives: [
        {
          attributes: {
            POSITION: posAccessorIdx,
            NORMAL: normAccessorIdx,
          },
          indices: indAccessorIdx,
          material: mesh.materialIndex,
        },
      ],
    });
  });

  const fullBinaryBuffer = Buffer.concat(binaryBuffers);

  // glTF Materials JSON
  const gltfMaterials = materials.map((m) => ({
    name: m.name,
    pbrMetallicRoughness: {
      baseColorFactor: m.baseColor,
      metallicFactor: m.metallic,
      roughnessFactor: m.roughness,
    },
    emissiveFactor: m.emissive || [0, 0, 0],
  }));

  // glTF Structure
  const gltf = {
    asset: { version: '2.0', generator: "Antigravity India's Journey Beyond Earth GLB Engine" },
    scene: 0,
    scenes: [{ nodes: gltfMeshes.map((_, i) => i) }],
    nodes: gltfMeshes.map((m, i) => ({ name: m.name, mesh: i })),
    meshes: gltfMeshes,
    materials: gltfMaterials,
    accessors,
    bufferViews,
    buffers: [{ byteLength: fullBinaryBuffer.byteLength }],
  };

  // Convert JSON to aligned Buffer
  let jsonStr = JSON.stringify(gltf);
  while (Buffer.byteLength(jsonStr, 'utf8') % 4 !== 0) {
    jsonStr += ' ';
  }
  const jsonBuf = Buffer.from(jsonStr, 'utf8');

  // GLB Header (12 bytes)
  const totalLength = 12 + 8 + jsonBuf.byteLength + 8 + fullBinaryBuffer.byteLength;
  const headerBuf = Buffer.alloc(12);
  headerBuf.writeUInt32LE(0x46546c67, 0); // 'glTF'
  headerBuf.writeUInt32LE(2, 4); // Version 2
  headerBuf.writeUInt32LE(totalLength, 8);

  // JSON Chunk Header (8 bytes)
  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonBuf.byteLength, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4); // 'JSON'

  // BIN Chunk Header (8 bytes)
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(fullBinaryBuffer.byteLength, 0);
  binHeader.writeUInt32LE(0x004e4942, 4); // 'BIN\0'

  return Buffer.concat([headerBuf, jsonHeader, jsonBuf, binHeader, fullBinaryBuffer]);
}

// ── Primitive Geometry Builders ─────────────────────────────────────────────
function createBoxMesh(
  name: string,
  width: number,
  height: number,
  depth: number,
  cx = 0,
  cy = 0,
  cz = 0,
  materialIndex = 0
): MeshData {
  const w = width / 2, h = height / 2, d = depth / 2;
  const positions: number[] = [
    // Front
    cx - w, cy - h, cz + d,  cx + w, cy - h, cz + d,  cx + w, cy + h, cz + d,  cx - w, cy + h, cz + d,
    // Back
    cx + w, cy - h, cz - d,  cx - w, cy - h, cz - d,  cx - w, cy + h, cz - d,  cx + w, cy + h, cz - d,
    // Top
    cx - w, cy + h, cz + d,  cx + w, cy + h, cz + d,  cx + w, cy + h, cz - d,  cx - w, cy + h, cz - d,
    // Bottom
    cx - w, cy - h, cz - d,  cx + w, cy - h, cz - d,  cx + w, cy - h, cz + d,  cx - w, cy - h, cz + d,
    // Right
    cx + w, cy - h, cz + d,  cx + w, cy - h, cz - d,  cx + w, cy + h, cz - d,  cx + w, cy + h, cz + d,
    // Left
    cx - w, cy - h, cz - d,  cx - w, cy - h, cz + d,  cx - w, cy + h, cz + d,  cx - w, cy + h, cz - d,
  ];

  const normals: number[] = [
    0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,
    0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
    0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,
    0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
    1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
    -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
  ];

  const indices: number[] = [];
  for (let f = 0; f < 6; f++) {
    const o = f * 4;
    indices.push(o, o + 1, o + 2, o, o + 2, o + 3);
  }

  return { name, positions, normals, indices, materialIndex };
}

function createCylinderMesh(
  name: string,
  radiusTop: number,
  radiusBottom: number,
  height: number,
  segments = 16,
  cx = 0,
  cy = 0,
  cz = 0,
  materialIndex = 0
): MeshData {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  const halfH = height / 2;

  // Side vertices
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);

    // Top vertex
    positions.push(cx + cosT * radiusTop, cy + halfH, cz + sinT * radiusTop);
    normals.push(cosT, 0, sinT);

    // Bottom vertex
    positions.push(cx + cosT * radiusBottom, cy - halfH, cz + sinT * radiusBottom);
    normals.push(cosT, 0, sinT);
  }

  for (let i = 0; i < segments; i++) {
    const p1 = i * 2;
    const p2 = p1 + 1;
    const p3 = (i + 1) * 2;
    const p4 = p3 + 1;
    indices.push(p1, p2, p3, p2, p4, p3);
  }

  return { name, positions, normals, indices, materialIndex };
}

// ── Spacecraft Model Factories ──────────────────────────────────────────────
export async function GET() {
  try {
    const modelsDir = path.join(process.cwd(), 'public', 'models');
    if (!fs.existsSync(modelsDir)) {
      fs.mkdirSync(modelsDir, { recursive: true });
    }

    const materials: MaterialDef[] = [
      { name: 'Gold_MLI', baseColor: [0.85, 0.47, 0.02, 1.0], metallic: 0.9, roughness: 0.25 }, // 0
      { name: 'Silver_MLI', baseColor: [0.88, 0.91, 0.94, 1.0], metallic: 0.95, roughness: 0.2 }, // 1
      { name: 'Solar_Silicon', baseColor: [0.12, 0.23, 0.54, 1.0], metallic: 0.4, roughness: 0.2, emissive: [0.05, 0.1, 0.25] }, // 2
      { name: 'Dark_Chassis', baseColor: [0.12, 0.16, 0.24, 1.0], metallic: 0.8, roughness: 0.4 }, // 3
      { name: 'Engine_Nozzle', baseColor: [0.06, 0.09, 0.16, 1.0], metallic: 0.9, roughness: 0.15 }, // 4
      { name: 'Rocket_White', baseColor: [0.97, 0.98, 0.99, 1.0], metallic: 0.3, roughness: 0.4 }, // 5
      { name: 'Booster_Orange', baseColor: [0.76, 0.25, 0.05, 1.0], metallic: 0.4, roughness: 0.4 }, // 6
    ];

    // 1. Chandrayaan-3 (Vikram Lander)
    const cy3Meshes: MeshData[] = [
      createCylinderMesh('Body_Octagon', 0.7, 0.85, 0.9, 8, 0, 0, 0, 0),
      createBoxMesh('Top_Avionics_Deck', 0.65, 0.15, 0.65, 0, 0.52, 0, 1),
      createBoxMesh('Solar_Panel_Left', 0.04, 0.8, 0.7, -0.72, 0, 0, 2),
      createBoxMesh('Solar_Panel_Right', 0.04, 0.8, 0.7, 0.72, 0, 0, 2),
      createBoxMesh('Pragyan_Rover_Ramp', 0.08, 0.6, 0.45, 0.65, -0.1, 0, 1),
      // 4 Liquid Engines
      createCylinderMesh('Thruster_1', 0.08, 0.04, 0.22, 12, -0.45, -0.55, -0.45, 4),
      createCylinderMesh('Thruster_2', 0.08, 0.04, 0.22, 12, 0.45, -0.55, -0.45, 4),
      createCylinderMesh('Thruster_3', 0.08, 0.04, 0.22, 12, -0.45, -0.55, 0.45, 4),
      createCylinderMesh('Thruster_4', 0.08, 0.04, 0.22, 12, 0.45, -0.55, 0.45, 4),
      // 4 Landing Struts
      createCylinderMesh('Strut_1', 0.03, 0.035, 0.85, 8, -0.7, -0.55, -0.7, 3),
      createCylinderMesh('Strut_2', 0.03, 0.035, 0.85, 8, 0.7, -0.55, -0.7, 3),
      createCylinderMesh('Strut_3', 0.03, 0.035, 0.85, 8, -0.7, -0.55, 0.7, 3),
      createCylinderMesh('Strut_4', 0.03, 0.035, 0.85, 8, 0.7, -0.55, 0.7, 3),
    ];
    fs.writeFileSync(path.join(modelsDir, 'chandrayaan3.glb'), buildGLB(cy3Meshes, materials));

    // 2. Mars Orbiter Mission (Mangalyaan)
    const momMeshes: MeshData[] = [
      createBoxMesh('Core_Bus', 1.1, 1.1, 1.1, 0, 0, 0, 0),
      createCylinderMesh('HGA_Reflector_Dish', 0.7, 0.1, 0.25, 24, 0, 0.75, 0, 1),
      createBoxMesh('Solar_Wing', 1.6, 1.0, 0.03, -1.35, 0, 0, 2),
      createCylinderMesh('LAM_Main_Engine', 0.22, 0.08, 0.45, 16, 0, -0.75, 0, 4),
      createCylinderMesh('MCC_Camera_Barrel', 0.14, 0.16, 0.3, 16, 0, 0, 0.68, 3),
    ];
    fs.writeFileSync(path.join(modelsDir, 'mangalyaan.glb'), buildGLB(momMeshes, materials));

    // 3. Aryabhata (1975)
    const aryaMeshes: MeshData[] = [
      createCylinderMesh('Polyhedron_Bus', 0.65, 0.65, 1.1, 16, 0, 0, 0, 1),
      createCylinderMesh('Top_Cap', 0.05, 0.65, 0.3, 16, 0, 0.65, 0, 0),
      createCylinderMesh('Bottom_Cap', 0.65, 0.05, 0.3, 16, 0, -0.65, 0, 0),
      createBoxMesh('Solar_Array_1', 0.35, 1.05, 0.02, -0.66, 0, 0, 2),
      createBoxMesh('Solar_Array_2', 0.35, 1.05, 0.02, 0.66, 0, 0, 2),
      createCylinderMesh('Antenna_1', 0.015, 0.015, 0.8, 8, 0.45, 0.75, 0.45, 3),
      createCylinderMesh('Antenna_2', 0.015, 0.015, 0.8, 8, -0.45, 0.75, -0.45, 3),
    ];
    fs.writeFileSync(path.join(modelsDir, 'aryabhata.glb'), buildGLB(aryaMeshes, materials));

    // 4. Aditya-L1
    const adityaMeshes: MeshData[] = [
      createBoxMesh('Observatory_Core', 0.95, 1.35, 0.95, 0, 0, 0, 0),
      createCylinderMesh('VELC_Sunshield', 0.32, 0.38, 0.32, 24, 0, 0.82, 0, 1),
      createBoxMesh('Left_Solar_Wing', 1.25, 1.25, 0.03, -1.15, 0, 0, 2),
      createBoxMesh('Right_Solar_Wing', 1.25, 1.25, 0.03, 1.15, 0, 0, 2),
      createCylinderMesh('Magnetometer_Boom', 0.015, 0.015, 1.2, 8, 0.45, -0.6, 0, 3),
    ];
    fs.writeFileSync(path.join(modelsDir, 'aditya_l1.glb'), buildGLB(adityaMeshes, materials));

    // 5. PSLV Launch Vehicle
    const pslvMeshes: MeshData[] = [
      createCylinderMesh('PS1_Core_Stage', 0.45, 0.45, 3.2, 24, 0, -2.2, 0, 5),
      createCylinderMesh('PSOM_Booster_1', 0.15, 0.15, 2.4, 16, 0.62, -2.6, 0, 6),
      createCylinderMesh('PSOM_Booster_2', 0.15, 0.15, 2.4, 16, -0.62, -2.6, 0, 6),
      createCylinderMesh('PSOM_Booster_3', 0.15, 0.15, 2.4, 16, 0, -2.6, 0.62, 6),
      createCylinderMesh('PSOM_Booster_4', 0.15, 0.15, 2.4, 16, 0, -2.6, -0.62, 6),
      createCylinderMesh('PS2_Vikas_Stage', 0.42, 0.45, 2.2, 24, 0, 0.5, 0, 5),
      createCylinderMesh('PS3_PS4_Upper_Stage', 0.4, 0.42, 1.5, 24, 0, 2.35, 0, 3),
      createCylinderMesh('Payload_Fairing', 0.02, 0.42, 1.8, 24, 0, 3.9, 0, 5),
    ];
    fs.writeFileSync(path.join(modelsDir, 'pslv_rocket.glb'), buildGLB(pslvMeshes, materials));

    return NextResponse.json({
      success: true,
      message: 'Created production GLB binary models successfully',
      models: [
        'chandrayaan3.glb',
        'mangalyaan.glb',
        'aryabhata.glb',
        'aditya_l1.glb',
        'pslv_rocket.glb',
      ],
      directory: '/public/models/',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
