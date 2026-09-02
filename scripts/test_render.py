#!/usr/bin/env python
"""Quick test: render 5 frames to verify the pipeline works."""

import os
import sys
import time
import subprocess

# Add scripts to path
sys.path.insert(0, os.path.dirname(__file__))

from render_aryabhata import (
    Renderer, WIDTH, HEIGHT, FPS, OUTPUT_DIR, FFMPEG_EXE
)

# Patch TOTAL_FRAMES for test
import render_aryabhata
render_aryabhata.TOTAL_FRAMES = 5

def main():
    print("Testing rendering pipeline with 5 frames...")

    renderer = Renderer()
    renderer.start_time = time.time()

    # Set up ffmpeg
    ffmpeg_cmd = [
        FFMPEG_EXE, "-y",
        "-f", "rawvideo", "-pix_fmt", "rgb24",
        "-s", f"{WIDTH}x{HEIGHT}", "-r", str(FPS),
        "-i", "pipe:0",
        "-c:v", "libx264", "-preset", "fast", "-crf", "18",
        "-pix_fmt", "yuv420p",
        os.path.join(OUTPUT_DIR, "test_aryabhata.mp4"),
    ]

    print("Starting ffmpeg...")
    proc = subprocess.Popen(ffmpeg_cmd, stdin=subprocess.PIPE,
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    start = time.time()
    for frame in range(5):
        renderer.render_frame(frame, proc)

    proc.stdin.close()
    stdout, stderr = proc.communicate()
    elapsed = time.time() - start

    if proc.returncode == 0:
        video_path = os.path.join(OUTPUT_DIR, "test_aryabhata.mp4")
        size_mb = os.path.getsize(video_path) / (1024 * 1024)
        print(f"\n✅ Test render complete!")
        print(f"   5 frames in {elapsed:.1f}s ({5/elapsed:.1f} fps)")
        print(f"   Video: {size_mb:.1f} MB")
        print(f"   Estimated full render (1440 frames): {elapsed * 1440 / 5:.0f}s = {elapsed * 1440 / 5 / 60:.1f} min")
    else:
        print(f"❌ FFmpeg error: {stderr.decode()[:500]}")

    import pygame
    pygame.quit()

if __name__ == "__main__":
    main()
