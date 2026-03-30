#!/usr/bin/env python3
"""Generate pixel art icons for Healthy Me app.
Hand-crafted pixel art drawn on a grid then scaled to 64x64.
"""

from PIL import Image, ImageDraw
import os

OUT = "/Users/oraion/.openclaw/workspace/healthy-me/assets/images/icons"
os.makedirs(OUT, exist_ok=True)

# Color palette from DESIGN-SYSTEM.md
LAVENDER = (196, 181, 253)      # #c4b5fd
SOFT_PINK = (249, 168, 212)     # #f9a8d4
BABY_BLUE = (147, 197, 253)     # #93c5fd
MINT = (110, 231, 183)          # #6ee7b7
PEACH = (253, 186, 116)         # #fdba74
CREAM = (254, 243, 199)         # #fef3c7
PURPLE = (139, 92, 246)         # #8b5cf6
DEEP_PURPLE = (124, 77, 255)    # #7c4dff
DARK_PURPLE = (74, 53, 96)      # #4a3560
SOFT_PURPLE = (209, 196, 233)   # #d1c4e9
SUCCESS = (129, 199, 132)       # #81c784
WARNING = (255, 183, 77)        # #ffb74d
ERROR = (229, 115, 115)         # #e57373
WHITE = (255, 255, 255)
TRANSPARENT = (0, 0, 0, 0)

# Darker outlines (for pixel art 1px outlines)
PINK_DARK = (219, 119, 170)
PEACH_DARK = (210, 140, 70)
MINT_DARK = (70, 180, 130)
LAVENDER_DARK = (150, 130, 210)
BLUE_DARK = (100, 150, 210)
PURPLE_DARK = (100, 60, 200)
RED_DARK = (180, 70, 70)
YELLOW = (255, 213, 79)
YELLOW_DARK = (200, 165, 50)
ORANGE = (255, 167, 38)
ORANGE_DARK = (200, 120, 20)
GRAY_LIGHT = (200, 190, 210)
GRAY = (160, 148, 175)


def new_canvas(grid=16):
    """Create a transparent RGBA image at grid size."""
    return Image.new("RGBA", (grid, grid), TRANSPARENT)


def scale_up(img, target=64):
    """Scale pixel art to target size using nearest neighbor."""
    return img.resize((target, target), Image.NEAREST)


def save(img, name, grid=16):
    """Scale and save an icon."""
    scaled = scale_up(img)
    path = os.path.join(OUT, f"{name}.png")
    scaled.save(path)
    print(f"  ✓ {name}.png ({scaled.size[0]}x{scaled.size[1]})")
    return path


def px(img, x, y, color):
    """Set a single pixel (with alpha support)."""
    if len(color) == 3:
        color = color + (255,)
    if 0 <= x < img.width and 0 <= y < img.height:
        img.putpixel((x, y), color)


def fill_rect(img, x1, y1, x2, y2, color):
    """Fill a rectangle."""
    for x in range(x1, x2+1):
        for y in range(y1, y2+1):
            px(img, x, y, color)


def draw_pixels(img, pixels, color):
    """Draw a list of (x,y) tuples in a color."""
    for x, y in pixels:
        px(img, x, y, color)


# ============================================================
# P0 — TAB BAR ICONS
# ============================================================

def make_heart():
    """Pixel heart — pink/red, Home tab."""
    img = new_canvas()
    # Classic pixel heart shape on 16x16
    outline = PINK_DARK
    fill = SOFT_PINK
    highlight = (255, 210, 230)
    
    # Heart outline
    heart_rows = {
        3:  [(4,), (5,), (9,), (10,)],
        4:  [(3,), (6,), (8,), (11,)],
        5:  [(3,), (11,)],
        6:  [(3,), (11,)],
        7:  [(4,), (10,)],
        8:  [(5,), (9,)],
        9:  [(6,), (8,)],
        10: [(7,)],
    }
    
    # Fill heart solid
    fill_pixels = [
        # Row 3-4: two bumps
        (4,3),(5,3),(9,3),(10,3),
        (3,4),(4,4),(5,4),(6,4),(8,4),(9,4),(10,4),(11,4),
        # Row 5-6: full width
        (3,5),(4,5),(5,5),(6,5),(7,5),(8,5),(9,5),(10,5),(11,5),
        (3,6),(4,6),(5,6),(6,6),(7,6),(8,6),(9,6),(10,6),(11,6),
        # Row 7: narrowing
        (4,7),(5,7),(6,7),(7,7),(8,7),(9,7),(10,7),
        # Row 8
        (5,8),(6,8),(7,8),(8,8),(9,8),
        # Row 9
        (6,9),(7,9),(8,9),
        # Row 10: point
        (7,10),
    ]
    draw_pixels(img, fill_pixels, fill)
    
    # Outline
    outline_pixels = [
        (4,2),(5,2),(9,2),(10,2),
        (3,3),(6,3),(8,3),(11,3),
        (2,4),(7,4),(12,4),
        (2,5),(12,5),
        (2,6),(12,6),
        (3,7),(11,7),
        (4,8),(10,8),
        (5,9),(9,9),
        (6,10),(8,10),
        (7,11),
    ]
    draw_pixels(img, outline_pixels, outline)
    
    # Highlight (top-left shine)
    draw_pixels(img, [(4,4),(5,4),(4,5)], highlight)
    
    save(img, "heart")


def make_plate():
    """Plate with fork & knife — peach/orange, Food tab."""
    img = new_canvas()
    
    # Plate (circle)
    plate_outline = PEACH_DARK
    plate_fill = CREAM
    
    # Plate circle
    plate_outline_px = [
        (5,3),(6,3),(7,3),(8,3),(9,3),(10,3),
        (4,4),(11,4),
        (3,5),(12,5),
        (3,6),(12,6),
        (3,7),(12,7),
        (3,8),(12,8),
        (3,9),(12,9),
        (4,10),(11,10),
        (5,11),(6,11),(7,11),(8,11),(9,11),(10,11),
    ]
    draw_pixels(img, plate_outline_px, plate_outline)
    
    # Fill plate
    for y in range(4, 11):
        for x in range(4, 12):
            if img.getpixel((x, y)) == (0,0,0,0):
                px(img, x, y, plate_fill)
    # Fill row 3 inner
    for x in range(5,11):
        if img.getpixel((x, 3)) == (0,0,0,0):
            pass  # outline already there
    
    # Fork (left side)
    fork_color = PEACH
    fork_dark = PEACH_DARK
    draw_pixels(img, [(2,3),(2,4),(2,5),(2,6),(2,7),(2,8),(2,9),(2,10),(2,11)], fork_dark)
    draw_pixels(img, [(1,3),(1,4),(1,5)], fork_color)
    draw_pixels(img, [(3,3),(3,4)], fork_color)  # tines hint
    
    # Knife (right side)
    draw_pixels(img, [(13,3),(13,4),(13,5),(13,6),(13,7),(13,8),(13,9),(13,10),(13,11)], fork_dark)
    draw_pixels(img, [(14,4),(14,5),(14,6)], PEACH)  # blade width
    
    save(img, "plate")


def make_dumbbell():
    """Pixel dumbbell — mint/green, Move tab."""
    img = new_canvas()
    
    fill = MINT
    outline = MINT_DARK
    
    # Dumbbell: two weights connected by a bar
    # Left weight
    fill_rect(img, 2, 4, 4, 11, fill)
    draw_pixels(img, [(1,5),(1,6),(1,7),(1,8),(1,9),(1,10)], fill)
    # Right weight
    fill_rect(img, 11, 4, 13, 11, fill)
    draw_pixels(img, [(14,5),(14,6),(14,7),(14,8),(14,9),(14,10)], fill)
    # Bar
    fill_rect(img, 5, 7, 10, 8, fill)
    
    # Outlines
    # Left weight outline
    draw_pixels(img, [
        (2,3),(3,3),(4,3),
        (1,4),(5,4),
        (0,5),(5,5),
        (0,6),(5,6),
        (0,7),
        (0,8),
        (0,9),(5,9),
        (0,10),(5,10),
        (1,11),(5,11),
        (2,12),(3,12),(4,12),
    ], outline)
    # Right weight outline
    draw_pixels(img, [
        (11,3),(12,3),(13,3),
        (10,4),(14,4),
        (10,5),(15,5),
        (10,6),(15,6),
        (15,7),
        (15,8),
        (10,9),(15,9),
        (10,10),(15,10),
        (10,11),(14,11),
        (11,12),(12,12),(13,12),
    ], outline)
    # Bar outline
    draw_pixels(img, [(5,6),(6,6),(7,6),(8,6),(9,6),(10,6)], outline)
    draw_pixels(img, [(5,9),(6,9),(7,9),(8,9),(9,9),(10,9)], outline)
    
    # Highlight
    draw_pixels(img, [(2,5),(3,5),(12,5),(11,5)], (150, 245, 210))
    
    save(img, "dumbbell")


