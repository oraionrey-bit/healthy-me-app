#!/usr/bin/env python3
"""Fix plate icon - final attempt with clear fork+knife design."""

from PIL import Image, ImageDraw
import os

OUT = "/Users/oraion/.openclaw/workspace/healthy-me/assets/images/icons"
TRANSPARENT = (0, 0, 0, 0)

PEACH = (253, 186, 116)
CREAM = (254, 243, 199)
PEACH_DARK = (210, 140, 70)
MINT = (110, 231, 183)

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


def make_plate_v3():
    """Simple top-down plate with fork on left, knife on right."""
    img = new_canvas()
    o = PEACH_DARK
    f = PEACH
    plate = CREAM
    
    # == PLATE (center circle, top-down view) ==
    # Outer rim
    plate_rim = [
        (6,2),(7,2),(8,2),(9,2),
        (5,3),(10,3),
        (4,4),(11,4),
        (4,5),(11,5),
        (4,6),(11,6),
        (4,7),(11,7),
        (4,8),(11,8),
        (4,9),(11,9),
        (4,10),(11,10),
        (5,11),(10,11),
        (6,12),(7,12),(8,12),(9,12),
    ]
    draw_pixels(img, plate_rim, o)
    
    # Fill plate
    for y in range(3, 12):
        for x in range(5, 11):
            if img.getpixel((x,y))[3] == 0:
                px(img, x, y, plate)
    for x in range(6, 10):
        px(img, x, 2, plate)
        px(img, x, 12, plate)
    
    # Inner circle (lighter)
    inner_rim = [
        (7,4),(8,4),
        (6,5),(9,5),
        (6,6),(9,6),
        (6,7),(9,7),
        (6,8),(9,8),
        (6,9),(9,9),
        (7,10),(8,10),
    ]
    draw_pixels(img, inner_rim, o)
    
    # == FORK (left side) ==
    # 3 tines at top
    px(img, 1, 1, o)
    px(img, 2, 1, o)  
    px(img, 3, 1, o)
    px(img, 1, 2, o)
    px(img, 2, 2, o)
    px(img, 3, 2, o)
    px(img, 1, 3, o)
    px(img, 2, 3, o)
    px(img, 3, 3, o)
    px(img, 1, 4, o)
    px(img, 2, 4, o)
    px(img, 3, 4, o)
    # Neck narrows
    px(img, 2, 5, o)
    # Handle
    for y in range(6, 14):
        px(img, 2, y, o)
    
    # Fork fill (tines)
    px(img, 1, 1, f)
    px(img, 3, 1, f)
    px(img, 1, 2, f)
    px(img, 3, 2, f)
    px(img, 1, 3, f)
    px(img, 3, 3, f)
    
    # == KNIFE (right side) ==
    # Blade (wider at top)
    px(img, 13, 1, o)
    px(img, 14, 1, o)
    px(img, 13, 2, o)
    px(img, 14, 2, o)
    px(img, 13, 3, o)
    px(img, 14, 3, o)
    px(img, 13, 4, o)
    px(img, 14, 4, o)
    px(img, 13, 5, o)
    px(img, 14, 5, o)
    # Narrowing
    px(img, 13, 6, o)
    # Handle
    for y in range(7, 14):
        px(img, 13, y, o)
    
    # Blade fill
    px(img, 14, 2, f)
    px(img, 14, 3, f)
    px(img, 14, 4, f)
    
    save(img, "plate")


print("Final plate fix...")
make_plate_v3()
print("Done!")
