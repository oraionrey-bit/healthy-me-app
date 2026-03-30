#!/usr/bin/env python3
"""Fix icons that didn't read well in visual review."""

from PIL import Image
import os

OUT = "/Users/oraion/.openclaw/workspace/healthy-me/assets/images/icons"
TRANSPARENT = (0, 0, 0, 0)

LAVENDER = (196, 181, 253)
SOFT_PINK = (249, 168, 212)
BABY_BLUE = (147, 197, 253)
MINT = (110, 231, 183)
PEACH = (253, 186, 116)
CREAM = (254, 243, 199)
PURPLE = (139, 92, 246)
DARK_PURPLE = (74, 53, 96)
WHITE = (255, 255, 255)
LAVENDER_DARK = (150, 130, 210)
PEACH_DARK = (210, 140, 70)
BLUE_DARK = (100, 150, 210)
GRAY_LIGHT = (200, 190, 210)
ERROR = (229, 115, 115)
SUCCESS = (129, 199, 132)
YELLOW = (255, 213, 79)
WARNING = (255, 183, 77)

def new_canvas(grid=16):
    return Image.new("RGBA", (grid, grid), TRANSPARENT)

def scale_up(img, target=64):
    return img.resize((target, target), Image.NEAREST)

def save(img, name):
    scaled = scale_up(img)
    path = os.path.join(OUT, f"{name}.png")
    scaled.save(path)
    print(f"  ✓ {name}.png (fixed)")

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


def fix_pill():
    """Pill capsule — clearly horizontal capsule, half lavender half white."""
    img = new_canvas()
    
    left_fill = LAVENDER
    right_fill = WHITE
    outline = LAVENDER_DARK
    
    # Horizontal capsule - clearly elongated
    # Row 5-10: main body
    # Left rounded end
    draw_pixels(img, [(3,6),(3,7),(3,8),(3,9)], left_fill)
    draw_pixels(img, [(2,7),(2,8)], left_fill)
    
    # Left body
    for y in range(5, 11):
        for x in range(4, 8):
            px(img, x, y, left_fill)
    
    # Right body  
    for y in range(5, 11):
        for x in range(8, 12):
            px(img, x, y, right_fill)
    
    # Right rounded end
    draw_pixels(img, [(12,6),(12,7),(12,8),(12,9)], right_fill)
    draw_pixels(img, [(13,7),(13,8)], right_fill)
    
    # Outline - top
    draw_pixels(img, [(4,4),(5,4),(6,4),(7,4),(8,4),(9,4),(10,4),(11,4)], outline)
    # Outline - bottom
    draw_pixels(img, [(4,11),(5,11),(6,11),(7,11),(8,11),(9,11),(10,11),(11,11)], outline)
    # Outline - left
    draw_pixels(img, [(3,5),(3,10)], outline)
    draw_pixels(img, [(2,6),(2,9)], outline)
    draw_pixels(img, [(1,7),(1,8)], outline)
    # Outline - right
    draw_pixels(img, [(12,5),(12,10)], outline)
    draw_pixels(img, [(13,6),(13,9)], outline)
    draw_pixels(img, [(14,7),(14,8)], outline)
    
    # Center divider (clear vertical line)
    for y in range(4, 12):
        px(img, 8, y, outline)
    
    # Highlight on left half
    draw_pixels(img, [(5,5),(6,5),(5,6)], (220, 210, 255))
    # Highlight on right half
    draw_pixels(img, [(9,5),(10,5)], (240, 240, 250))
    
    save(img, "pill")


def fix_plate():
    """Plate with fork & knife — clearer plate shape with utensils."""
    img = new_canvas()
    
    plate_rim = PEACH_DARK
    plate_fill = CREAM
    plate_inner = (255, 248, 230)
    utensil = PEACH_DARK
    
    # Plate (oval from above)
    plate_rows = {
        5: range(4, 12),
        6: range(3, 13),
        7: range(3, 13),
        8: range(3, 13),
        9: range(3, 13),
        10: range(4, 12),
    }
    for y, xs in plate_rows.items():
        for x in xs:
            px(img, x, y, plate_fill)
    
    # Plate outline
    draw_pixels(img, [
        (4,4),(5,4),(6,4),(7,4),(8,4),(9,4),(10,4),(11,4),
        (3,5),(12,5),
        (2,6),(13,6),
        (2,7),(13,7),
        (2,8),(13,8),
        (2,9),(13,9),
        (3,10),(12,10),
        (4,11),(5,11),(6,11),(7,11),(8,11),(9,11),(10,11),(11,11),
    ], plate_rim)
    
    # Inner plate circle
    draw_pixels(img, [
        (5,6),(6,6),(7,6),(8,6),(9,6),(10,6),
        (5,7),(10,7),
        (5,8),(10,8),
        (5,9),(6,9),(7,9),(8,9),(9,9),(10,9),
    ], plate_rim)
    for y in range(7, 9):
        for x in range(6, 10):
            px(img, x, y, plate_inner)
    
    # Fork (left) - clearly 3 tines
    draw_pixels(img, [(0,4),(0,5),(0,6)], utensil)  # left tine
    draw_pixels(img, [(1,4),(1,5),(1,6),(1,7),(1,8),(1,9),(1,10),(1,11),(1,12)], utensil)  # middle/handle
    px(img, 2, 4, utensil)  # right tine top
    px(img, 2, 5, utensil)
    px(img, 2, 6, utensil)
    
    # Knife (right) - blade shape
    draw_pixels(img, [(14,4),(14,5),(14,6),(14,7),(14,8),(14,9),(14,10),(14,11),(14,12)], utensil)
    draw_pixels(img, [(15,5),(15,6),(15,7)], utensil)  # blade edge
    
    # Food on plate (small colored dots to suggest food)
    draw_pixels(img, [(7,7),(8,7),(7,8),(8,8)], PEACH)
    px(img, 6, 8, (130, 200, 130))  # green garnish
    
    save(img, "plate")