def make_bottle():
    """Skincare bottle — lavender, Skin tab."""
    img = new_canvas()
    
    fill = LAVENDER
    outline = LAVENDER_DARK
    cap = SOFT_PURPLE
    
    # Bottle cap
    fill_rect(img, 6, 2, 9, 3, cap)
    draw_pixels(img, [(5,2),(10,2),(5,3),(10,3)], outline)
    draw_pixels(img, [(6,1),(7,1),(8,1),(9,1)], outline)
    
    # Bottle neck
    fill_rect(img, 6, 4, 9, 5, fill)
    draw_pixels(img, [(5,4),(10,4),(5,5),(10,5)], outline)
    
    # Bottle body
    fill_rect(img, 4, 6, 11, 13, fill)
    # Body outline
    draw_pixels(img, [
        (3,6),(12,6),
        (3,7),(12,7),
        (3,8),(12,8),
        (3,9),(12,9),
        (3,10),(12,10),
        (3,11),(12,11),
        (3,12),(12,12),
        (3,13),(12,13),
        (4,14),(5,14),(6,14),(7,14),(8,14),(9,14),(10,14),(11,14),
    ], outline)
    
    # Label area (cream rectangle in middle)
    fill_rect(img, 5, 8, 10, 11, CREAM)
    draw_pixels(img, [(5,8),(6,8),(7,8),(8,8),(9,8),(10,8)], LAVENDER_DARK)
    draw_pixels(img, [(5,11),(6,11),(7,11),(8,11),(9,11),(10,11)], LAVENDER_DARK)
    
    # Highlight
    draw_pixels(img, [(4,7),(4,8),(5,7)], (220, 210, 255))
    
    save(img, "bottle")


def make_microscope():
    """Pixel microscope — baby blue, Health tab."""
    img = new_canvas()
    
    fill = BABY_BLUE
    outline = BLUE_DARK
    
    # Base
    fill_rect(img, 3, 12, 12, 13, fill)
    draw_pixels(img, [
        (2,12),(13,12),
        (2,13),(13,13),
        (3,14),(4,14),(5,14),(6,14),(7,14),(8,14),(9,14),(10,14),(11,14),(12,14),
    ], outline)
    
    # Stand/pillar
    fill_rect(img, 7, 4, 9, 11, fill)
    draw_pixels(img, [(6,4),(10,4),(6,5),(10,5),(6,6),(10,6),(6,7),(10,7),
                       (6,8),(10,8),(6,9),(10,9),(6,10),(10,10),(6,11),(10,11)], outline)
    
    # Eyepiece (top)
    fill_rect(img, 6, 1, 10, 3, fill)
    draw_pixels(img, [(5,1),(11,1),(5,2),(11,2),(5,3),(11,3),(6,0),(7,0),(8,0),(9,0),(10,0)], outline)
    
    # Viewing arm (angled left)
    draw_pixels(img, [(5,7),(4,8),(3,9),(2,10)], fill)
    draw_pixels(img, [(4,7),(3,8),(2,9),(1,10)], outline)
    draw_pixels(img, [(6,8),(5,9),(4,10),(3,11)], outline)
    
    # Lens at bottom of arm
    fill_rect(img, 1, 11, 3, 11, fill)
    draw_pixels(img, [(0,11),(4,11),(1,12),(2,12),(3,12)], outline)
    
    # Stage/platform
    fill_rect(img, 4, 10, 12, 11, fill)
    
    # Highlight
    draw_pixels(img, [(7,2),(8,2)], (180, 220, 255))
    
    save(img, "microscope")


# ============================================================
# P1 — SUPPLEMENT ICONS
# ============================================================

def make_pill():
    """Pill capsule — half lavender, half white."""
    img = new_canvas()
    
    # Capsule shape (horizontal, rounded)
    # Left half - lavender
    left = LAVENDER
    left_dark = LAVENDER_DARK
    # Right half - white
    right = WHITE
    right_dark = GRAY_LIGHT
    
    # Capsule outline
    outline_top = [
        (5,4),(6,4),(7,4),(8,4),(9,4),(10,4),
    ]
    outline_bottom = [
        (5,11),(6,11),(7,11),(8,11),(9,11),(10,11),
    ]
    outline_left = [(4,5),(4,6),(4,7),(3,5),(3,6),(3,7),(3,8),(3,9),(3,10),(4,8),(4,9),(4,10)]
    outline_right = [(11,5),(11,6),(11,7),(12,5),(12,6),(12,7),(12,8),(12,9),(12,10),(11,8),(11,9),(11,10)]
    
    # Fill left half (lavender)
    for y in range(5, 11):
        for x in range(4, 8):
            px(img, x, y, left)
    for x in range(5, 8):
        px(img, x, 4, left)
        px(img, x, 11, left)
    
    # Fill right half (white)
    for y in range(5, 11):
        for x in range(8, 12):
            px(img, x, y, right)
    for x in range(8, 11):
        px(img, x, 4, right)
        px(img, x, 11, right)
    
    # Rounded ends
    px(img, 3, 6, left)
    px(img, 3, 7, left)
    px(img, 3, 8, left)
    px(img, 3, 9, left)
    px(img, 12, 6, right)
    px(img, 12, 7, right)
    px(img, 12, 8, right)
    px(img, 12, 9, right)
    
    # Outline
    draw_pixels(img, [
        (5,3),(6,3),(7,3),(8,3),(9,3),(10,3),
        (4,4),(11,4),
        (3,5),(12,5),
        (2,6),(13,6),
        (2,7),(13,7),
        (2,8),(13,8),
        (2,9),(13,9),
        (3,10),(12,10),
        (4,11),(11,11),
        (5,12),(6,12),(7,12),(8,12),(9,12),(10,12),
    ], left_dark)
    
    # Center dividing line
    for y in range(4, 12):
        px(img, 8, y, left_dark)
    
    # Highlight
    draw_pixels(img, [(5,5),(6,5),(5,6)], (220, 210, 255))
    draw_pixels(img, [(9,5),(10,5)], (240, 240, 245))
    
    save(img, "pill")


def make_powder_scoop():
    """Powder scoop — for Ovasitol."""
    img = new_canvas()
    
    scoop_color = CREAM
    powder = (255, 240, 200)
    outline = PEACH_DARK
    handle = PEACH
    
    # Scoop bowl
    fill_rect(img, 3, 6, 10, 10, scoop_color)
    # Rounded bottom
    draw_pixels(img, [
        (2,6),(11,6),(2,7),(11,7),(2,8),(11,8),(2,9),(11,9),
        (3,11),(4,11),(5,11),(6,11),(7,11),(8,11),(9,11),(10,11),
    ], outline)
    draw_pixels(img, [(2,5),(3,5),(4,5),(5,5),(6,5),(7,5),(8,5),(9,5),(10,5),(11,5)], outline)
    
    # Powder mound on top
    draw_pixels(img, [
        (4,4),(5,4),(6,4),(7,4),(8,4),(9,4),
        (5,3),(6,3),(7,3),(8,3),
        (6,2),(7,2),
    ], powder)
    draw_pixels(img, [
        (3,4),(10,4),
        (4,3),(9,3),
        (5,2),(8,2),
    ], PEACH_DARK)
    
    # Handle (going right)
    fill_rect(img, 11, 7, 14, 8, handle)
    draw_pixels(img, [(11,6),(12,6),(13,6),(14,6),(15,7),(15,8),(11,9),(12,9),(13,9),(14,9)], outline)
    
    save(img, "powder-scoop")


