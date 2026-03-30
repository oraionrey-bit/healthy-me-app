#!/usr/bin/env python3
"""Fix plate and microscope icons - v2 with clearer shapes."""

from PIL import Image
import os

OUT = "/Users/oraion/.openclaw/workspace/healthy-me/assets/images/icons"
TRANSPARENT = (0, 0, 0, 0)

BABY_BLUE = (147, 197, 253)
PEACH = (253, 186, 116)
CREAM = (254, 243, 199)
MINT = (110, 231, 183)
DARK_PURPLE = (74, 53, 96)
PEACH_DARK = (210, 140, 70)
BLUE_DARK = (100, 150, 210)
WHITE = (255, 255, 255)

def new_canvas(grid=16):
    return Image.new("RGBA", (grid, grid), TRANSPARENT)

def scale_up(img, target=64):
    return img.resize((target, target), Image.NEAREST)

def save(img, name):
    scaled = scale_up(img)
    path = os.path.join(OUT, f"{name}.png")
    scaled.save(path)
    print(f"  ✓ {name}.png")

def px(img, x, y, color):
    if len(color) == 3:
        color = color + (255,)
    if 0 <= x < img.width and 0 <= y < img.height:
        img.putpixel((x, y), color)

def draw_pixels(img, pixels, color):
    for x, y in pixels:
        px(img, x, y, color)

def fill_rect(img, x1, y1, x2, y2, color):
    for x in range(x1, x2+1):
        for y in range(y1, y2+1):
            px(img, x, y, color)


def fix_plate_v2():
    """Fork + knife with small plate between them — classic restaurant icon."""
    img = new_canvas()
    
    o = PEACH_DARK  # outline
    f = PEACH       # fill
    p = CREAM       # plate
    
    # Fork (left, 3 tines)
    # Tines
    for ty in range(1, 6):
        px(img, 2, ty, o)
        px(img, 4, ty, o)
    px(img, 3, 1, o)
    px(img, 3, 2, o)
    px(img, 3, 3, o)
    # Handle
    for ty in range(4, 14):
        px(img, 3, ty, o)
    # Tine tips
    px(img, 2, 0, f)
    px(img, 3, 0, f)
    px(img, 4, 0, f)
    # Fill between tines
    px(img, 3, 4, f)
    px(img, 3, 5, f)
    
    # Plate (center circle, simple)
    plate_outline = [
        (7,4),(8,4),(9,4),
        (6,5),(10,5),
        (6,6),(10,6),
        (6,7),(10,7),
        (6,8),(10,8),
        (6,9),(10,9),
        (7,10),(8,10),(9,10),
    ]
    draw_pixels(img, plate_outline, o)
    # Fill plate
    for y in range(5, 10):
        for x in range(7, 10):
            px(img, x, y, p)
    px(img, 7, 4, p)
    px(img, 8, 4, p)
    px(img, 9, 4, p)
    
    # Food dot on plate
    px(img, 8, 7, PEACH)
    px(img, 7, 7, MINT)
    
    # Knife (right)
    # Blade
    for ty in range(0, 8):
        px(img, 12, ty, o)
    px(img, 13, 1, o)
    px(img, 13, 2, o)
    px(img, 13, 3, o)
    px(img, 13, 4, o)
    px(img, 13, 5, o)
    # Handle
    for ty in range(8, 14):
        px(img, 12, ty, o)
    # Blade fill
    px(img, 13, 2, f)
    px(img, 13, 3, f)
    px(img, 13, 4, f)
    
    save(img, "plate")


