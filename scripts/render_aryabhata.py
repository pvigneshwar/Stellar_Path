#!/usr/bin/env python
"""
ARYABHATA MISSION — 4K Cinematic 3D Video Renderer
================================================================
Mission:       Aryabhata (India's First Satellite)
Year:          1975
Duration:      60 seconds
Resolution:    3840×2160 (4K UHD)
Frame rate:    24 fps → 1440 frames
Format:        Master MP4 (H.264) + WebM (VP9)
Aspect:        16:9
Style:         Photorealistic aerospace documentary
Camera:        Slow continuous orbit + controlled approach/pullback

Render pipeline:
  • Pygame headless OpenGL 4.6 context (hidden window)
  • Offscreen 4K framebuffer for rendering
  • GLSL shaders for Earth atmosphere, terminator, satellite materials
  • Procedural starfield + nebula volumetric backdrop
  • Frames piped to ffmpeg for H.264/VP9 encoding
"""

import os
import sys
import struct
import subprocess
import math
import time

import pygame
import numpy as np
from PIL import Image
from OpenGL.GL import *
from OpenGL.GL import shaders
from OpenGL.arrays import vbo

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────
WIDTH, HEIGHT = 3840, 2160
FPS = 24
DURATION = 60
TOTAL_FRAMES = DURATION * FPS
EARTH_RADIUS = 6.371  # Earth radius in thousands of km (for scene scale)
ARYABHATA_ORBIT_RADIUS = 8.5 * EARTH_RADIUS  # Aryabhata orbit (~568 km altitude)

# Paths
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EARTH_TEXTURE_PATH = os.path.join(PROJECT_ROOT, "public", "textures", "8k_earth_daymap.jpg")
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "output")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Video encoding
FFMPEG_EXE = None
try:
    import imageio_ffmpeg
    FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()
except ImportError:
    pass
if not FFMPEG_EXE:
    FFMPEG_EXE = "ffmpeg"

# ─────────────────────────────────────────────────────────────────────────────
# Shader programs
# ─────────────────────────────────────────────────────────────────────────────

EARTH_VERTEX_SHADER = """
#version 330 core
layout(location = 0) in vec3 position;
layout(location = 1) in vec3 normal;
layout(location = 2) in vec2 texCoord;

uniform mat4 u_mvp;
uniform mat4 u_model;
uniform mat3 u_normalMatrix;
uniform vec3 u_lightDir;
uniform float u_time;

out vec2 v_uv;
out vec3 v_normal;
out vec3 v_worldPos;
out float v_lightIntensity;

void main() {
    vec4 worldPos = u_model * vec4(position, 1.0);
    v_worldPos = worldPos.xyz;
    v_normal = normalize(u_normalMatrix * normal);
    v_uv = texCoord;

    vec3 lightDir = normalize(u_lightDir);
    v_lightIntensity = max(0.0, dot(v_normal, lightDir));

    gl_Position = u_mvp * vec4(position, 1.0);
}
"""

EARTH_FRAGMENT_SHADER = """
#version 330 core
precision highp float;

uniform sampler2D u_earthMap;
uniform vec3 u_lightDir;
uniform float u_time;

in vec2 v_uv;
in vec3 v_normal;
in vec3 v_worldPos;
in float v_lightIntensity;

out vec4 fragColor;

void main() {
    vec3 texColor = texture(u_earthMap, v_uv).rgb;

    // Day-night terminator: brighter on day side, darker on night
    float NdotL = v_lightIntensity;
    float dayFactor = smoothstep(-0.1, 0.3, NdotL);

    // Night side: subtle city lights / dark blue
    vec3 nightColor = vec3(0.02, 0.05, 0.12);
    vec3 color = mix(nightColor, texColor, dayFactor);

    // Add subtle emissive glow on terminator
    float terminatorGlow = pow(1.0 - abs(NdotL), 8.0) * 0.3;
    color += vec3(0.0, 0.2, 0.5) * terminatorGlow * dayFactor;

    fragColor = vec4(color, 1.0);
}
"""

ATMOSPHERE_VERTEX_SHADER = """
#version 330 core
layout(location = 0) in vec3 position;
layout(location = 1) in vec3 normal;

uniform mat4 u_mvp;
uniform mat4 u_model;
uniform mat3 u_normalMatrix;

out vec3 v_normal;
out vec3 v_worldPos;

void main() {
    vec4 worldPos = u_model * vec4(position, 1.0);
    v_worldPos = worldPos.xyz;
    v_normal = normalize(u_normalMatrix * normal);
    gl_Position = u_mvp * vec4(position, 1.0);
}
"""

ATMOSPHERE_FRAGMENT_SHADER = """
#version 330 core
precision highp float;

uniform vec3 u_lightDir;
uniform vec3 u_cameraPos;
uniform float u_time;

in vec3 v_normal;
in vec3 v_worldPos;

out vec4 fragColor;

void main() {
    vec3 viewDir = normalize(u_cameraPos - v_worldPos);
    vec3 normal = normalize(v_normal);

    float NdotV = abs(dot(normal, viewDir));
    float rim = pow(1.0 - NdotV, 2.5);

    float NdotL = max(0.0, dot(normal, normalize(u_lightDir)));
    float terminator = smoothstep(-0.2, 0.3, NdotL);

    float intensity = rim * (0.6 + 0.4 * terminator);
    intensity *= 0.85 + 0.15 * sin(u_time * 1.5);

    if (intensity < 0.01) discard;

    vec3 glow = mix(vec3(0.0, 0.5, 1.0), vec3(0.3, 0.8, 1.0), 0.5);
    fragColor = vec4(glow, min(intensity * 0.8, 0.65));
}
"""

ARYABHATA_VERTEX_SHADER = """
#version 330 core
layout(location = 0) in vec3 position;
layout(location = 1) in vec3 normal;

uniform mat4 u_mvp;
uniform mat4 u_model;
uniform mat3 u_normalMatrix;

out vec3 v_normal;
out vec3 v_worldPos;

void main() {
    vec4 worldPos = u_model * vec4(position, 1.0);
    v_worldPos = worldPos.xyz;
    v_normal = normalize(u_normalMatrix * normal);
    gl_Position = u_mvp * vec4(position, 1.0);
}
"""