def make_softgel():
    """Fish oil softgel — golden/amber."""
    img = new_canvas()
    
    fill = (255, 200, 100)  # golden amber
    outline = (200, 150, 50)
    highlight = (255, 230, 170)
    
    # Oval softgel shape
    rows = {
        3: range(6, 10),
        4: range(5, 11),
        5: range(4, 12),
        6: range(4, 12),
        7: range(4, 12),
        8: range(4, 12),
        9: range(4, 12),
        10: range(4, 12),
        11: range(5, 11),
        12: range(6, 10),
    }
    for y, xs in rows.items():
        for x in xs:
            px(img, x, y, fill)
    
    # Outline
    draw_pixels(img, [
        (6,2),(7,2),(8,2),(9,2),
        (5,3),(10,3),
        (4,4),(11,4),
        (3,5),(12,5),
        (3,6),(12,6),
        (3,7),(12,7),
        (3,8),(12,8),
        (3,9),(12,9),
        (3,10),(12,10),
        (4,11),(11,11),
        (5,12),(10,12),
        (6,13),(7,13),(8,13),(9,13),
    ], outline)
    
    # Center seam
    for x in range(5, 11):
        px(img, x, 7, outline)
    
    # Highlight
    draw_pixels(img, [(6,4),(7,4),(6,5),(5,5)], highlight)
    
    save(img, "softgel")


def make_gummy():
    """Gummy bear — cute, colorful."""
    img = new_canvas()
    
    fill = SOFT_PINK
    outline = PINK_DARK
    highlight = (255, 210, 230)
    
    # Bear head
    fill_rect(img, 5, 3, 10, 6, fill)
    # Ears
    draw_pixels(img, [(4,2),(5,2),(10,2),(11,2),(4,3),(11,3)], fill)
    draw_pixels(img, [(3,2),(6,1),(9,1),(12,2),(3,3),(12,3)], outline)
    draw_pixels(img, [(4,1),(5,1),(10,1),(11,1)], outline)
    
    # Head outline
    draw_pixels(img, [
        (4,4),(12,4),
        (4,5),(12,5),
        (4,6),(12,6),
        (5,7),(6,7),(7,7),(8,7),(9,7),(10,7),
    ], outline)
    draw_pixels(img, [(4,3),(11,3)], outline)
    
    # Body
    fill_rect(img, 5, 7, 10, 11, fill)
    draw_pixels(img, [
        (4,7),(11,7),
        (4,8),(11,8),
        (4,9),(11,9),
        (4,10),(11,10),
        (4,11),(11,11),
    ], outline)
    
    # Arms
    draw_pixels(img, [(3,8),(3,9),(2,9)], fill)
    draw_pixels(img, [(2,8),(1,9),(2,10),(3,10)], outline)
    draw_pixels(img, [(12,8),(12,9),(13,9)], fill)
    draw_pixels(img, [(13,8),(14,9),(13,10),(12,10)], outline)
    
    # Legs
    draw_pixels(img, [(5,12),(6,12),(9,12),(10,12)], fill)
    draw_pixels(img, [(5,13),(6,13),(9,13),(10,13),(4,12),(7,12),(8,12),(11,12)], outline)
    
    # Face
    px(img, 6, 4, DARK_PURPLE)  # left eye
    px(img, 9, 4, DARK_PURPLE)  # right eye
    px(img, 7, 5, DARK_PURPLE)  # nose
    px(img, 8, 5, DARK_PURPLE)
    
    # Highlight
    draw_pixels(img, [(6,3),(7,3)], highlight)
    
    # Belly highlight
    draw_pixels(img, [(7,9),(8,9)], highlight)
    
    save(img, "gummy")


# ============================================================
# P2 — FOOD/MEAL ICONS
# ============================================================

def make_breakfast():
    """Breakfast — eggs and toast."""
    img = new_canvas()
    
    # Toast
    toast = (230, 200, 140)
    toast_dark = (180, 150, 90)
    fill_rect(img, 1, 5, 7, 12, toast)
    draw_pixels(img, [
        (1,4),(2,4),(3,4),(4,4),(5,4),(6,4),(7,4),
        (0,5),(8,5),(0,6),(8,6),(0,7),(8,7),(0,8),(8,8),
        (0,9),(8,9),(0,10),(8,10),(0,11),(8,11),(0,12),(8,12),
        (1,13),(2,13),(3,13),(4,13),(5,13),(6,13),(7,13),
    ], toast_dark)
    # Crust top (rounded)
    draw_pixels(img, [(2,3),(3,3),(4,3),(5,3),(6,3)], toast_dark)
    draw_pixels(img, [(2,4),(3,4),(4,4),(5,4),(6,4)], toast)
    
    # Fried egg (right side)
    egg_white = WHITE
    egg_yolk = YELLOW
    egg_outline = GRAY_LIGHT
    # White blob
    fill_rect(img, 9, 6, 14, 11, egg_white)
    draw_pixels(img, [
        (10,5),(11,5),(12,5),(13,5),
        (9,6),(14,6),(8,7),(15,7),(8,8),(15,8),
        (8,9),(15,9),(9,10),(14,10),(9,11),(14,11),
        (10,12),(11,12),(12,12),(13,12),
    ], egg_outline)
    # Yolk
    fill_rect(img, 10, 7, 12, 10, egg_yolk)
    draw_pixels(img, [(11,8)], (255, 235, 120))  # yolk highlight
    
    save(img, "breakfast")


def make_lunchbox():
    """Bento-style lunch box."""
    img = new_canvas()
    
    box = SOFT_PINK
    box_dark = PINK_DARK
    
    # Box body
    fill_rect(img, 2, 4, 13, 12, box)
    # Outline
    draw_pixels(img, [
        (2,3),(3,3),(4,3),(5,3),(6,3),(7,3),(8,3),(9,3),(10,3),(11,3),(12,3),(13,3),
        (1,4),(14,4),(1,5),(14,5),(1,6),(14,6),(1,7),(14,7),
        (1,8),(14,8),(1,9),(14,9),(1,10),(14,10),(1,11),(14,11),
        (1,12),(14,12),
        (2,13),(3,13),(4,13),(5,13),(6,13),(7,13),(8,13),(9,13),(10,13),(11,13),(12,13),(13,13),
    ], box_dark)
    
    # Divider line
    for y in range(4, 13):
        px(img, 8, y, box_dark)
    
    # Left compartment: rice ball (white triangle)
    draw_pixels(img, [(5,6),(4,7),(5,7),(6,7),(3,8),(4,8),(5,8),(6,8),(7,8)], WHITE)
    draw_pixels(img, [(5,9),(4,9),(6,9)], (50, 50, 80))  # nori
    
    # Right compartment: small items
    # Cherry tomato
    draw_pixels(img, [(10,6),(11,6),(10,7),(11,7)], ERROR)
    # Broccoli
    draw_pixels(img, [(10,9),(11,9),(12,9),(10,10),(11,10),(12,10)], MINT)
    draw_pixels(img, [(11,11)], MINT_DARK)  # stem
    
    # Lid clasp
    fill_rect(img, 6, 3, 9, 3, PEACH)
    
    save(img, "lunchbox")


def make_dinner():
    """Dinner plate with food."""
    img = new_canvas()
    
    # Large plate
    plate = CREAM
    plate_dark = PEACH_DARK
    
    # Plate circle (larger)
    for y in range(4, 14):
        for x in range(2, 14):
            dist = ((x-7.5)**2 + (y-8.5)**2)**0.5
            if dist < 5.5:
                px(img, x, y, plate)
            elif dist < 6.3:
                px(img, x, y, plate_dark)
    
    # Food on plate - pasta/meat shape
    food_color = PEACH
    draw_pixels(img, [
        (6,6),(7,6),(8,6),(9,6),
        (5,7),(6,7),(7,7),(8,7),(9,7),(10,7),
        (5,8),(6,8),(7,8),(8,8),(9,8),(10,8),
        (6,9),(7,9),(8,9),(9,9),
    ], food_color)
    
    # Garnish
    draw_pixels(img, [(7,6),(8,6)], MINT)
    
    save(img, "dinner")