def fix_microscope_v2():
    """Simplified microscope — classic lab icon shape."""
    img = new_canvas()
    
    o = BLUE_DARK
    f = BABY_BLUE
    h = (180, 215, 255)  # highlight
    
    # Base (wide horizontal)
    fill_rect(img, 3, 13, 12, 14, f)
    draw_pixels(img, [
        (2,13),(13,13),(2,14),(13,14),
        (3,15),(4,15),(5,15),(6,15),(7,15),(8,15),(9,15),(10,15),(11,15),(12,15),
    ], o)
    
    # Vertical stand (right side pillar)
    fill_rect(img, 10, 2, 11, 12, f)
    draw_pixels(img, [(9,2),(12,2),(9,3),(12,3),(9,4),(12,4),(9,5),(12,5),
                       (9,6),(12,6),(9,7),(12,7),(9,8),(12,8),(9,9),(12,9),
                       (9,10),(12,10),(9,11),(12,11),(9,12),(12,12)], o)
    
    # Top piece / eyepiece (horizontal arm from pillar to left)
    fill_rect(img, 5, 2, 9, 3, f)
    draw_pixels(img, [(4,1),(5,1),(6,1),(7,1),(8,1),(9,1),
                       (4,2),(4,3),(4,4)], o)
    # Eyepiece tube going up
    fill_rect(img, 5, 0, 7, 1, f)
    draw_pixels(img, [(4,0),(8,0),(8,1)], o)
    
    # Arm angling down to objective  
    fill_rect(img, 5, 4, 7, 5, f)
    draw_pixels(img, [(4,4),(8,4),(4,5),(8,5)], o)
    
    # Objective lens (small rectangle hanging down)
    fill_rect(img, 5, 6, 6, 8, f)
    draw_pixels(img, [(4,6),(7,6),(4,7),(7,7),(4,8),(7,8),(5,9),(6,9)], o)
    
    # Stage (horizontal platform where slide sits)
    fill_rect(img, 2, 10, 12, 10, f)
    draw_pixels(img, [(1,10),(13,10),(2,11),(3,11),(4,11),(5,11),(6,11),(7,11),(8,11)], o)
    
    # Slide on stage
    draw_pixels(img, [(4,10),(5,10),(6,10),(7,10)], (220, 240, 255))
    
    # Highlight on eyepiece
    draw_pixels(img, [(6,0),(6,1)], h)
    
    save(img, "microscope")


def fix_microscope_v3():
    """Even simpler: heart monitor / health chart icon instead."""
    img = new_canvas()
    
    o = BLUE_DARK
    f = BABY_BLUE
    
    # Clipboard/monitor shape
    fill_rect(img, 2, 3, 13, 13, WHITE)
    draw_pixels(img, [
        (2,2),(3,2),(4,2),(5,2),(6,2),(7,2),(8,2),(9,2),(10,2),(11,2),(12,2),(13,2),
        (1,3),(14,3),(1,4),(14,4),(1,5),(14,5),(1,6),(14,6),
        (1,7),(14,7),(1,8),(14,8),(1,9),(14,9),(1,10),(14,10),
        (1,11),(14,11),(1,12),(14,12),(1,13),(14,13),
        (2,14),(3,14),(4,14),(5,14),(6,14),(7,14),(8,14),(9,14),(10,14),(11,14),(12,14),(13,14),
    ], o)
    
    # Header bar
    fill_rect(img, 2, 3, 13, 4, f)
    
    # Heart rate line (ECG zigzag)
    ecg = [
        (3,9),(4,9),(5,8),(6,7),(7,5),(8,10),(9,6),(10,8),(11,9),(12,9),
    ]
    draw_pixels(img, ecg, BLUE_DARK)
    # Connect the line
    px(img, 7, 6, BLUE_DARK)
    px(img, 7, 7, BLUE_DARK)
    px(img, 7, 8, BLUE_DARK)
    px(img, 7, 9, BLUE_DARK)
    px(img, 8, 9, BLUE_DARK)
    px(img, 8, 8, BLUE_DARK)
    px(img, 8, 7, BLUE_DARK)
    px(img, 9, 7, BLUE_DARK)
    
    # Small heart in header
    draw_pixels(img, [(7,3),(8,3),(6,4),(7,4),(8,4),(9,4)], (229, 115, 115))
    
    # Clip at top
    fill_rect(img, 6, 0, 9, 2, o)
    fill_rect(img, 7, 1, 8, 1, f)
    
    save(img, "health-monitor")

print("Fixing plate and microscope (v2)...")
fix_plate_v2()
fix_microscope_v2()
fix_microscope_v3()  # alternative health monitor
print("Done!")