def fix_microscope():
    """Microscope — clearer scientific instrument shape."""
    img = new_canvas()
    
    fill = BABY_BLUE
    outline = BLUE_DARK
    
    # Eyepiece (top tube)
    fill_rect(img, 6, 0, 8, 2, fill)
    draw_pixels(img, [(5,0),(9,0),(5,1),(9,1),(5,2),(9,2)], outline)
    
    # Upper tube (angled toward viewer)
    fill_rect(img, 6, 3, 8, 5, fill)
    draw_pixels(img, [(5,3),(9,3),(5,4),(9,4),(5,5),(9,5)], outline)
    
    # Body/arm (diagonal)
    draw_pixels(img, [(5,6),(6,6),(7,6),(8,6)], fill)
    draw_pixels(img, [(4,6),(9,6)], outline)
    draw_pixels(img, [(4,7),(5,7),(6,7),(7,7)], fill)
    draw_pixels(img, [(3,7),(8,7)], outline)
    draw_pixels(img, [(3,8),(4,8),(5,8),(6,8)], fill)
    draw_pixels(img, [(2,8),(7,8)], outline)
    
    # Objective lens (bottom of arm)
    draw_pixels(img, [(3,9),(4,9),(5,9)], fill)
    draw_pixels(img, [(2,9),(6,9)], outline)
    draw_pixels(img, [(3,10),(4,10),(5,10)], fill)
    draw_pixels(img, [(2,10),(6,10)], outline)
    
    # Stage (horizontal platform)
    fill_rect(img, 1, 11, 11, 11, fill)
    draw_pixels(img, [(0,11),(12,11),(1,12),(2,12),(3,12),(4,12),(5,12),(6,12),(7,12),(8,12),(9,12),(10,12),(11,12)], outline)
    
    # Pillar (vertical stand)
    fill_rect(img, 9, 3, 10, 13, fill)
    draw_pixels(img, [(8,3),(11,3),(8,4),(11,4),(8,5),(11,5),(8,6),(11,6),
                       (8,7),(11,7),(8,8),(11,8),(8,9),(11,9),(8,10),(11,10),
                       (11,11),(11,12)], outline)
    
    # Base
    fill_rect(img, 5, 13, 13, 14, fill)
    draw_pixels(img, [
        (4,13),(14,13),
        (5,15),(6,15),(7,15),(8,15),(9,15),(10,15),(11,15),(12,15),(13,15),
        (4,14),(14,14),
    ], outline)
    
    # Small glass slide on stage
    draw_pixels(img, [(3,11),(4,11),(5,11)], (200, 230, 255))
    
    save(img, "microscope")


def fix_energy():
    """Fix energy icons to look more clearly like batteries."""
    for level in range(1, 6):
        img = new_canvas()
        outline = DARK_PURPLE
        
        fill_colors = {1: ERROR, 2: WARNING, 3: YELLOW, 4: MINT, 5: SUCCESS}
        names = {1: "energy-1-empty", 2: "energy-2-low", 3: "energy-3-medium", 4: "energy-4-high", 5: "energy-5-full"}
        fill_color = fill_colors[level]
        
        # Horizontal battery (more recognizable)
        # Body outline
        draw_pixels(img, [
            (2,4),(3,4),(4,4),(5,4),(6,4),(7,4),(8,4),(9,4),(10,4),(11,4),
            (1,5),(12,5),
            (1,6),(12,6),
            (1,7),(12,7),
            (1,8),(12,8),
            (1,9),(12,9),
            (1,10),(12,10),
            (2,11),(3,11),(4,11),(5,11),(6,11),(7,11),(8,11),(9,11),(10,11),(11,11),
        ], outline)
        
        # Battery terminal (right nub)
        draw_pixels(img, [(12,6),(12,7),(12,8),(12,9)], outline)
        draw_pixels(img, [(13,6),(14,6),(13,7),(14,7),(13,8),(14,8),(13,9),(14,9)], outline)
        fill_rect(img, 13, 7, 13, 8, fill_color if level >= 4 else GRAY_LIGHT)
        
        # Inner body (white)
        fill_rect(img, 2, 5, 11, 10, WHITE)
        
        # Fill level (left to right)
        fill_widths = {1: 2, 2: 4, 3: 6, 4: 8, 5: 10}
        w = fill_widths[level]
        fill_rect(img, 2, 5, 1 + w, 10, fill_color)
        
        # Segment lines
        for sx in [4, 6, 8, 10]:
            if sx < 2 + w:
                for sy in range(5, 11):
                    px(img, sx, sy, (fill_color[0]//2 + 80, fill_color[1]//2 + 80, fill_color[2]//2 + 80))
        
        # Lightning on full
        if level == 5:
            draw_pixels(img, [(7,6),(6,7),(7,7),(8,7),(7,8),(8,8),(8,9)], YELLOW)
        
        save(img, names[level])


print("Fixing icons...")
fix_pill()
fix_plate()
fix_microscope()
fix_energy()
print("Done!")