def make_snack():
    """Snack — cookie/fruit."""
    img = new_canvas()
    
    # Cookie
    cookie = (220, 185, 130)
    cookie_dark = (170, 135, 80)
    chips = (120, 70, 30)
    
    # Round cookie
    rows = {
        4: range(5, 11),
        5: range(4, 12),
        6: range(3, 13),
        7: range(3, 13),
        8: range(3, 13),
        9: range(3, 13),
        10: range(4, 12),
        11: range(5, 11),
    }
    for y, xs in rows.items():
        for x in xs:
            px(img, x, y, cookie)
    
    # Outline
    draw_pixels(img, [
        (5,3),(6,3),(7,3),(8,3),(9,3),(10,3),
        (4,4),(11,4),
        (3,5),(12,5),
        (2,6),(13,6),
        (2,7),(13,7),
        (2,8),(13,8),
        (2,9),(13,9),
        (3,10),(12,10),
        (4,11),(11,11),
        (5,12),(6,12),(7,12),(8,12),(9,12),(10,12),
    ], cookie_dark)
    
    # Chocolate chips
    draw_pixels(img, [(5,5),(8,6),(6,8),(10,7),(7,10),(9,9)], chips)
    
    # Highlight
    draw_pixels(img, [(6,5),(7,5)], (240, 210, 160))
    
    save(img, "snack")


def make_camera():
    """Camera icon — for photo upload."""
    img = new_canvas()
    
    fill = LAVENDER
    outline = LAVENDER_DARK
    lens = BABY_BLUE
    
    # Camera body
    fill_rect(img, 2, 5, 13, 12, fill)
    # Outline
    draw_pixels(img, [
        (2,4),(3,4),(4,4),(5,4),(6,4),(7,4),(8,4),(9,4),(10,4),(11,4),(12,4),(13,4),
        (1,5),(14,5),(1,6),(14,6),(1,7),(14,7),(1,8),(14,8),
        (1,9),(14,9),(1,10),(14,10),(1,11),(14,11),(1,12),(14,12),
        (2,13),(3,13),(4,13),(5,13),(6,13),(7,13),(8,13),(9,13),(10,13),(11,13),(12,13),(13,13),
    ], outline)
    
    # Viewfinder bump
    fill_rect(img, 5, 2, 8, 4, fill)
    draw_pixels(img, [(5,2),(6,2),(7,2),(8,2),(4,3),(9,3),(4,4),(9,4)], outline)
    draw_pixels(img, [(5,3),(6,3),(7,3),(8,3)], fill)
    
    # Lens (circle)
    draw_pixels(img, [
        (7,6),(8,6),
        (6,7),(9,7),
        (6,8),(9,8),
        (6,9),(9,9),
        (6,10),(9,10),
        (7,11),(8,11),
    ], outline)
    # Lens fill
    draw_pixels(img, [(7,7),(8,7),(7,8),(8,8),(7,9),(8,9),(7,10),(8,10)], lens)
    # Lens highlight
    px(img, 7, 7, (180, 220, 255))
    
    # Flash
    px(img, 11, 6, YELLOW)
    px(img, 12, 6, YELLOW)
    
    save(img, "camera")


# ============================================================
# P3 — UI ELEMENTS
# ============================================================

def make_gear():
    """Settings gear."""
    img = new_canvas()
    
    fill = GRAY_LIGHT
    outline = GRAY
    
    # Gear teeth (8 teeth around a circle)
    teeth = [
        (7,1),(8,1),
        (7,2),(8,2),
        (12,4),(13,4),
        (12,5),(13,5),
        (13,7),(14,7),(13,8),(14,8),
        (12,10),(13,10),(12,11),(13,11),
        (7,13),(8,13),(7,14),(8,14),
        (2,10),(3,10),(2,11),(3,11),
        (1,7),(2,7),(1,8),(2,8),
        (2,4),(3,4),(2,5),(3,5),
    ]
    draw_pixels(img, teeth, fill)
    
    # Main body circle
    for y in range(3, 13):
        for x in range(3, 13):
            dist = ((x-7.5)**2 + (y-7.5)**2)**0.5
            if dist < 4.5:
                px(img, x, y, fill)
    
    # Center hole
    for y in range(5, 11):
        for x in range(5, 11):
            dist = ((x-7.5)**2 + (y-7.5)**2)**0.5
            if dist < 2.2:
                px(img, x, y, TRANSPARENT)
            elif dist < 3:
                px(img, x, y, outline)
    
    # Outer outline hint
    for y in range(3, 13):
        for x in range(3, 13):
            dist = ((x-7.5)**2 + (y-7.5)**2)**0.5
            if 4.0 < dist < 4.8:
                px(img, x, y, outline)
    
    save(img, "gear")


def make_calendar():
    """Calendar page icon."""
    img = new_canvas()
    
    page = WHITE
    outline = PURPLE_DARK
    header = PURPLE
    
    # Calendar body
    fill_rect(img, 3, 4, 12, 13, page)
    
    # Header bar
    fill_rect(img, 3, 4, 12, 6, header)
    
    # Outline
    draw_pixels(img, [
        (3,3),(4,3),(5,3),(6,3),(7,3),(8,3),(9,3),(10,3),(11,3),(12,3),
        (2,4),(13,4),(2,5),(13,5),(2,6),(13,6),(2,7),(13,7),
        (2,8),(13,8),(2,9),(13,9),(2,10),(13,10),(2,11),(13,11),
        (2,12),(13,12),(2,13),(13,13),
        (3,14),(4,14),(5,14),(6,14),(7,14),(8,14),(9,14),(10,14),(11,14),(12,14),
    ], outline)
    
    # Rings
    draw_pixels(img, [(5,2),(5,3),(5,4),(10,2),(10,3),(10,4)], outline)
    
    # Date dots (grid pattern)
    for y in [8, 10, 12]:
        for x in [4, 6, 8, 10, 12]:
            px(img, x, y, LAVENDER)
    
    # Today highlight
    fill_rect(img, 7, 9, 9, 11, SOFT_PINK)
    
    save(img, "calendar")


def make_star():
    """Star — for streaks."""
    img = new_canvas()
    
    fill = YELLOW
    outline = YELLOW_DARK
    highlight = (255, 240, 150)
    
    # 5-pointed star
    star_pixels = [
        (7,1),(8,1),
        (7,2),(8,2),
        (6,3),(7,3),(8,3),(9,3),
        (5,4),(6,4),(7,4),(8,4),(9,4),(10,4),
        (1,5),(2,5),(3,5),(4,5),(5,5),(6,5),(7,5),(8,5),(9,5),(10,5),(11,5),(12,5),(13,5),(14,5),
        (2,6),(3,6),(4,6),(5,6),(6,6),(7,6),(8,6),(9,6),(10,6),(11,6),(12,6),(13,6),
        (3,7),(4,7),(5,7),(6,7),(7,7),(8,7),(9,7),(10,7),(11,7),(12,7),
        (4,8),(5,8),(6,8),(7,8),(8,8),(9,8),(10,8),(11,8),
        (4,9),(5,9),(6,9),(7,9),(8,9),(9,9),(10,9),(11,9),
        (3,10),(4,10),(5,10),(10,10),(11,10),(12,10),
        (2,11),(3,11),(4,11),(11,11),(12,11),(13,11),
        (1,12),(2,12),(3,12),(12,12),(13,12),(14,12),
        (1,13),(2,13),(13,13),(14,13),
    ]
    draw_pixels(img, star_pixels, fill)
    
    # Outline (simplified - outer edges)
    draw_pixels(img, [
        (7,0),(8,0),
        (6,1),(9,1),
        (5,3),(10,3),
        (0,5),(15,5),
        (1,6),(14,6),
        (2,7),(13,7),
        (3,8),(12,8),
        (3,9),(12,9),
        (2,10),(6,10),(7,10),(8,10),(9,10),(13,10),
        (1,11),(5,11),(10,11),(14,11),
        (0,12),(4,12),(11,12),(15,12),
        (0,13),(3,13),(12,13),(15,13),
    ], outline)
    
    # Inner highlight
    draw_pixels(img, [(7,3),(7,4),(6,5),(7,5)], highlight)
    
    save(img, "star")


