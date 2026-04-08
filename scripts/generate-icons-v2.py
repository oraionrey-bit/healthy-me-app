#!/usr/bin/env python3
"""Generate pixel art icons v2 for Healthy Me app — Food & Settings screens.

Supplements the original 45 icons with additional icons needed for:
- Food tab: pantry section
- Settings page: profile, targets, data export, account
"""

from PIL import Image, ImageDraw
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "images", "icons")
os.makedirs(OUT, exist_ok=True)

# Color palette from DESIGN-SYSTEM.md (same as generate-icons.py)
LAVENDER = (196, 181, 253)
SOFT_PINK = (249, 168, 212)
BABY_BLUE = (147, 197, 253)
MINT = (110, 231, 183)
PEACH = (253, 186, 116)
CREAM = (254, 243, 199)
PURPLE = (139, 92, 246)
DEEP_PURPLE = (124, 77, 255)
DARK_PURPLE = (74, 53, 96)
SOFT_PURPLE = (209, 196, 233)
SUCCESS = (129, 199, 132)
WARNING = (255, 183, 77)
ERROR = (229, 115, 115)
WHITE = (255, 255, 255)
TRANSPARENT = (0, 0, 0, 0)

# Darker outlines
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
    for x in range(x1, x2 + 1):
        for y in range(y1, y2 + 1):
            px(img, x, y, color)


def draw_pixels(img, pixels, color):
    """Draw a list of (x,y) tuples in a color."""
    for x, y in pixels:
        px(img, x, y, color)


# ============================================================
# SETTINGS ICONS
# ============================================================


def make_profile():
    """User profile silhouette — lavender, for Settings Profile section."""
    img = new_canvas()
    outline = LAVENDER_DARK
    fill = LAVENDER
    highlight = (220, 210, 255)

    # Head (circle, rows 2-6)
    draw_pixels(img, [(6, 2), (7, 2), (8, 2), (9, 2)], outline)
    draw_pixels(img, [(5, 3), (10, 3)], outline)
    draw_pixels(img, [(5, 4), (10, 4)], outline)
    draw_pixels(img, [(5, 5), (10, 5)], outline)
    draw_pixels(img, [(6, 6), (7, 6), (8, 6), (9, 6)], outline)

    # Head fill
    draw_pixels(img, [
        (6, 3), (7, 3), (8, 3), (9, 3),
        (6, 4), (7, 4), (8, 4), (9, 4),
        (6, 5), (7, 5), (8, 5), (9, 5),
    ], fill)

    # Highlight on head
    draw_pixels(img, [(6, 3), (7, 3)], highlight)

    # Body/shoulders (rows 8-13)
    draw_pixels(img, [(6, 8), (7, 8), (8, 8), (9, 8)], outline)
    draw_pixels(img, [(4, 9), (5, 9), (10, 9), (11, 9)], outline)
    draw_pixels(img, [(3, 10), (12, 10)], outline)
    draw_pixels(img, [(2, 11), (13, 11)], outline)
    draw_pixels(img, [(2, 12), (13, 12)], outline)
    draw_pixels(img, [(2, 13), (3, 13), (4, 13), (5, 13), (6, 13), (7, 13),
                       (8, 13), (9, 13), (10, 13), (11, 13), (12, 13), (13, 13)], outline)

    # Body fill
    draw_pixels(img, [
        (6, 9), (7, 9), (8, 9), (9, 9),
        (4, 10), (5, 10), (6, 10), (7, 10), (8, 10), (9, 10), (10, 10), (11, 10),
        (3, 11), (4, 11), (5, 11), (6, 11), (7, 11), (8, 11), (9, 11), (10, 11), (11, 11), (12, 11),
        (3, 12), (4, 12), (5, 12), (6, 12), (7, 12), (8, 12), (9, 12), (10, 12), (11, 12), (12, 12),
    ], fill)

    save(img, "profile")