ARYABHATA_FRAGMENT_SHADER = """
#version 330 core
precision highp float;

uniform vec3 u_color;
uniform float u_metallic;
uniform float u_roughness;
uniform vec3 u_lightDir;
uniform vec3 u_cameraPos;

in vec3 v_normal;
in vec3 v_worldPos;

out vec4 fragColor;

void main() {
    vec3 normal = normalize(v_normal);
    vec3 lightDir = normalize(u_lightDir);
    vec3 viewDir = normalize(u_cameraPos - v_worldPos);
    vec3 halfDir = normalize(lightDir + viewDir);

    float NdotL = max(dot(normal, lightDir), 0.0);
    float NdotV = max(dot(normal, viewDir), 0.0);
    float NdotH = max(dot(normal, halfDir), 0.0);

    // Diffuse
    vec3 diffuse = u_color * NdotL * (1.0 - u_metallic);

    // Specular (Blinn-Phong approximation of GGX)
    float specularPower = mix(8.0, 128.0, 1.0 - u_roughness);
    float specular = pow(NdotH, specularPower) * u_metallic;

    // Ambient
    vec3 ambient = u_color * 0.15;

    // Rim light
    float rim = pow(1.0 - NdotV, 3.0) * 0.3;
    vec3 rimLight = vec3(0.0, 0.4, 0.8) * rim;

    vec3 color = ambient + diffuse + specular + rimLight;
    fragColor = vec4(color, 1.0);
}
"""

STAR_VERTEX_SHADER = """
#version 330 core
layout(location = 0) in vec3 position;
layout(location = 1) in vec3 color;
layout(location = 2) in float size;

uniform mat4 u_mvp;
uniform float u_time;

out vec3 v_color;
out float v_size;

void main() {
    v_color = color;
    v_size = size;
    vec4 mvPosition = u_mvp * vec4(position, 1.0);
    gl_Position = mvPosition;
    gl_PointSize = max(1.0, size * (1.0 / -mvPosition.z));
}
"""

STAR_FRAGMENT_SHADER = """
#version 330 core
precision highp float;

in vec3 v_color;
in float v_size;

out vec4 fragColor;

void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
    alpha *= alpha * alpha;
    fragColor = vec4(v_color, alpha);
}
"""

NEBULA_FRAGMENT_SHADER = """
#version 330 core
precision highp float;

uniform vec3 u_color;
uniform float u_time;
uniform float u_scale;

uniform vec2 u_resolution;

out vec4 fragColor;

float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = rand(i);
    float b = rand(i + vec2(1.0, 0.0));
    float c = rand(i + vec2(0.0, 1.0));
    float d = rand(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float n = noise(uv * 3.0 + u_time * 0.02);
    vec3 col = u_color * n * u_scale * 0.5;
    float alpha = n * 0.3 * u_scale;
    fragColor = vec4(col, alpha);
}
"""


# ─────────────────────────────────────────────────────────────────────────────
# Geometry generators
# ─────────────────────────────────────────────────────────────────────────────

def create_uv_sphere(radius, width_segments=64, height_segments=32):
    """Generate sphere vertex data."""
    vertices = []
    normals = []
    uvs = []
    indices = []

    for y in range(height_segments + 1):
        for x in range(width_segments + 1):
            u = x / width_segments
            v = y / height_segments
            theta = u * math.pi * 2
            phi = v * math.pi
            sx = math.sin(phi) * math.cos(theta)
            sy = math.cos(phi)
            sz = math.sin(phi) * math.sin(theta)

            vertices.extend([sx * radius, sy * radius, sz * radius])
            normals.extend([sx, sy, sz])
            uvs.extend([1.0 - u, v])

        if y < height_segments:
            for x in range(width_segments + 1):
                pass  # handled below

    # Generate indices
    for y in range(height_segments):
        for x in range(width_segments):
            a = y * (width_segments + 1) + x
            b = a + 1
            c = a + width_segments + 1
            d = c + 1
            indices.extend([a, c, b, b, c, d])

    vertices = np.array(vertices, dtype=np.float32)
    normals = np.array(normals, dtype=np.float32)
    uvs = np.array(uvs, dtype=np.float32)
    indices = np.array(indices, dtype=np.uint32)
    return vertices, normals, uvs, indices


def create_cylinder(radius_top, radius_bottom, height, segments=32, offset_y=0):
    """Generate cylinder side-surface vertex data (no end caps)."""
    vertices = []
    normals = []
    indices = []

    half_h = height / 2

    # Generate exactly `segments` vertex pairs around the circle, wrapping
    # via modulo so the last quad connects back to the first column.
    for i in range(segments):
        theta = (i / segments) * math.pi * 2
        cos_t = math.cos(theta)
        sin_t = math.sin(theta)

        # Top vertex
        vertices.extend([cos_t * radius_top, half_h + offset_y, sin_t * radius_top])
        normals.extend([cos_t, 0, sin_t])
        # Bottom vertex
        vertices.extend([cos_t * radius_bottom, -half_h + offset_y, sin_t * radius_bottom])
        normals.extend([cos_t, 0, sin_t])

    # Side quad indices (two triangles per segment, wrapping around)
    for i in range(segments):
        p1 = i * 2                       # top of current segment
        p2 = p1 + 1                       # bottom of current segment
        p3 = ((i + 1) % segments) * 2     # top of next segment (wraps to 0)
        p4 = p3 + 1                       # bottom of next segment
        indices.extend([p1, p2, p3, p2, p4, p3])

    vertices = np.array(vertices, dtype=np.float32)
    normals = np.array(normals, dtype=np.float32)
    indices = np.array(indices, dtype=np.uint32)
    return vertices, normals, indices


def create_box(width, height, depth, center_x=0, center_y=0, center_z=0):
    """Generate box vertex data."""
    w, h, d = width / 2, height / 2, depth / 2
    vertices = np.array([
        # Front
        center_x - w, center_y - h, center_z + d,
        center_x + w, center_y - h, center_z + d,
        center_x + w, center_y + h, center_z + d,
        center_x - w, center_y + h, center_z + d,
        # Back
        center_x + w, center_y - h, center_z - d,
        center_x - w, center_y - h, center_z - d,
        center_x - w, center_y + h, center_z - d,
        center_x + w, center_y + h, center_z - d,
        # Top
        center_x - w, center_y + h, center_z + d,
        center_x + w, center_y + h, center_z + d,
        center_x + w, center_y + h, center_z - d,
        center_x - w, center_y + h, center_z - d,
        # Bottom
        center_x - w, center_y - h, center_z - d,
        center_x + w, center_y - h, center_z - d,
        center_x + w, center_y - h, center_z + d,
        center_x - w, center_y - h, center_z + d,
        # Right
        center_x + w, center_y - h, center_z + d,
        center_x + w, center_y - h, center_z - d,
        center_x + w, center_y + h, center_z - d,
        center_x + w, center_y + h, center_z + d,
        # Left
        center_x - w, center_y - h, center_z - d,
        center_x - w, center_y - h, center_z + d,
        center_x - w, center_y + h, center_z + d,
        center_x - w, center_y + h, center_z - d,
    ], dtype=np.float32)

    normals = np.array([
        0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
        0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
        0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
        0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
        1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
        -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
    ], dtype=np.float32)

    indices = np.array([
        0, 1, 2, 0, 2, 3,
        4, 5, 6, 4, 6, 7,
        8, 9, 10, 8, 10, 11,
        12, 13, 14, 12, 14, 15,
        16, 17, 18, 16, 18, 19,
        20, 21, 22, 20, 22, 23,
    ], dtype=np.uint32)

    return vertices, normals, indices