def make_trophy():
    """Trophy — achievement."""
    img = new_canvas()
    
    cup = YELLOW
    cup_dark = YELLOW_DARK
    
    # Cup body
    fill_rect(img, 4, 2, 11, 8, cup)
    
    # Cup outline
    draw_pixels(img, [
        (4,1),(5,1),(6,1),(7,1),(8,1),(9,1),(10,1),(11,1),
        (3,2),(12,2),(3,3),(12,3),(3,4),(12,4),
        (3,5),(12,5),(3,6),(12,6),
        (4,7),(12,7),
        (5,8),(11,8),
        (6,9),(10,9),
    ], cup_dark)
    
    # Handles
    draw_pixels(img, [(2,3),(1,4),(1,5),(1,6),(2,7)], cup)
    draw_pixels(img, [(1,3),(0,4),(0,5),(0,6),(1,7),(2,8)], cup_dark)
    draw_pixels(img, [(13,3),(14,4),(14,5),(14,6),(13,7)], cup)
    draw_pixels(img, [(14,3),(15,4),(15,5),(15,6),(14,7),(13,8)], cup_dark)
    
    # Stem
    fill_rect(img, 7, 9, 8, 11, cup)
    draw_pixels(img, [(6,9),(9,9),(6,10),(9,10),(6,11),(9,11)], cup_dark)
    
    # Base
    fill_rect(img, 5, 12, 10, 13, cup)
    draw_pixels(img, [(4,12),(11,12),(4,13),(11,13),(5,14),(6,14),(7,14),(8,14),(9,14),(10,14)], cup_dark)
    
    # Star on cup
    draw_pixels(img, [(7,4),(8,4),(6,5),(7,5),(8,5),(9,5),(7,6),(8,6)], (255, 240, 150))
    
    # Highlight
    draw_pixels(img, [(5,3),(5,4)], (255, 235, 130))
    
    save(img, "trophy")


def make_ring():
    """Ring — Oura ring icon."""
    img = new_canvas()
    
    ring = SOFT_PURPLE
    outline = PURPLE_DARK
    shine = WHITE
    
    # Ring circle (tilted slightly for 3D feel)
    ring_outline = [
        (5,2),(6,2),(7,2),(8,2),(9,2),(10,2),
        (4,3),(11,3),
        (3,4),(12,4),
        (3,5),(12,5),
        (3,6),(12,6),
        (3,7),(12,7),
        (3,8),(12,8),
        (3,9),(12,9),
        (4,10),(11,10),
        (5,11),(6,11),(7,11),(8,11),(9,11),(10,11),
    ]
    draw_pixels(img, ring_outline, outline)
    
    # Ring band (thick outline = the ring itself)
    ring_inner_outline = [
        (6,4),(7,4),(8,4),(9,4),
        (5,5),(10,5),
        (5,6),(10,6),
        (5,7),(10,7),
        (5,8),(10,8),
        (6,9),(7,9),(8,9),(9,9),
    ]
    draw_pixels(img, ring_inner_outline, outline)
    
    # Ring fill (between outlines)
    ring_fill_px = [
        (5,3),(6,3),(7,3),(8,3),(9,3),(10,3),
        (4,4),(5,4),(10,4),(11,4),
        (4,5),(11,5),
        (4,6),(11,6),
        (4,7),(11,7),
        (4,8),(11,8),
        (4,9),(5,9),(10,9),(11,9),
        (5,10),(6,10),(7,10),(8,10),(9,10),(10,10),
    ]
    draw_pixels(img, ring_fill_px, ring)
    
    # Inner transparent hole
    for y in range(5, 9):
        for x in range(6, 10):
            px(img, x, y, TRANSPARENT)
    px(img, 7, 4, TRANSPARENT)
    px(img, 8, 4, TRANSPARENT)
    px(img, 7, 9, TRANSPARENT)
    px(img, 8, 9, TRANSPARENT)
    
    # Shine
    draw_pixels(img, [(5,3),(6,3)], shine)
    
    save(img, "ring")


# ============================================================
# ADDITIONAL ICONS (from ICON-INVENTORY.md)
# ============================================================

def make_sun():
    """Sun — morning supplements."""
    img = new_canvas()
    
    fill = YELLOW
    outline = YELLOW_DARK
    
    # Sun circle
    for y in range(5, 11):
        for x in range(5, 11):
            dist = ((x-7.5)**2 + (y-7.5)**2)**0.5
            if dist < 3:
                px(img, x, y, fill)
            elif dist < 3.5:
                px(img, x, y, outline)
    
    # Rays
    rays = [
        (7,1),(8,1),(7,2),(8,2),  # top
        (7,13),(8,13),(7,14),(8,14),  # bottom
        (1,7),(2,7),(1,8),(2,8),  # left
        (13,7),(14,7),(13,8),(14,8),  # right
        (3,3),(4,4),  # top-left
        (11,3),(12,4),  # top-right  
        (3,12),(4,11),  # bottom-left
        (11,12),(12,11),  # bottom-right
    ]
    draw_pixels(img, rays, fill)
    
    # Highlight
    draw_pixels(img, [(6,6),(7,6)], (255, 240, 150))
    
    save(img, "sun")


def make_moon():
    """Moon — evening supplements."""
    img = new_canvas()
    
    fill = CREAM
    outline = YELLOW_DARK
    
    # Crescent moon
    moon_pixels = [
        (6,1),(7,1),(8,1),(9,1),
        (5,2),(10,2),
        (4,3),(11,3),
        (3,4),(10,4),
        (3,5),(9,5),
        (3,6),(9,6),
        (3,7),(9,7),
        (3,8),(9,8),
        (3,9),(10,9),
        (4,10),(10,10),
        (4,11),(11,11),
        (5,12),(10,12),
        (6,13),(7,13),(8,13),(9,13),
    ]
    
    # Fill crescent
    for y in range(2, 13):
        for x in range(4, 11):
            dist_outer = ((x-7)**2 + (y-7)**2)**0.5
            dist_inner = ((x-9)**2 + (y-6)**2)**0.5
            if dist_outer < 6 and dist_inner > 4.5:
                px(img, x, y, fill)
    
    # Outline
    draw_pixels(img, moon_pixels, outline)
    
    # Stars nearby
    px(img, 12, 3, YELLOW)
    px(img, 13, 6, YELLOW)
    px(img, 11, 10, YELLOW)
    
    save(img, "moon")


def make_notepad():
    """Notepad — daily check-in."""
    img = new_canvas()
    
    page = WHITE
    outline = PURPLE_DARK
    
    # Page body
    fill_rect(img, 4, 2, 13, 13, page)
    
    # Outline
    draw_pixels(img, [
        (4,1),(5,1),(6,1),(7,1),(8,1),(9,1),(10,1),(11,1),(12,1),(13,1),
        (3,2),(14,2),(3,3),(14,3),(3,4),(14,4),(3,5),(14,5),
        (3,6),(14,6),(3,7),(14,7),(3,8),(14,8),(3,9),(14,9),
        (3,10),(14,10),(3,11),(14,11),(3,12),(14,12),(3,13),(14,13),
        (4,14),(5,14),(6,14),(7,14),(8,14),(9,14),(10,14),(11,14),(12,14),(13,14),
    ], outline)
    
    # Spiral binding (left side)
    for y in range(3, 13, 2):
        px(img, 3, y, LAVENDER)
        px(img, 2, y, LAVENDER_DARK)
    
    # Lines
    for y in [5, 7, 9, 11]:
        for x in range(6, 12):
            px(img, x, y, LAVENDER)
    
    # Pencil (top-right corner)
    draw_pixels(img, [(11,0),(12,1),(13,2)], PEACH)
    px(img, 10, 0, PEACH_DARK)
    
    save(img, "notepad")


