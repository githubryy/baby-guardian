"""
Generate tabBar icons for baby-guardian WeChat mini-program.
8 icons total: home, stats, history, settings - each in normal (#999999) and active (#FF7B7B) states.
Size: 81x81px (WeChat recommended tabBar icon size).
"""
from PIL import Image, ImageDraw

SIZE = 81
NORMAL_COLOR = (153, 153, 153, 255)   # #999999
ACTIVE_COLOR = (255, 123, 123, 255)   # #FF7B7B
OUTPUT_DIR = "src/static/icons"


def draw_home(draw, color):
    """Draw a house icon: triangular roof + rectangular body + door."""
    c = color
    # Roof (triangle)
    draw.polygon([(40, 14), (12, 42), (68, 42)], fill=c)
    # Body (rectangle)
    draw.rectangle([20, 40, 60, 66], fill=c)
    # Door (cut out - draw background color)
    draw.rectangle([35, 48, 46, 66], fill=(0, 0, 0, 0))
    # Redraw door in transparent by using a mask approach - simpler: just leave a gap
    # Actually, let's draw the door as a lighter rectangle
    door_color = (c[0], c[1], c[2], 80)
    draw.rectangle([35, 48, 46, 66], fill=door_color)


def draw_stats(draw, color):
    """Draw a bar chart icon: 3 bars of increasing height."""
    c = color
    bar_w = 11
    gap = 7
    x = 14
    # Bar 1 (short)
    draw.rectangle([x, 52, x + bar_w, 66], fill=c)
    x += bar_w + gap
    # Bar 2 (medium)
    draw.rectangle([x, 38, x + bar_w, 66], fill=c)
    x += bar_w + gap
    # Bar 3 (tall)
    draw.rectangle([x, 22, x + bar_w, 66], fill=c)
    # Base line
    draw.rectangle([10, 68, 70, 70], fill=c)


def draw_history(draw, color):
    """Draw a clock icon: circle + two hands."""
    c = color
    # Outer circle (ring)
    draw.ellipse([14, 14, 66, 66], outline=c, width=4)
    # Hour hand (pointing to 10 o'clock position)
    cx, cy = 40, 40
    draw.line([(cx, cy), (cx - 14, cy - 8)], fill=c, width=4)
    # Minute hand (pointing to 2 o'clock position)
    draw.line([(cx, cy), (cx + 16, cy - 6)], fill=c, width=4)
    # Center dot
    draw.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=c)


def draw_settings(draw, color):
    """Draw a gear icon: outer gear teeth + inner circle."""
    c = color
    cx, cy = 40, 40
    import math
    # Draw gear teeth as a polygon
    outer_r = 28
    inner_r = 20
    teeth = 8
    points = []
    for i in range(teeth * 2):
        angle = (i * math.pi) / teeth - math.pi / 2
        r = outer_r if i % 2 == 0 else inner_r
        # Add some width to teeth
        if i % 2 == 0:
            # Start of tooth
            points.append((cx + r * math.cos(angle - 0.18), cy + r * math.sin(angle - 0.18)))
            points.append((cx + r * math.cos(angle + 0.18), cy + r * math.sin(angle + 0.18)))
        else:
            # Valley
            points.append((cx + r * math.cos(angle + 0.18), cy + r * math.sin(angle + 0.18)))
            points.append((cx + r * math.cos(angle - 0.18), cy + r * math.sin(angle - 0.18)))

    # Simplify: just draw a thick ring with notches
    # Draw outer circle
    draw.ellipse([cx - 28, cy - 28, cx + 28, cy + 28], fill=c)
    # Draw inner circle cutout (transparent)
    draw.ellipse([cx - 19, cy - 19, cx + 19, cy + 19], fill=(0, 0, 0, 0))
    # Draw teeth - small rectangles around the perimeter
    for i in range(teeth):
        angle = (i * 2 * math.pi) / teeth - math.pi / 2
        tx = cx + 30 * math.cos(angle)
        ty = cy + 30 * math.sin(angle)
        # Draw a small square at each tooth position
        s = 7
        draw.rectangle([tx - s//2, ty - s//2, tx + s//2, ty + s//2], fill=c)
    # Inner hole
    draw.ellipse([cx - 8, cy - 8, cx + 8, cy + 8], fill=c)
    draw.ellipse([cx - 5, cy - 5, cx + 5, cy + 5], fill=(0, 0, 0, 0))


def draw_settings_v2(draw, color):
    """Draw a gear icon - cleaner version using arcs and lines."""
    import math
    c = color
    cx, cy = 40, 40

    # Draw gear teeth
    num_teeth = 8
    outer_r = 30
    tooth_r = 24
    for i in range(num_teeth):
        angle = (i * 2 * math.pi) / num_teeth - math.pi / 2
        # Tooth as a thick line segment
        x1 = cx + tooth_r * math.cos(angle - 0.25)
        y1 = cy + tooth_r * math.sin(angle - 0.25)
        x2 = cx + outer_r * math.cos(angle - 0.12)
        y2 = cy + outer_r * math.sin(angle - 0.12)
        x3 = cx + outer_r * math.cos(angle + 0.12)
        y3 = cy + outer_r * math.sin(angle + 0.12)
        x4 = cx + tooth_r * math.cos(angle + 0.25)
        y4 = cy + tooth_r * math.sin(angle + 0.25)
        draw.polygon([(x1, y1), (x2, y2), (x3, y3), (x4, y4)], fill=c)

    # Draw the main ring
    draw.ellipse([cx - tooth_r, cy - tooth_r, cx + tooth_r, cy + tooth_r], fill=c)
    # Cut out center
    draw.ellipse([cx - 10, cy - 10, cx + 10, cy + 10], fill=(0, 0, 0, 0))


def create_icon(draw_func, color, filename):
    """Create an icon image with the given draw function and color."""
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw_func(draw, color)
    img.save(filename, "PNG")
    print(f"  Generated: {filename}")


def main():
    import os
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    icons = {
        "home": draw_home,
        "stats": draw_stats,
        "history": draw_history,
        "settings": draw_settings_v2,
    }

    for name, func in icons.items():
        create_icon(func, NORMAL_COLOR, f"{OUTPUT_DIR}/{name}.png")
        create_icon(func, ACTIVE_COLOR, f"{OUTPUT_DIR}/{name}-active.png")

    print(f"\nDone! 8 icons generated in {OUTPUT_DIR}/")


if __name__ == "__main__":
    main()