def create_cone(base_radius, height, segments=16, offset_y=0):
    """Generate cone vertex data."""
    vertices = []
    normals = []
    indices = []

    # Apex vertex
    vertices.extend([0.0, height / 2 + offset_y, 0.0])
    normals.extend([0.0, 1.0, 0.0])

    # Base ring vertices
    for i in range(segments):
        theta = (i / segments) * math.pi * 2
        cos_t = math.cos(theta)
        sin_t = math.sin(theta)
        vertices.extend([cos_t * base_radius, -height / 2 + offset_y, sin_t * base_radius])

        # Normal for cone side
        side_len = math.sqrt(base_radius * base_radius + height * height)
        nx = base_radius / side_len
        ny = height / side_len
        normals.extend([nx * cos_t, ny, nx * sin_t])

    # Bottom cap
    vertices.extend([0.0, -height / 2 + offset_y, 0.0])
    normals.extend([0.0, -1.0, 0.0])

    for i in range(segments):
        next_i = (i + 1) % segments
        # Side faces
        indices.extend([0, i + 1, next_i + 1])
        # Bottom fan
        indices.extend([segments + 1, next_i + 1, i + 1])

    vertices = np.array(vertices, dtype=np.float32)
    normals = np.array(normals, dtype=np.float32)
    indices = np.array(indices, dtype=np.uint32)
    return vertices, normals, indices


# ─────────────────────────────────────────────────────────────────────────────
# Mesh helper class
# ─────────────────────────────────────────────────────────────────────────────