def make_flame():
    """Flame — nutrition/calories."""
    img = new_canvas()
    
    outer = ORANGE
    inner = YELLOW
    outline = ORANGE_DARK
    
    # Flame shape
    flame_outer = [
        (7,1),(8,1),
        (6,2),(7,2),(8,2),(9,2),
        (6,3),(7,3),(8,3),(9,3),
        (5,4),(6,4),(7,4),(8,4),(9,4),(10,4),
        (5,5),(6,5),(7,5),(8,5),(9,5),(10,5),
        (4,6),(5,6),(6,6),(7,6),(8,6),(9,6),(10,6),(11,6),
        (4,7),(5,7),(6,7),(7,7),(8,7),(9,7),(10,7),(11,7),
        (3,8),(4,8),(5,8),(6,8),(7,8),(8,8),(9,8),(10,8),(11,8),(12,8),
        (3,9),(4,9),(5,9),(6,9),(7,9),(8,9),(9,9),(10,9),(11,9),(12,9),
        (4,10),(5,10),(6,10),(7,10),(8,10),(9,10),(10,10),(11,10),
        (4,11),(5,11),(6,11),(7,11),(8,11),(9,11),(10,11),(11,11),
        (5,12),(6,12),(7,12),(8,12),(9,12),(10,12),
        (6,13),(7,13),(8,13),(9,13),
    ]
    draw_pixels(img, flame_outer, outer)
    
    # Inner flame (yellow)
    inner_pixels = [
        (7,5),(8,5),
        (7,6),(8,6),
        (6,7),(7,7),(8,7),(9,7),
        (6,8),(7,8),(8,8),(9,8),
        (6,9),(7,9),(8,9),(9,9),
        (7,10),(8,10),
        (7,11),(8,11),
    ]
    draw_pixels(img, inner_pixels, inner)
    
    # Outline
    draw_pixels(img, [
        (7,0),(8,0),
        (5,2),(10,2),
        (4,4),(11,4),
        (3,6),(12,6),
        (2,8),(13,8),
        (3,10),(12,10),
        (4,12),(11,12),
        (5,13),(10,13),
        (6,14),(9,14),
    ], outline)
    
    save(img, "flame")


def make_blood_drop():
    """Blood drop — period tracker."""
    img = new_canvas()
    
    fill = ERROR
    outline = RED_DARK
    highlight = (255, 170, 170)
    
    # Teardrop shape
    drop = [
        (7,2),(8,2),
        (6,3),(7,3),(8,3),(9,3),
        (5,4),(6,4),(7,4),(8,4),(9,4),(10,4),
        (5,5),(6,5),(7,5),(8,5),(9,5),(10,5),
        (4,6),(5,6),(6,6),(7,6),(8,6),(9,6),(10,6),(11,6),
        (4,7),(5,7),(6,7),(7,7),(8,7),(9,7),(10,7),(11,7),
        (4,8),(5,8),(6,8),(7,8),(8,8),(9,8),(10,8),(11,8),
        (4,9),(5,9),(6,9),(7,9),(8,9),(9,9),(10,9),(11,9),
        (5,10),(6,10),(7,10),(8,10),(9,10),(10,10),
        (5,11),(6,11),(7,11),(8,11),(9,11),(10,11),
        (6,12),(7,12),(8,12),(9,12),
    ]
    draw_pixels(img, drop, fill)
    
    # Point at top
    px(img, 7, 1, fill)
    px(img, 8, 1, fill)
    
    # Outline
    draw_pixels(img, [
        (7,0),(8,0),
        (6,1),(9,1),
        (5,2),(10,2),
        (4,3),(11,3),
        (3,5),(12,5),
        (3,6),(12,6),
        (3,7),(12,7),
        (3,8),(12,8),
        (3,9),(12,9),
        (4,10),(11,10),
        (4,11),(11,11),
        (5,12),(10,12),
        (6,13),(7,13),(8,13),(9,13),
    ], outline)
    
    # Highlight
    draw_pixels(img, [(6,5),(6,6),(5,7)], highlight)
    
    save(img, "blood-drop")


def make_scale():
    """Balance scale — weight trends."""
    img = new_canvas()
    
    fill = BABY_BLUE
    outline = BLUE_DARK
    
    # Center pillar
    fill_rect(img, 7, 3, 8, 11, fill)
    draw_pixels(img, [(6,3),(9,3),(6,11),(9,11)], outline)
    
    # Top beam
    fill_rect(img, 2, 3, 13, 4, fill)
    draw_pixels(img, [
        (2,2),(3,2),(4,2),(5,2),(6,2),(7,2),(8,2),(9,2),(10,2),(11,2),(12,2),(13,2),
        (1,3),(14,3),(1,4),(14,4),
    ], outline)
    
    # Left pan
    fill_rect(img, 1, 8, 5, 9, fill)
    draw_pixels(img, [(0,8),(6,8),(0,9),(6,9),(1,10),(2,10),(3,10),(4,10),(5,10)], outline)
    # Left string
    px(img, 3, 5, outline)
    px(img, 3, 6, outline)
    px(img, 3, 7, outline)
    
    # Right pan
    fill_rect(img, 10, 8, 14, 9, fill)
    draw_pixels(img, [(9,8),(15,8),(9,9),(15,9),(10,10),(11,10),(12,10),(13,10),(14,10)], outline)
    # Right string
    px(img, 12, 5, outline)
    px(img, 12, 6, outline)
    px(img, 12, 7, outline)
    
    # Base
    fill_rect(img, 5, 12, 10, 13, fill)
    draw_pixels(img, [(4,12),(11,12),(4,13),(11,13),(5,14),(6,14),(7,14),(8,14),(9,14),(10,14)], outline)
    
    # Triangle top
    draw_pixels(img, [(7,1),(8,1)], fill)
    draw_pixels(img, [(6,1),(9,1),(7,0),(8,0)], outline)
    
    save(img, "scale")


def make_warning():
    """Warning triangle — triggers."""
    img = new_canvas()
    
    fill = YELLOW
    outline = ORANGE_DARK
    
    # Triangle shape
    rows = {
        2: [7, 8],
        3: [6, 7, 8, 9],
        4: [5, 6, 7, 8, 9, 10],
        5: [5, 6, 7, 8, 9, 10],
        6: [4, 5, 6, 7, 8, 9, 10, 11],
        7: [4, 5, 6, 7, 8, 9, 10, 11],
        8: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        9: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        10: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
        11: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
        12: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    }
    for y, xs in rows.items():
        for x in xs:
            px(img, x, y, fill)
    
    # Outline
    draw_pixels(img, [
        (7,1),(8,1),
        (6,2),(9,2),
        (5,3),(10,3),
        (4,4),(11,4),
        (4,5),(11,5),
        (3,6),(12,6),
        (3,7),(12,7),
        (2,8),(13,8),
        (2,9),(13,9),
        (1,10),(14,10),
        (1,11),(14,11),
        (0,12),(15,12),
        (1,13),(2,13),(3,13),(4,13),(5,13),(6,13),(7,13),(8,13),(9,13),(10,13),(11,13),(12,13),(13,13),(14,13),
    ], outline)
    
    # Exclamation mark
    draw_pixels(img, [(7,5),(8,5),(7,6),(8,6),(7,7),(8,7),(7,8),(8,8)], DARK_PURPLE)
    draw_pixels(img, [(7,10),(8,10),(7,11),(8,11)], DARK_PURPLE)
    
    save(img, "warning")