def make_target():
    """Bullseye target — purple/pink, for Settings Targets section."""
    img = new_canvas()
    outline = PURPLE_DARK
    outer_ring = SOFT_PURPLE
    mid_ring = SOFT_PINK
    center = ERROR

    # Outer ring (rows 2-13)
    draw_pixels(img, [(5, 2), (6, 2), (7, 2), (8, 2), (9, 2), (10, 2)], outline)
    draw_pixels(img, [(3, 3), (4, 3), (11, 3), (12, 3)], outline)
    draw_pixels(img, [(2, 4), (13, 4)], outline)
    draw_pixels(img, [(2, 5), (13, 5)], outline)
    for y in range(6, 10):
        draw_pixels(img, [(1, y), (14, y)], outline)
    draw_pixels(img, [(2, 10), (13, 10)], outline)
    draw_pixels(img, [(2, 11), (13, 11)], outline)
    draw_pixels(img, [(3, 12), (4, 12), (11, 12), (12, 12)], outline)
    draw_pixels(img, [(5, 13), (6, 13), (7, 13), (8, 13), (9, 13), (10, 13)], outline)

    # Outer fill
    for y in range(3, 13):
        for x in range(2, 14):
            if img.getpixel((x, y)) == (0, 0, 0, 0):
                px(img, x, y, outer_ring)

    # Middle ring (rows 4-11)
    draw_pixels(img, [(6, 4), (7, 4), (8, 4), (9, 4)], outline)
    draw_pixels(img, [(5, 5), (10, 5)], outline)
    draw_pixels(img, [(4, 6), (11, 6)], outline)
    draw_pixels(img, [(4, 7), (11, 7)], outline)
    draw_pixels(img, [(4, 8), (11, 8)], outline)
    draw_pixels(img, [(4, 9), (11, 9)], outline)
    draw_pixels(img, [(5, 10), (10, 10)], outline)
    draw_pixels(img, [(6, 11), (7, 11), (8, 11), (9, 11)], outline)

    # Middle fill
    for y in range(5, 11):
        for x in range(5, 11):
            if img.getpixel((x, y)) == (0, 0, 0, 0):
                px(img, x, y, mid_ring)

    # Center dot (rows 6-9)
    draw_pixels(img, [(7, 6), (8, 6)], outline)
    draw_pixels(img, [(6, 7), (9, 7)], outline)
    draw_pixels(img, [(6, 8), (9, 8)], outline)
    draw_pixels(img, [(7, 9), (8, 9)], outline)

    # Center fill
    draw_pixels(img, [
        (7, 7), (8, 7),
        (7, 8), (8, 8),
    ], center)

    save(img, "target")


def make_chart():
    """Bar chart — baby blue, for Settings Data section."""
    img = new_canvas()
    outline = BLUE_DARK
    fill = BABY_BLUE
    highlight = (180, 220, 255)

    # Chart frame (axes)
    # Y-axis
    for y in range(2, 14):
        px(img, 2, y, outline)
    # X-axis
    for x in range(2, 14):
        px(img, x, 13, outline)

    # Bar 1 (short) — x=4-5
    fill_rect(img, 4, 9, 5, 12, fill)
    draw_pixels(img, [(4, 9), (5, 9)], outline)
    draw_pixels(img, [(4, 10), (4, 11), (4, 12)], outline)
    draw_pixels(img, [(5, 10), (5, 11), (5, 12)], fill)
    px(img, 5, 9, outline)
    # Highlight
    px(img, 5, 10, highlight)

    # Bar 2 (tall) — x=7-8
    fill_rect(img, 7, 4, 8, 12, fill)
    draw_pixels(img, [(7, 4), (8, 4)], outline)
    for y in range(5, 13):
        px(img, 7, y, outline)
        px(img, 8, y, fill)
    # Highlight
    px(img, 8, 5, highlight)

    # Bar 3 (medium) — x=10-11
    fill_rect(img, 10, 6, 11, 12, fill)
    draw_pixels(img, [(10, 6), (11, 6)], outline)
    for y in range(7, 13):
        px(img, 10, y, outline)
        px(img, 11, y, fill)
    px(img, 11, 7, highlight)

    save(img, "chart")