class Mesh:
    """A simple mesh with VAO, VBO, EBO for OpenGL rendering."""

    def __init__(self, vertices, normals=None, uvs=None, indices=None,
                 position_offset=(0, 0, 0)):
        self.position_offset = position_offset
        self.index_count = len(indices) if indices is not None else len(vertices) // 3

        # Default normals to zeros if not provided (e.g. for fullscreen quads)
        if normals is None:
            normals = np.zeros_like(vertices)

        # Interleave vertex data
        if uvs is not None:
            # 8 attributes: pos(3) + normal(3) + uv(2)
            data = np.empty((len(vertices) // 3, 8), dtype=np.float32)
            data[:, 0:3] = vertices.reshape(-1, 3)
            data[:, 3:6] = normals.reshape(-1, 3)
            data[:, 6:8] = uvs.reshape(-1, 2)
        else:
            # 6 attributes: pos(3) + normal(3)
            data = np.empty((len(vertices) // 3, 6), dtype=np.float32)
            data[:, 0:3] = vertices.reshape(-1, 3)
            data[:, 3:6] = normals.reshape(-1, 3)

        data = data.flatten()

        self.vao = glGenVertexArrays(1)
        glBindVertexArray(self.vao)

        # VBO
        self.vbo = glGenBuffers(1)
        glBindBuffer(GL_ARRAY_BUFFER, self.vbo)
        glBufferData(GL_ARRAY_BUFFER, data.nbytes, data, GL_STATIC_DRAW)

        stride = data.itemsize * 8 if uvs is not None else data.itemsize * 6
        offset = 0
        # Position
        glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, stride, offset)
        glEnableVertexAttribArray(0)
        offset += 12
        # Normal
        glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, stride, offset)
        glEnableVertexAttribArray(1)
        offset += 12
        if uvs is not None:
            # UV
            glVertexAttribPointer(2, 2, GL_FLOAT, GL_TRUE, stride, offset)
            glEnableVertexAttribArray(2)

        # EBO
        if indices is not None:
            self.ebo = glGenBuffers(1)
            glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, self.ebo)
            glBufferData(GL_ELEMENT_ARRAY_BUFFER, indices.nbytes, indices, GL_STATIC_DRAW)
        else:
            self.ebo = None

        # Apply position offset
        self.offset = np.array(position_offset, dtype=np.float32)

        glBindVertexArray(0)

    def draw(self, program=None, model_matrix=None, color=None, metallic=0.5, roughness=0.5):
        """Draw the mesh with the given shader program."""
        if program:
            glUseProgram(program)

        if model_matrix is not None:
            loc = glGetUniformLocation(program, "u_model")
            if loc >= 0:
                glUniformMatrix4fv(loc, 1, GL_FALSE, model_matrix.astype(np.float32).tobytes())

            # Normal matrix
            normal_mat = np.linalg.inv(model_matrix.T)[:3, :3].flatten()
            # Build proper 3x3 normal matrix
            m3 = model_matrix[:3, :3]
            normal_matrix = np.linalg.inv(m3.T)
            loc_norm = glGetUniformLocation(program, "u_normalMatrix")
            if loc_norm >= 0:
                glUniformMatrix3fv(loc_norm, 1, GL_FALSE, normal_matrix.astype(np.float32).tobytes())

        if color:
            loc_color = glGetUniformLocation(program, "u_color")
            if loc_color >= 0:
                glUniform3fv(loc_color, 1, np.array(color, dtype=np.float32))
            loc_metal = glGetUniformLocation(program, "u_metallic")
            if loc_metal >= 0:
                glUniform1f(loc_metal, metallic)
            loc_rough = glGetUniformLocation(program, "u_roughness")
            if loc_rough >= 0:
                glUniform1f(loc_rough, roughness)

        glBindVertexArray(self.vao)
        if self.ebo:
            glDrawElements(GL_TRIANGLES, self.index_count, GL_UNSIGNED_INT, None)
        else:
            glDrawArrays(GL_TRIANGLES, 0, self.index_count)
        glBindVertexArray(0)


def create_rotation_matrix(angle, axis):
    """Create a rotation matrix around the given axis."""
    c = math.cos(angle)
    s = math.sin(angle)
    x, y, z = axis
    return np.array([
        [c + x*x*(1-c), x*y*(1-c) - z*s, x*z*(1-c) + y*s, 0],
        [y*x*(1-c) + z*s, c + y*y*(1-c), y*z*(1-c) - x*s, 0],
        [z*x*(1-c) - y*s, z*y*(1-c) + x*s, c + z*z*(1-c), 0],
        [0, 0, 0, 1]
    ], dtype=np.float32)


def create_translation_matrix(x, y, z):
    """Create a translation matrix."""
    return np.array([
        [1, 0, 0, x],
        [0, 1, 0, y],
        [0, 0, 1, z],
        [0, 0, 0, 1]
    ], dtype=np.float32)


def create_scale_matrix(s):
    """Create a uniform scale matrix."""
    return np.array([
        [s, 0, 0, 0],
        [0, s, 0, 0],
        [0, 0, s, 0],
        [0, 0, 0, 1]
    ], dtype=np.float32)


def create_perspective_matrix(fov, aspect, near, far):
    """Create a perspective projection matrix."""
    f = 1.0 / math.tan(fov / 2.0)
    return np.array([
        [f / aspect, 0, 0, 0],
        [0, f, 0, 0],
        [0, 0, (far + near) / (near - far), (2 * far * near) / (near - far)],
        [0, 0, -1, 0]
    ], dtype=np.float32)


# ─────────────────────────────────────────────────────────────────────────────
# Aryabhata satellite model
# ─────────────────────────────────────────────────────────────────────────────

def build_aryabhata():
    """
    Build the Aryabhata satellite from procedural geometry.

    Based on the GLB model definition:
      - Polyhedron_Bus: cylinder (r=0.65, h=1.1) — gold MLI
      - Top_Cap: cylinder (rTop=0.05, rBottom=0.65, h=0.3) — gold MLI
      - Bottom_Cap: cylinder (rTop=0.65, rBottom=0.05, h=0.3) — gold MLI
      - Solar_Array_1: box (0.35 × 1.05 × 0.02) at x=-0.66 — solar silicon
      - Solar_Array_2: box (0.35 × 1.05 × 0.02) at x=+0.66 — solar silicon
      - Antenna_1: cylinder (r=0.015, h=0.8) at (0.45, 0.75, 0.45) — silver
      - Antenna_2: cylinder (r=0.015, h=0.8) at (-0.45, 0.75, -0.45) — silver
    """
    meshes = []

    # Main bus cylinder (polyhedron body)
    verts, norms, indices = create_cylinder(0.65, 0.65, 1.1, segments=16)
    meshes.append({
        "mesh": Mesh(verts, norms, indices=indices, position_offset=(0, 0, 0)),
        "color": [0.85, 0.47, 0.02],
        "metallic": 0.9,
        "roughness": 0.25,
    })

    # Top cap (pointed upward)
    verts, norms, indices = create_cylinder(0.05, 0.65, 0.3, segments=16)
    cap_matrix = create_translation_matrix(0, 0.7, 0)
    meshes.append({
        "mesh": Mesh(verts, norms, indices=indices),
        "color": [0.85, 0.47, 0.02],
        "metallic": 0.9,
        "roughness": 0.25,
        "model": cap_matrix,
    })

    # Bottom cap (pointed downward)
    verts, norms, indices = create_cylinder(0.65, 0.05, 0.3, segments=16)
    bottom_cap_matrix = create_translation_matrix(0, -0.7, 0)
    meshes.append({
        "mesh": Mesh(verts, norms, indices=indices),
        "color": [0.85, 0.47, 0.02],
        "metallic": 0.9,
        "roughness": 0.25,
        "model": bottom_cap_matrix,
    })

    # Solar arrays (two panels)
    for x_offset in [-0.66, 0.66]:
        verts, norms, indices = create_box(0.35, 1.05, 0.02,
                                            center_x=x_offset, center_y=0, center_z=0)
        meshes.append({
            "mesh": Mesh(verts, norms, indices=indices),
            "color": [0.12, 0.23, 0.54],
            "metallic": 0.4,
            "roughness": 0.2,
            "emissive": True,
        })

    # Antennas (two thin rods)
    for pos in [(0.45, 0.75, 0.45), (-0.45, 0.75, -0.45)]:
        verts, norms, indices = create_cylinder(0.015, 0.015, 0.8, segments=8)
        # Position the antenna
        translated = verts.reshape(-1, 3).copy()
        translated[:, 0] += pos[0]
        translated[:, 1] += pos[1]
        translated[:, 2] += pos[2]
        verts = translated.flatten()
        meshes.append({
            "mesh": Mesh(verts, norms, indices=indices),
            "color": [0.88, 0.91, 0.94],
            "metallic": 0.95,
            "roughness": 0.2,
        })

    return meshes


# ─────────────────────────────────────────────────────────────────────────────
# Starfield
# ─────────────────────────────────────────────────────────────────────────────

def build_starfield(count=3000):
    """Generate star positions, colors, and sizes."""
    positions = []
    colors = []
    sizes = []

    star_colors = [
        [1.0, 1.0, 1.0],    # white
        [0.7, 0.85, 1.0],   # blue-white
        [0.55, 0.75, 1.0],  # blue
        [1.0, 0.9, 0.75],   # warm white
        [1.0, 0.8, 0.6],    # orange
    ]

    for _ in range(count):
        # Random point on sphere shell
        radius = 50 + np.random.random() * 70
        theta = np.random.random() * math.pi * 2
        phi = math.acos(2 * np.random.random() - 1)
        sin_phi = math.sin(phi)

        positions.extend([
            radius * sin_phi * math.cos(theta),
            radius * sin_phi * math.sin(theta),
            radius * math.cos(phi),
        ])

        c = star_colors[np.random.randint(len(star_colors))]
        colors.extend(c)

        sizes.append(0.3 + np.random.random() * 1.2)

    return (
        np.array(positions, dtype=np.float32),
        np.array(colors, dtype=np.float32),
        np.array(sizes, dtype=np.float32),
    )


# ─────────────────────────────────────────────────────────────────────────────
# Camera path
# ─────────────────────────────────────────────────────────────────────────────

def ease_in_out_cubic(t):
    """Smooth easing function."""
    return 1 - math.pow(1 - t, 3) if t < 0.5 else math.pow(t * 2 - 1, 3) / 2 + 0.5


def get_camera_position(frame):
    """
    Compute the camera position and look-at target for the given frame.

    Animation phases (60s total, 1440 frames @ 24fps):
      Phase 1 (0-10s, 0-240f):   Wide Earth orbit — distant camera circles Earth
      Phase 2 (10-20s, 240-480f): Controlled approach toward Aryabhata
      Phase 3 (20-40s, 480-960f): Orbital flyaround of Aryabhata
      Phase 4 (40-50s, 960-1200f): Pull back from Aryabhata
      Phase 5 (50-60s, 1200-1440f): Wide pull-back to Earth + Aryabhata, fade out
    """
    t = frame / TOTAL_FRAMES  # 0.0 to 1.0

    if t < 240 / TOTAL_FRAMES:
        # Phase 1: Wide Earth orbit (0-10s)
        phase_t = t / (240 / TOTAL_FRAMES)
        orbit_angle = phase_t * math.pi * 4  # Two full orbits

        # Camera distance: 20-22 Earth radii
        dist = EARTH_RADIUS * 22
        cam_x = math.cos(orbit_angle) * dist
        cam_y = math.sin(orbit_angle * 0.5) * dist * 0.3  # Gentle vertical motion
        cam_z = math.sin(orbit_angle) * dist

        look = np.array([0.0, 0.0, 0.0])
        return np.array([cam_x, cam_y, cam_z]), look

    elif t < 480 / TOTAL_FRAMES:
        # Phase 2: Controlled approach (10-20s)
        phase_t = (t - 240 / TOTAL_FRAMES) / (240 / TOTAL_FRAMES)
        phase_t = ease_in_out_cubic(phase_t)

        # Start from wide Earth orbit, end close to Aryabhata
        start_dist = EARTH_RADIUS * 22
        end_dist = 2.5  # Close to satellite

        dist = start_dist * (1 - phase_t) + end_dist * phase_t
        orbit_angle = math.pi * 2 + phase_t * math.pi * 2

        cam_x = math.cos(orbit_angle) * dist
        cam_y = math.sin(orbit_angle * 0.3) * dist * 0.2 + 1.0
        cam_z = math.sin(orbit_angle) * dist

        look = np.array([0.0, 0.0, 0.0])  # Look at Earth center initially
        return np.array([cam_x, cam_y, cam_z]), look

    elif t < 960 / TOTAL_FRAMES:
        # Phase 3: Orbital flyaround of Aryabhata (20-40s)
        phase_t = (t - 480 / TOTAL_FRAMES) / (480 / TOTAL_FRAMES)

        orbit_speed = 0.5  # Slow orbit (0.5 orbits per 20 seconds)
        orbit_angle = phase_t * math.pi * 2 * orbit_speed * 2

        # Camera orbits around Aryabhata at ~3 units distance
        dist = 3.0 + math.sin(phase_t * math.pi) * 0.5  # Gentle distance variation

        cam_x = math.cos(orbit_angle) * dist
        cam_y = math.sin(orbit_angle * 0.6) * dist * 0.4  # Elliptical orbit
        cam_z = math.sin(orbit_angle) * dist

        look = np.array([0.0, 0.0, 0.0])  # Look at Aryabhata center
        return np.array([cam_x, cam_y, cam_z]), look

    elif t < 1200 / TOTAL_FRAMES:
        # Phase 4: Pull back from Aryabhata (40-50s)
        phase_t = (t - 960 / TOTAL_FRAMES) / (240 / TOTAL_FRAMES)
        phase_t = ease_in_out_cubic(phase_t)

        start_dist = 3.0
        end_dist = EARTH_RADIUS * 12

        dist = start_dist * (1 - phase_t) + end_dist * phase_t
        orbit_angle = math.pi * 2 + phase_t * math.pi * 2

        cam_x = math.cos(orbit_angle) * dist * 0.3
        cam_y = math.sin(phase_t * math.pi) * dist * 0.5 + 1.0
        cam_z = math.sin(orbit_angle) * dist

        # Look back at Earth center
        look = np.array([0.0, 0.0, 0.0])
        return np.array([cam_x, cam_y, cam_z]), look

    else:
        # Phase 5: Wide pull-back + fade (50-60s)
        phase_t = (t - 1200 / TOTAL_FRAMES) / (240 / TOTAL_FRAMES)
        phase_t = ease_in_out_cubic(phase_t)

        dist = EARTH_RADIUS * 12 * (1 - phase_t * 0.3) + EARTH_RADIUS * 8 * phase_t * 0.3
        orbit_angle = math.pi * 4 + phase_t * math.pi * 4

        cam_x = math.cos(orbit_angle) * dist * 0.3
        cam_y = math.sin(phase_t * math.pi) * dist * 0.4 + 2.0
        cam_z = math.sin(orbit_angle) * dist

        look = np.array([0.0, 0.0, 0.0])
        return np.array([cam_x, cam_y, cam_z]), look


def get_earth_rotation(frame):
    """Earth rotates slowly (one full rotation over ~60 seconds)."""
    return (frame / TOTAL_FRAMES) * math.pi * 2 * 0.3  # 0.3 full rotations


def get_aryabhata_animation(frame):
    """
    Aryabhata's animation:
    - During approach (Phase 2): Aryabhata at orbit position
    - During flyaround (Phase 3): Aryabhata slowly rotates to show details
    - During pull-back (Phase 4-5): Aryabhata continues slow rotation
    """
    t = frame / TOTAL_FRAMES

    # Aryabhata orbits Earth slowly
    orbit_angle = t * math.pi * 2 * 0.3  # 0.3 orbits

    # Position in orbit (slightly inclined orbit)
    orbit_radius = ARYABHATA_ORBIT_RADIUS
    x = math.cos(orbit_angle) * orbit_radius * 0.3
    y = math.sin(orbit_angle * 0.7) * orbit_radius * 0.1  # Slight inclination
    z = math.sin(orbit_angle) * orbit_radius * 0.3 - EARTH_RADIUS * 1.5

    # During flyaround phase, Aryabhata rotates to show different sides
    if 480 / TOTAL_FRAMES <= t < 960 / TOTAL_FRAMES:
        phase_t = (t - 480 / TOTAL_FRAMES) / (480 / TOTAL_FRAMES)
        self_rotation = phase_t * math.pi * 2 * 2  # 2 full rotations during flyaround
    else:
        self_rotation = t * math.pi * 2 * 0.5  # Slow rotation otherwise

    return np.array([x, y, z]), self_rotation


# ─────────────────────────────────────────────────────────────────────────────
# Main renderer
# ─────────────────────────────────────────────────────────────────~~~~~~~~~~

class Renderer:
    def __init__(self):
        self.width = WIDTH
        self.height = HEIGHT
        self.init_opengl()
        self.load_texture()
        self.build_shaders()
        self.build_geometry()

    def init_opengl(self):
        """Initialize OpenGL context using a hidden Pygame window."""
        pygame.init()
        pygame.display.gl_set_attribute(pygame.GL_MULTISAMPLEBUFFERS, 0)
        pygame.display.gl_set_attribute(pygame.GL_DEPTH_SIZE, 24)
        # Create a small hidden window for OpenGL context
        pygame.display.set_mode((64, 64), pygame.OPENGL | pygame.DOUBLEBUF | pygame.HIDDEN)

        # Create 4K framebuffer
        self.fbo = glGenFramebuffers(1)
        glBindFramebuffer(GL_FRAMEBUFFER, self.fbo)

        # Color attachment — use GL_RGB8 (sized internal format required for FBO completeness on Intel)
        self.tex_color = glGenTextures(1)
        glBindTexture(GL_TEXTURE_2D, self.tex_color)
        glTexImage2D(GL_TEXTURE_2D, 0, GL_RGB8, self.width, self.height, 0, GL_RGB, GL_UNSIGNED_BYTE, None)
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR)
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR)
        glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, self.tex_color, 0)

        # Depth-stencil attachment — GL_DEPTH24_STENCIL8 is more broadly supported than GL_DEPTH_COMPONENT24
        self.rbo_depth = glGenRenderbuffers(1)
        glBindRenderbuffer(GL_RENDERBUFFER, self.rbo_depth)
        glRenderbufferStorage(GL_RENDERBUFFER, GL_DEPTH24_STENCIL8, self.width, self.height)
        glFramebufferRenderbuffer(GL_FRAMEBUFFER, GL_DEPTH_STENCIL_ATTACHMENT, GL_RENDERBUFFER, self.rbo_depth)

        if glCheckFramebufferStatus(GL_FRAMEBUFFER) != GL_FRAMEBUFFER_COMPLETE:
            raise RuntimeError("Framebuffer is not complete!")

        glBindFramebuffer(GL_FRAMEBUFFER, 0)

        # Enable features
        glEnable(GL_DEPTH_TEST)
        glEnable(GL_CULL_FACE)
        glCullFace(GL_BACK)

        print(f"OpenGL initialized: {glGetString(GL_VERSION).decode()[:50]}")
        print(f"Renderer: {glGetString(GL_RENDERER).decode()}")
        print(f"Framebuffer: {self.width}x{self.height}")

    def load_texture(self):
        """Load Earth texture from file."""
        img = Image.open(EARTH_TEXTURE_PATH)
        img = img.transpose(Image.FLIP_TOP_BOTTOM)
        img_data = np.array(img)

        self.earth_texture = glGenTextures(1)
        glBindTexture(GL_TEXTURE_2D, self.earth_texture)
        glTexImage2D(GL_TEXTURE_2D, 0, GL_RGB, img.width, img.height, 0,
                     GL_RGB, GL_UNSIGNED_BYTE, img_data)
        glGenerateMipmap(GL_TEXTURE_2D)
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR_MIPMAP_LINEAR)
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR)
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_REPEAT)
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE)

        print(f"Earth texture loaded: {img.width}x{img.height}")

    def build_shaders(self):
        """Compile shader programs."""
        self.earth_program = shaders.compileProgram(
            shaders.compileShader(EARTH_VERTEX_SHADER, GL_VERTEX_SHADER),
            shaders.compileShader(EARTH_FRAGMENT_SHADER, GL_FRAGMENT_SHADER)
        )
        self.atmosphere_program = shaders.compileProgram(
            shaders.compileShader(ATMOSPHERE_VERTEX_SHADER, GL_VERTEX_SHADER),
            shaders.compileShader(ATMOSPHERE_FRAGMENT_SHADER, GL_FRAGMENT_SHADER)
        )
        self.satellite_program = shaders.compileProgram(
            shaders.compileShader(ARYABHATA_VERTEX_SHADER, GL_VERTEX_SHADER),
            shaders.compileShader(ARYABHATA_FRAGMENT_SHADER, GL_FRAGMENT_SHADER)
        )
        self.star_program = shaders.compileProgram(
            shaders.compileShader(STAR_VERTEX_SHADER, GL_VERTEX_SHADER),
            shaders.compileShader(STAR_FRAGMENT_SHADER, GL_FRAGMENT_SHADER)
        )
        self.nebula_program = shaders.compileProgram(
            shaders.compileShader(NEBULA_VERTEX_SHADER, GL_VERTEX_SHADER),
            shaders.compileShader(NEBULA_FRAGMENT_SHADER, GL_FRAGMENT_SHADER)
        )

        print("Shaders compiled successfully")

    def build_geometry(self):
        """Build all geometry."""
        # Earth sphere
        verts, norms, uvs, indices = create_uv_sphere(EARTH_RADIUS, 128, 64)
        self.earth_mesh = Mesh(verts, norms, uvs, indices)

        # Atmosphere shell (105% of Earth radius)
        verts, norms, uvs, indices = create_uv_sphere(EARTH_RADIUS * 1.025, 64, 32)
        self.atmosphere_inner = Mesh(verts, norms, uvs, indices)
        verts, norms, uvs, indices = create_uv_sphere(EARTH_RADIUS * 1.06, 64, 32)
        self.atmosphere_outer = Mesh(verts, norms, uvs, indices)

        # Aryabhata satellite
        self.aryabhata_meshes = build_aryabhata()

        # Starfield
        star_pos, star_colors, star_sizes = build_starfield(3000)
        self.star_positions = star_pos
        self.star_colors = star_colors
        self.star_sizes = star_sizes

        # Nebula quad (fullscreen triangle)
        self.nebula_quad = self._create_nebula_quad()

    def _create_nebula_quad(self):
        """Create a fullscreen quad for nebula rendering."""
        verts = np.array([
            -1, -1, 0.01,
            1, -1, 0.01,
            -1, 1, 0.01,
            1, 1, 0.01,
        ], dtype=np.float32)
        uvs = np.array([0, 0, 1, 0, 0, 1, 1, 1], dtype=np.float32)
        indices = np.array([0, 1, 2, 1, 3, 2], dtype=np.uint32)
        return Mesh(verts, None, uvs, indices)

    def set_common_uniforms(self, program, model_matrix, view_matrix, proj_matrix):
        """Set common shader uniforms."""
        mvp = proj_matrix @ view_matrix @ model_matrix

        loc_mvp = glGetUniformLocation(program, "u_mvp")
        glUniformMatrix4fv(loc_mvp, 1, GL_FALSE, mvp.astype(np.float32).tobytes())

        loc_model = glGetUniformLocation(program, "u_model")
        glUniformMatrix4fv(loc_model, 1, GL_FALSE, model_matrix.astype(np.float32).tobytes())

        # Normal matrix
        m3 = model_matrix[:3, :3]
        normal_matrix = np.linalg.inv(m3.T)
        loc_norm = glGetUniformLocation(program, "u_normalMatrix")
        glUniformMatrix3fv(loc_norm, 1, GL_FALSE, normal_matrix.astype(np.float32).tobytes())

        # Light direction
        loc_light = glGetUniformLocation(program, "u_lightDir")
        if loc_light >= 0:
            glUniform3f(loc_light, 0.5, 0.3, 0.8)

        # Camera position
        loc_cam = glGetUniformLocation(program, "u_cameraPos")
        if loc_cam >= 0:
            glUniform3f(loc_cam, 0, 0, 100)  # Will be set properly per-frame

    def render_frame(self, frame, ffmpeg_process):
        """Render a single frame and send it to ffmpeg."""
        t = frame / TOTAL_FRAMES

        # Clear
        glClearColor(0.0, 0.0, 0.05, 1.0)
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT)

        # Bind framebuffer
        glBindFramebuffer(GL_FRAMEBUFFER, self.fbo)
        glViewport(0, 0, self.width, self.height)

        # Clear again for offscreen
        glClearColor(0.0, 0.0, 0.05, 1.0)
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT)

        # ── Camera setup ──
        cam_pos, look_at = get_camera_position(frame)
        eye = cam_pos
        target = look_at

        # View matrix (look-at)
        forward = target - eye
        forward = forward / np.linalg.norm(forward)
        right = np.cross(np.array([0, 1, 0]), forward)
        right = right / np.linalg.norm(right)
        up = np.cross(forward, right)

        view_matrix = np.array([
            [right[0], up[0], -forward[0], 0],
            [right[1], up[1], -forward[1], 0],
            [right[2], up[2], -forward[2], 0],
            [-np.dot(right, eye), -np.dot(up, eye), np.dot(forward, eye), 1],
        ], dtype=np.float32)

        aspect = self.width / self.height
        proj_matrix = create_perspective_matrix(math.radians(45), aspect, 0.1, 1000.0)

        u_time = frame / FPS

        # ── Render starfield (as points) ──
        glUseProgram(self.star_program)
        glUniform1f(glGetUniformLocation(self.star_program, "u_time"), u_time)

        star_vao = glGenVertexArrays(1)
        glBindVertexArray(star_vao)

        star_vbo = glGenBuffers(1)
        glBindBuffer(GL_ARRAY_BUFFER, star_vbo)

        # Interleave position + color + size
        star_data = np.empty((len(self.star_positions) // 3, 7), dtype=np.float32)
        star_data[:, 0:3] = self.star_positions.reshape(-1, 3)
        star_data[:, 3:6] = self.star_colors.reshape(-1, 3)
        star_data[:, 6] = self.star_sizes

        glBufferData(GL_ARRAY_BUFFER, star_data.nbytes, star_data.flatten(), GL_STATIC_DRAW)

        star_mvp = proj_matrix @ view_matrix  # No model transform for stars
        loc_mvp = glGetUniformLocation(self.star_program, "u_mvp")
        glUniformMatrix4fv(loc_mvp, 1, GL_FALSE, star_mvp.astype(np.float32).tobytes())

        glEnableVertexAttribArray(0)
        glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 28, 0)
        glEnableVertexAttribArray(1)
        glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, 28, 12)
        glEnableVertexAttribArray(2)
        glVertexAttribPointer(2, 1, GL_FLOAT, GL_FALSE, 28, 24)

        glEnable(GL_PROGRAM_POINT_SIZE)
        glDrawArrays(GL_POINTS, 0, len(self.star_positions) // 3)

        glDeleteBuffers(1, [star_vbo])
        glDeleteVertexArrays(1, [star_vao])

        # ── Render Earth ──
        earth_rotation = get_earth_rotation(frame)
        earth_model = create_rotation_matrix(earth_rotation, (0, 1, 0))

        glUseProgram(self.earth_program)
        self.set_common_uniforms(self.earth_program, earth_model, view_matrix, proj_matrix)

        # Set texture
        glActiveTexture(GL_TEXTURE0)
        glBindTexture(GL_TEXTURE_2D, self.earth_texture)
        glUniform1i(glGetUniformLocation(self.earth_program, "u_earthMap"), 0)
        glUniform1f(glGetUniformLocation(self.earth_program, "u_time"), u_time)

        self.earth_mesh.draw()

        # ── Render atmosphere ──
        glUseProgram(self.atmosphere_program)
        self.set_common_uniforms(self.atmosphere_program, earth_model, view_matrix, proj_matrix)
        glUniform3f(glGetUniformLocation(self.atmosphere_program, "u_lightDir"), 0.5, 0.3, 0.8)
        # Camera position in world space
        glUniform3fv(glGetUniformLocation(self.atmosphere_program, "u_cameraPos"), 1,
                     np.array(eye, dtype=np.float32))
        glUniform1f(glGetUniformLocation(self.atmosphere_program, "u_time"), u_time)

        glEnable(GL_BLEND)
        glBlendFunc(GL_SRC_ALPHA, GL_ONE)
        self.atmosphere_outer.draw()
        glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA)

        # ── Render Aryabhata ──
        sat_pos, sat_rotation = get_aryabhata_animation(frame)

        # Determine if we're in the "close-up" phase
        in_flyaround = 480 / TOTAL_FRAMES <= t < 960 / TOTAL_FRAMES

        for mesh_info in self.aryabhata_meshes:
            model = create_translation_matrix(sat_pos[0], sat_pos[1], sat_pos[2])
            rot_matrix = create_rotation_matrix(sat_rotation, (0, 1, 0))
            model = rot_matrix @ model

            # Apply per-mesh offset
            mesh_offset = create_translation_matrix(*mesh_info["mesh"].position_offset)
            model = model @ mesh_offset

            # Apply additional model matrices
            if "model" in mesh_info:
                model = model @ mesh_info["model"]

            glUseProgram(self.satellite_program)
            self.set_common_uniforms(self.satellite_program, model, view_matrix, proj_matrix)
            glUniform3f(glGetUniformLocation(self.satellite_program, "u_lightDir"), 0.5, 0.3, 0.8)
            glUniform3fv(glGetUniformLocation(self.satellite_program, "u_cameraPos"), 1,
                         np.array(eye, dtype=np.float32))

            color = mesh_info["color"]
            scale_factor = 1.0
            if in_flyaround:
                scale_factor = 1.2  # Slightly larger during flyaround

            glUniform3f(glGetUniformLocation(self.satellite_program, "u_color"),
                        color[0], color[1], color[2])
            glUniform1f(glGetUniformLocation(self.satellite_program, "u_metallic"),
                        mesh_info["metallic"])
            glUniform1f(glGetUniformLocation(self.satellite_program, "u_roughness"),
                        mesh_info["roughness"])

            mesh_info["mesh"].draw(
                self.satellite_program,
                model,
                color,
                mesh_info["metallic"],
                mesh_info["roughness"]
            )

        # ── Read pixels and send to ffmpeg ──
        glBindFramebuffer(GL_FRAMEBUFFER, self.fbo)
        pixels = glReadPixels(0, 0, self.width, self.height, GL_RGB, GL_UNSIGNED_BYTE)
        img = Image.frombytes("RGB", (self.width, self.height), pixels)
        img = img.transpose(Image.FLIP_TOP_BOTTOM)

        # Send to ffmpeg
        ffmpeg_process.stdin.write(img.tobytes())

        # Progress update
        if frame % 60 == 0:
            elapsed = time.time() - self.start_time
            fps = frame / elapsed if elapsed > 0 else 0
            remaining = (TOTAL_FRAMES - frame) / fps if fps > 0 else 0
            print(f"  Frame {frame}/{TOTAL_FRAMES} ({frame/TOTAL_FRAMES*100:.1f}%) "
                  f"[{fps:.1f} fps] remaining: {remaining:.0f}s")

    def run(self, output_prefix):
        """Render all frames and encode to video."""
        self.start_time = time.time()

        # Set up ffmpeg for MP4 encoding
        ffmpeg_cmd_mp4 = [
            FFMPEG_EXE,
            "-y",
            "-f", "rawvideo",
            "-pix_fmt", "rgb24",
            "-s", f"{WIDTH}x{HEIGHT}",
            "-r", str(FPS),
            "-i", "pipe:0",
            "-c:v", "libx264",
            "-preset", "slow",
            "-crf", "16",
            "-pix_fmt", "yuv420p",
            "-color_primaries", "bt709",
            "-color_space", "bt709",
            "-color_trc", "bt709",
            os.path.join(OUTPUT_DIR, f"{output_prefix}_mp4_h264.mp4"),
        ]

        print(f"Starting ffmpeg encoding ({output_prefix}_mp4_h264.mp4)...")
        ffmpeg_process = subprocess.Popen(
            ffmpeg_cmd_mp4,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )

        for frame in range(TOTAL_FRAMES):
            self.render_frame(frame, ffmpeg_process)

        ffmpeg_process.stdin.close()
        stdout, stderr = ffmpeg_process.communicate()
        if ffmpeg_process.returncode != 0:
            print(f"FFmpeg error: {stderr.decode()[:500]}")
        else:
            print(f"MP4 encoded successfully!")

        # Now encode WebM (VP9) from the MP4
        print("Encoding WebM (VP9)...")
        ffmpeg_cmd_webm = [
            FFMPEG_EXE,
            "-y",
            "-i", os.path.join(OUTPUT_DIR, f"{output_prefix}_mp4_h264.mp4"),
            "-c:v", "libvpx-vp9",
            "-b:v", "0",
            "-crf", "28",
            "-pix_fmt", "yuv420p",
            os.path.join(OUTPUT_DIR, f"{output_prefix}_webm_vp9.webm"),
        ]
        result = subprocess.run(ffmpeg_cmd_webm, capture_output=True, text=True)
        if result.returncode == 0:
            print("WebM encoded successfully!")
        else:
            print(f"WebM encoding warning: {result.stderr[:200]}")

        # Optimized MP4 (slightly lower bitrate for web)
        print("Encoding optimized MP4 for web...")
        ffmpeg_cmd_web_mp4 = [
            FFMPEG_EXE,
            "-y",
            "-i", os.path.join(OUTPUT_DIR, f"{output_prefix}_mp4_h264.mp4"),
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "20",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            "-vf", "scale=1920:1080",
            os.path.join(OUTPUT_DIR, f"{output_prefix}_mp4_web_optimized.mp4"),
        ]
        result = subprocess.run(ffmpeg_cmd_web_mp4, capture_output=True, text=True)
        if result.returncode == 0:
            print("Optimized MP4 encoded successfully!")
        else:
            print(f"Optimized MP4 warning: {result.stderr[:200]}")

        pygame.quit()

        elapsed = time.time() - self.start_time
        print(f"\nTotal render time: {elapsed:.1f}s ({TOTAL_FRAMES/elapsed:.1f} fps average)")