def make_lightning():
    """Lightning bolt — energy/adrenal."""
    img = new_canvas()
    
    fill = YELLOW
    outline = YELLOW_DARK
    
    bolt = [
        (8,0),(9,0),
        (7,1),(8,1),(9,1),
        (6,2),(7,2),(8,2),
        (5,3),(6,3),(7,3),
        (4,4),(5,4),(6,4),(7,4),(8,4),(9,4),(10,4),
        (7,5),(8,5),(9,5),
        (6,6),(7,6),(8,6),
        (5,7),(6,7),(7,7),
        (4,8),(5,8),(6,8),
        (5,9),(6,9),
        (6,10),(7,10),
        (7,11),
    ]
    draw_pixels(img, bolt, fill)
    
    # Outline
    draw_pixels(img, [
        (8,0),(10,0),(9,0),  # top
        (6,1),(10,1),
        (5,2),(9,2),
        (4,3),(8,3),
        (3,4),(11,4),
        (6,5),(10,5),
        (5,6),(9,6),
        (4,7),(8,7),
        (3,8),(7,8),
        (4,9),(7,9),
        (5,10),(8,10),
        (6,11),(8,11),
        (7,12),
    ], outline)
    
    save(img, "lightning")


def make_flexed_arm():
    """Flexed arm — protein goal."""
    img = new_canvas()
    
    skin = PEACH
    outline = PEACH_DARK
    
    # Arm shape
    arm = [
        (9,2),(10,2),(11,2),
        (8,3),(9,3),(10,3),(11,3),(12,3),
        (7,4),(8,4),(9,4),(10,4),(11,4),(12,4),
        (6,5),(7,5),(8,5),
        (5,6),(6,6),(7,6),
        (4,7),(5,7),(6,7),
        (3,8),(4,8),(5,8),(6,8),
        (3,9),(4,9),(5,9),(6,9),(7,9),
        (4,10),(5,10),(6,10),(7,10),(8,10),
        (5,11),(6,11),(7,11),(8,11),
        (6,12),(7,12),(8,12),
    ]
    draw_pixels(img, arm, skin)
    
    # Bicep bump
    draw_pixels(img, [(12,4),(13,4),(12,5),(13,5),(12,6)], skin)
    
    # Outline
    draw_pixels(img, [
        (9,1),(10,1),(11,1),
        (8,2),(12,2),
        (7,3),(13,3),
        (6,4),(13,4),(14,4),
        (5,5),(9,5),(13,5),(14,5),
        (4,6),(8,6),(13,6),
        (3,7),(7,7),(12,7),
        (2,8),(7,8),
        (2,9),(8,9),
        (3,10),(9,10),
        (4,11),(9,11),
        (5,12),(9,12),
        (6,13),(7,13),(8,13),
    ], outline)
    
    save(img, "flexed-arm")


def make_sparkle():
    """Sparkle/star cluster — magic link."""
    img = new_canvas()
    
    fill = YELLOW
    small = SOFT_PINK
    
    # Main 4-point star
    draw_pixels(img, [
        (7,1),(8,1),
        (7,2),(8,2),
        (6,3),(7,3),(8,3),(9,3),
        (4,4),(5,4),(6,4),(7,4),(8,4),(9,4),(10,4),(11,4),
        (4,5),(5,5),(6,5),(7,5),(8,5),(9,5),(10,5),(11,5),
        (6,6),(7,6),(8,6),(9,6),
        (7,7),(8,7),
        (7,8),(8,8),
    ], fill)
    
    # Smaller sparkles
    px(img, 3, 2, small)
    px(img, 12, 1, small)
    px(img, 2, 9, small)
    px(img, 13, 8, small)
    
    # Dots
    px(img, 4, 10, LAVENDER)
    px(img, 11, 10, LAVENDER)
    px(img, 1, 5, LAVENDER)
    px(img, 14, 4, LAVENDER)
    
    save(img, "sparkle")


def make_envelope():
    """Envelope with heart — email sent."""
    img = new_canvas()
    
    fill = WHITE
    outline = PURPLE_DARK
    
    # Envelope body
    fill_rect(img, 2, 5, 13, 12, fill)
    
    # Outline
    draw_pixels(img, [
        (2,4),(3,4),(4,4),(5,4),(6,4),(7,4),(8,4),(9,4),(10,4),(11,4),(12,4),(13,4),
        (1,5),(14,5),(1,6),(14,6),(1,7),(14,7),(1,8),(14,8),
        (1,9),(14,9),(1,10),(14,10),(1,11),(14,11),(1,12),(14,12),
        (2,13),(3,13),(4,13),(5,13),(6,13),(7,13),(8,13),(9,13),(10,13),(11,13),(12,13),(13,13),
    ], outline)
    
    # Flap (V shape)
    draw_pixels(img, [
        (2,5),(3,6),(4,7),(5,8),(6,9),(7,10),
        (13,5),(12,6),(11,7),(10,8),(9,9),(8,10),
    ], outline)
    
    # Heart on envelope
    heart_px = [
        (6,6),(7,6),(9,6),(10,6),
        (6,7),(7,7),(8,7),(9,7),(10,7),
        (7,8),(8,8),(9,8),
        (8,9),
    ]
    draw_pixels(img, heart_px, SOFT_PINK)
    
    save(img, "envelope")


def make_info():
    """Info circle — tips."""
    img = new_canvas()
    
    fill = BABY_BLUE
    outline = BLUE_DARK
    
    # Circle
    for y in range(2, 14):
        for x in range(2, 14):
            dist = ((x-7.5)**2 + (y-7.5)**2)**0.5
            if dist < 5.5:
                px(img, x, y, fill)
            elif dist < 6.3:
                px(img, x, y, outline)
    
    # "i" letter
    draw_pixels(img, [(7,4),(8,4)], WHITE)  # dot
    draw_pixels(img, [(7,6),(8,6),(7,7),(8,7),(7,8),(8,8),(7,9),(8,9),(7,10),(8,10)], WHITE)  # stem
    
    save(img, "info")


def make_hourglass():
    """Hourglass — pending/waiting."""
    img = new_canvas()
    
    glass = CREAM
    frame = PURPLE_DARK
    sand = PEACH
    
    # Top and bottom frames
    fill_rect(img, 3, 1, 12, 2, LAVENDER)
    fill_rect(img, 3, 13, 12, 14, LAVENDER)
    draw_pixels(img, [
        (2,1),(13,1),(2,2),(13,2),
        (2,13),(13,13),(2,14),(13,14),
    ], frame)
    
    # Glass shape (top half)
    for y in range(3, 8):
        width = 5 - (y - 3)
        cx = 7
        for x in range(cx - width, cx + width + 2):
            if 3 <= x <= 12:
                px(img, x, y, glass)
    
    # Glass shape (bottom half)
    for y in range(8, 13):
        width = y - 8
        cx = 7
        for x in range(cx - width, cx + width + 2):
            if 3 <= x <= 12:
                px(img, x, y, glass)
    
    # Sand in bottom
    for y in range(10, 13):
        width = y - 8
        cx = 7
        for x in range(cx - width, cx + width + 2):
            if 3 <= x <= 12:
                px(img, x, y, sand)
    
    # Falling sand grain
    px(img, 7, 7, sand)
    px(img, 8, 8, sand)
    
    # Outline sides
    draw_pixels(img, [
        (3,3),(12,3),(3,4),(11,4),(4,5),(10,5),
        (5,6),(9,6),(6,7),(8,7),(7,7),
        (6,8),(8,8),
        (5,9),(9,9),(4,10),(10,10),
        (3,11),(11,11),(3,12),(12,12),
    ], frame)
    
    save(img, "hourglass")