def make_lock():
    """Padlock — purple, for Settings Account section."""
    img = new_canvas()
    outline = PURPLE_DARK
    fill = SOFT_PURPLE
    body_fill = LAVENDER
    highlight = (220, 210, 255)

    # Shackle (arch, rows 2-6)
    draw_pixels(img, [(6, 2), (7, 2), (8, 2), (9, 2)], outline)
    draw_pixels(img, [(5, 3), (10, 3)], outline)
    draw_pixels(img, [(5, 4), (10, 4)], outline)
    draw_pixels(img, [(5, 5), (10, 5)], outline)
    # Inside shackle
    draw_pixels(img, [(6, 3), (7, 3), (8, 3), (9, 3)], TRANSPARENT)
    draw_pixels(img, [(6, 4), (7, 4), (8, 4), (9, 4)], TRANSPARENT)
    draw_pixels(img, [(6, 5), (7, 5), (8, 5), (9, 5)], TRANSPARENT)

    # Lock body (rows 6-13)
    draw_pixels(img, [(3, 6), (4, 6), (5, 6), (6, 6), (7, 6), (8, 6), (9, 6), (10, 6), (11, 6), (12, 6)], outline)
    draw_pixels(img, [(3, 13), (4, 13), (5, 13), (6, 13), (7, 13), (8, 13), (9, 13), (10, 13), (11, 13), (12, 13)], outline)
    for y in range(7, 13):
        px(img, 3, y, outline)
        px(img, 12, y, outline)

    # Body fill
    for y in range(7, 13):
        for x in range(4, 12):
            px(img, x, y, body_fill)

    # Keyhole (rows 9-11)
    draw_pixels(img, [(7, 9), (8, 9)], outline)
    draw_pixels(img, [(7, 10), (8, 10)], outline)
    px(img, 7, 11, outline)
    px(img, 8, 11, outline)

    # Highlight
    draw_pixels(img, [(4, 7), (5, 7), (4, 8)], highlight)

    save(img, "lock")


def make_pantry():
    """Pantry shelves — peach/cream, for Food Pantry section."""
    img = new_canvas()
    outline = PEACH_DARK
    shelf_color = PEACH
    item1 = SOFT_PINK
    item2 = BABY_BLUE
    item3 = MINT
    item4 = LAVENDER

    # Cabinet frame
    # Top
    for x in range(2, 14):
        px(img, x, 1, outline)
    # Bottom
    for x in range(2, 14):
        px(img, x, 14, outline)
    # Sides
    for y in range(2, 14):
        px(img, 2, y, outline)
        px(img, 13, y, outline)

    # Shelves (horizontal lines)
    for x in range(3, 13):
        px(img, x, 5, outline)
        px(img, x, 9, outline)

    # Items on top shelf (rows 2-4): small boxes/jars
    fill_rect(img, 4, 2, 5, 4, item1)
    fill_rect(img, 7, 3, 8, 4, item2)
    fill_rect(img, 10, 2, 11, 4, item3)

    # Items on middle shelf (rows 6-8): bottles/cans
    fill_rect(img, 4, 6, 5, 8, item4)
    fill_rect(img, 7, 7, 8, 8, item1)
    fill_rect(img, 10, 6, 11, 8, item2)

    # Items on bottom shelf (rows 10-13): larger items
    fill_rect(img, 4, 10, 6, 13, item3)
    fill_rect(img, 8, 11, 9, 13, item4)
    fill_rect(img, 11, 10, 12, 13, item1)

    save(img, "pantry")