# ─────────────────────────────────────────────────────────────────────────────
# Nebula vertex shader (simple passthrough)
# ────────────────────────────────────────────────────────────────────────────

NEBULA_VERTEX_SHADER = """
#version 330 core
layout(location = 0) in vec3 position;
layout(location = 1) in vec2 texCoord;

out vec2 v_uv;

void main() {
    v_uv = texCoord;
    gl_Position = vec4(position, 1.0);
}
"""


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("ARYABHATA MISSION — 4K Cinematic 3D Video Renderer")
    print("=" * 60)
    print(f"Resolution:   {WIDTH}×{HEIGHT}")
    print(f"Duration:     {DURATION} seconds")
    print(f"Frame rate:   {FPS} fps")
    print(f"Total frames: {TOTAL_FRAMES}")
    print(f"Output:       {OUTPUT_DIR}")
    print("=" * 60)

    renderer = Renderer()
    renderer.run("aryabhata_mission")

    # Print output file sizes
    for fname in os.listdir(OUTPUT_DIR):
        if fname.startswith("aryabhata"):
            fpath = os.path.join(OUTPUT_DIR, fname)
            size_mb = os.path.getsize(fpath) / (1024 * 1024)
            print(f"  {fname}: {size_mb:.1f} MB")

    print("\n✅ Video rendering complete!")


if __name__ == "__main__":
    main()