def make_lightbulb():
    """Lightbulb — AI insights."""
    img = new_canvas()
    
    fill = YELLOW
    outline = YELLOW_DARK
    
    # Bulb
    bulb_rows = {
        2: range(6, 10),
        3: range(5, 11),
        4: range(4, 12),
        5: range(4, 12),
        6: range(4, 12),
        7: range(4, 12),
        8: range(5, 11),
        9: range(5, 11),
    }
    for y, xs in bulb_rows.items():
        for x in xs:
            px(img, x, y, fill)
    
    # Outline
    draw_pixels(img, [
        (6,1),(7,1),(8,1),(9,1),
        (5,2),(10,2),
        (4,3),(11,3),
        (3,4),(12,4),
        (3,5),(12,5),
        (3,6),(12,6),
        (3,7),(12,7),
        (4,8),(11,8),
        (4,9),(11,9),
    ], outline)
    
    # Base/screw
    fill_rect(img, 6, 10, 9, 10, GRAY_LIGHT)
    fill_rect(img, 5, 11, 10, 11, GRAY)
    fill_rect(img, 6, 12, 9, 12, GRAY_LIGHT)
    fill_rect(img, 5, 13, 10, 13, GRAY)
    
    # Highlight
    draw_pixels(img, [(6,3),(6,4),(5,5)], (255, 240, 180))
    
    # Glow rays
    px(img, 7, 0, (255, 240, 150, 150))
    px(img, 2, 3, (255, 240, 150, 150))
    px(img, 13, 3, (255, 240, 150, 150))
    
    save(img, "lightbulb")


def make_party():
    """Party popper — celebration."""
    img = new_canvas()
    
    popper = PURPLE
    outline = PURPLE_DARK
    
    # Popper cone (bottom-left to upper area)
    cone = [
        (2,12),(3,12),(2,13),(3,13),
        (3,11),(4,11),
        (4,10),(5,10),
        (5,9),(6,9),
        (6,8),(7,8),
    ]
    draw_pixels(img, cone, popper)
    draw_pixels(img, [(1,12),(1,13),(2,14),(3,14),(4,12),(4,13)], outline)
    
    # Confetti
    confetti_colors = [SOFT_PINK, MINT, YELLOW, BABY_BLUE, LAVENDER, PEACH]
    confetti_positions = [
        (8,2), (10,3), (12,1), (7,4), (11,5),
        (9,6), (13,4), (6,3), (10,7), (14,2),
        (5,5), (8,1), (12,6), (4,7),
    ]
    for i, pos in enumerate(confetti_positions):
        draw_pixels(img, [pos], confetti_colors[i % len(confetti_colors)])
    
    # Streamers
    draw_pixels(img, [(7,5),(8,4),(9,3)], SOFT_PINK)
    draw_pixels(img, [(8,6),(9,5),(10,4)], MINT)
    draw_pixels(img, [(9,7),(10,6),(11,5)], YELLOW)
    
    save(img, "party")


# ============================================================
# MOOD FACES (5 levels)
# ============================================================

def make_mood_face(level, name):
    """Create mood face. Level 1=crying, 5=happy."""
    img = new_canvas()
    
    # Face colors by mood
    colors = {
        1: (BABY_BLUE, BLUE_DARK),      # sad - blue
        2: (LAVENDER, LAVENDER_DARK),    # meh - lavender
        3: (CREAM, PEACH_DARK),          # neutral - cream
        4: (SOFT_PINK, PINK_DARK),       # good - pink
        5: (MINT, MINT_DARK),            # great - mint
    }
    fill, outline = colors[level]
    
    # Circle face
    for y in range(2, 14):
        for x in range(2, 14):
            dist = ((x-7.5)**2 + (y-7.5)**2)**0.5
            if dist < 5.5:
                px(img, x, y, fill)
            elif dist < 6.3:
                px(img, x, y, outline)
    
    # Eyes
    eye_color = DARK_PURPLE
    px(img, 5, 6, eye_color)
    px(img, 10, 6, eye_color)
    
    if level == 1:  # Crying - tears
        px(img, 5, 7, BABY_BLUE)
        px(img, 10, 7, BABY_BLUE)
        # Sad mouth
        draw_pixels(img, [(6,10),(7,11),(8,11),(9,10)], outline)
    elif level == 2:  # Worried
        draw_pixels(img, [(6,10),(7,11),(8,11),(9,10)], outline)
    elif level == 3:  # Neutral
        draw_pixels(img, [(6,10),(7,10),(8,10),(9,10)], outline)
    elif level == 4:  # Happy
        draw_pixels(img, [(6,10),(7,11),(8,11),(9,10)], outline)
        # Flip the mouth up
        draw_pixels(img, [(6,11),(9,11)], fill)  # erase corners
        draw_pixels(img, [(6,10),(9,10)], outline)
        draw_pixels(img, [(7,11),(8,11)], outline)
    elif level == 5:  # Very happy - open smile
        draw_pixels(img, [(6,9),(9,9)], outline)
        draw_pixels(img, [(6,10),(7,10),(8,10),(9,10)], outline)
        draw_pixels(img, [(7,11),(8,11)], outline)
        # Blush
        draw_pixels(img, [(3,8),(4,8)], (255, 200, 200, 120))
        draw_pixels(img, [(11,8),(12,8)], (255, 200, 200, 120))
    
    save(img, name)


# ============================================================
# ENERGY ICONS (5 levels)
# ============================================================

def make_energy_icon(level, name):
    """Create energy icon. Level 1=empty, 5=full."""
    img = new_canvas()
    
    outline = PURPLE_DARK
    
    # Battery shape
    # Body
    fill_rect(img, 3, 4, 12, 12, WHITE)
    draw_pixels(img, [
        (3,3),(4,3),(5,3),(6,3),(7,3),(8,3),(9,3),(10,3),(11,3),(12,3),
        (2,4),(13,4),(2,5),(13,5),(2,6),(13,6),(2,7),(13,7),
        (2,8),(13,8),(2,9),(13,9),(2,10),(13,10),(2,11),(13,11),
        (2,12),(13,12),
        (3,13),(4,13),(5,13),(6,13),(7,13),(8,13),(9,13),(10,13),(11,13),(12,13),
    ], outline)
    
    # Battery tip
    fill_rect(img, 6, 2, 9, 3, outline)
    
    # Fill level (bottom to top)
    fill_colors = {
        1: ERROR,
        2: WARNING,
        3: YELLOW,
        4: MINT,
        5: SUCCESS,
    }
    fill_color = fill_colors[level]
    
    # Each level fills one section from bottom
    fill_rows = {
        1: range(11, 13),
        2: range(9, 13),
        3: range(7, 13),
        4: range(5, 13),
        5: range(4, 13),
    }
    for y in fill_rows[level]:
        for x in range(3, 13):
            px(img, x, y, fill_color)
    
    # Lightning bolt on level 5
    if level == 5:
        bolt = [(7,5),(6,6),(7,6),(8,6),(5,7),(6,7),(7,7),(8,7),(9,7),(7,8),(8,8),(8,9),(9,10)]
        draw_pixels(img, bolt, YELLOW)
    
    save(img, name)


# ============================================================
# GENERATE ALL ICONS
# ============================================================

print("Generating Healthy Me pixel art icons...")
print()

print("P0 — Tab Bar Icons:")
make_heart()
make_plate()
make_dumbbell()
make_bottle()
make_microscope()

print()
print("P1 — Supplement Icons:")
make_pill()
make_powder_scoop()
make_softgel()
make_gummy()

print()
print("P2 — Food/Meal Icons:")
make_breakfast()
make_lunchbox()
make_dinner()
make_snack()
make_camera()

print()
print("P3 — UI Elements:")
make_gear()
make_calendar()
make_star()
make_trophy()
make_ring()

print()
print("Additional Icons:")
make_sun()
make_moon()
make_notepad()
make_flame()
make_blood_drop()
make_scale()
make_warning()
make_lightning()
make_flexed_arm()
make_sparkle()
make_envelope()
make_info()
make_hourglass()
make_lightbulb()
make_party()

print()
print("Mood Faces (5 levels):")
make_mood_face(1, "mood-1-crying")
make_mood_face(2, "mood-2-sad")
make_mood_face(3, "mood-3-neutral")
make_mood_face(4, "mood-4-happy")
make_mood_face(5, "mood-5-great")

print()
print("Energy Icons (5 levels):")
make_energy_icon(1, "energy-1-empty")
make_energy_icon(2, "energy-2-low")
make_energy_icon(3, "energy-3-medium")
make_energy_icon(4, "energy-4-high")
make_energy_icon(5, "energy-5-full")

print()
print("Done! All icons saved to assets/images/icons/")