def make_export():
    """Download/export arrow — mint, for Settings Data Export."""
    img = new_canvas()
    outline = MINT_DARK
    fill = MINT
    highlight = (160, 240, 210)

    # Arrow pointing down (rows 2-10)
    # Shaft
    fill_rect(img, 7, 2, 8, 8, fill)
    px(img, 6, 2, outline)
    px(img, 9, 2, outline)
    for y in range(2, 9):
        px(img, 6, y, outline)
        px(img, 9, y, outline)

    # Arrowhead
    draw_pixels(img, [(4, 8), (5, 8), (10, 8), (11, 8)], outline)
    draw_pixels(img, [(5, 9), (10, 9)], outline)
    draw_pixels(img, [(6, 10), (9, 10)], outline)
    draw_pixels(img, [(7, 11), (8, 11)], outline)

    # Arrowhead fill
    draw_pixels(img, [(5, 8), (6, 8), (7, 8), (8, 8), (9, 8), (10, 8)], fill)
    draw_pixels(img, [(6, 9), (7, 9), (8, 9), (9, 9)], fill)
    draw_pixels(img, [(7, 10), (8, 10)], fill)

    # Base line (tray/surface)
    for x in range(3, 13):
        px(img, x, 13, outline)
    px(img, 3, 12, outline)
    px(img, 12, 12, outline)

    # Highlight on shaft
    px(img, 8, 3, highlight)
    px(img, 8, 4, highlight)

    save(img, "export")


def make_grocery():
    """Grocery bag — peach, for food shopping/groceries."""
    img = new_canvas()
    outline = PEACH_DARK
    fill = PEACH
    highlight = (255, 210, 150)
    leaf = MINT

    # Bag handles (arch)
    draw_pixels(img, [(6, 2), (7, 2), (8, 2), (9, 2)], outline)
    draw_pixels(img, [(5, 3), (10, 3)], outline)
    draw_pixels(img, [(5, 4), (10, 4)], outline)

    # Bag body (rows 5-13)
    for x in range(3, 13):
        px(img, x, 5, outline)
    for x in range(3, 13):
        px(img, x, 13, outline)
    for y in range(6, 13):
        px(img, 3, y, outline)
        px(img, 12, y, outline)

    # Body fill
    for y in range(6, 13):
        for x in range(4, 12):
            px(img, x, y, fill)

    # Little leaf sticking out (green, to suggest produce)
    draw_pixels(img, [(7, 4), (8, 4)], leaf)
    draw_pixels(img, [(6, 3), (9, 3)], leaf)

    # Highlight
    draw_pixels(img, [(4, 6), (5, 6), (4, 7)], highlight)

    save(img, "grocery")


def make_barcode():
    """Barcode / nutrition label — gray/purple, for scanning."""
    img = new_canvas()
    outline = PURPLE_DARK
    bar_color = DARK_PURPLE
    bg = WHITE

    # Label rectangle (rows 2-13)
    for x in range(2, 14):
        px(img, x, 2, outline)
        px(img, x, 13, outline)
    for y in range(3, 13):
        px(img, 2, y, outline)
        px(img, 13, y, outline)

    # White background
    fill_rect(img, 3, 3, 12, 12, bg)

    # Barcode lines (vertical stripes of varying width)
    bars = [
        (4, 4, 4, 10),    # thin
        (5, 4, 5, 10),    # thin
        (7, 4, 7, 10),    # thin
        (8, 4, 8, 10),    # thin
        (9, 4, 9, 10),    # thin
        (11, 4, 11, 10),  # thin
        (12, 4, 12, 10),  # thin
    ]
    for x1, y1, x2, y2 in bars:
        for y in range(y1, y2 + 1):
            px(img, x1, y, bar_color)

    # "Numbers" row at bottom
    draw_pixels(img, [(4, 11), (6, 11), (8, 11), (10, 11), (12, 11)], GRAY)

    save(img, "barcode")


# ============================================================
# MAIN
# ============================================================


def main():
    print("Generating v2 pixel art icons for Food & Settings screens...\n")

    print("Settings icons:")
    make_profile()
    make_target()
    make_chart()
    make_lock()
    make_export()

    print("\nFood icons:")
    make_pantry()
    make_grocery()
    make_barcode()

    print(f"\nDone! 8 new icons saved to {OUT}")


if __name__ == "__main__":
    main()
