"""¥アイコン PNG / ICO を生成する（グラデーション＋ベクター描画）。"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
PUBLIC_ICONS = HERE.parent / "public" / "icons"

BG_TOP = (30, 79, 214)
BG_MID = (10, 92, 255)
BG_BOTTOM = (5, 58, 140)
YEN_TOP = (255, 255, 255)
YEN_BOTTOM = (220, 232, 255)


def lerp(a: int, b: int, t: float) -> int:
    return int(a + (b - a) * t)


def lerp_color(c1: tuple[int, int, int], c2: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return (lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t))


def draw_gradient_background(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    px = img.load()
    for y in range(size):
        t = y / max(size - 1, 1)
        if t < 0.52:
            local = t / 0.52
            color = lerp_color(BG_TOP, BG_MID, local)
        else:
            local = (t - 0.52) / 0.48
            color = lerp_color(BG_MID, BG_BOTTOM, local)
        for x in range(size):
            px[x, y] = (*color, 255)
    return img


def mask_rounded_square(size: int, radius: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask


def add_shine(img: Image.Image) -> None:
    size = img.size[0]
    shine = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(shine)
    draw.ellipse((-size * 0.1, -size * 0.35, size * 1.1, size * 0.55), fill=(255, 255, 255, 70))
    img.alpha_composite(shine)


def add_rings(draw: ImageDraw.ImageDraw, size: int) -> None:
    cx = cy = size / 2
    r1 = size * 0.328
    r2 = size * 0.258
    draw.ellipse((cx - r1, cy - r1, cx + r1, cy + r1), outline=(255, 255, 255, 32), width=max(2, size // 85))
    draw.ellipse((cx - r2, cy - r2, cx + r2, cy + r2), outline=(126, 180, 255, 46), width=max(1, size // 170))


def yen_color(t: float) -> tuple[int, int, int, int]:
    rgb = lerp_color(YEN_TOP, YEN_BOTTOM, t)
    return (*rgb, 255)


def draw_yen_symbol(draw: ImageDraw.ImageDraw, size: int) -> None:
    s = size / 512
    cx = size / 2

    def pt(x: float, y: float) -> tuple[float, float]:
        return (x * s, y * s)

    top = pt(256, 118)
    left = pt(150, 262)
    left_in = pt(188, 262)
    center_top = pt(256, 186)
    right_in = pt(324, 262)
    right = pt(362, 262)

    shadow = [
        top,
        left,
        left_in,
        center_top,
        right_in,
        right,
    ]
    draw.polygon(shadow, fill=(2, 20, 51, 90))

    draw.polygon([top, left, left_in, center_top, right_in, right], fill=yen_color(0.1))
    draw.rounded_rectangle((*pt(232, 186), *pt(280, 342)), radius=10 * s, fill=yen_color(0.35))
    draw.rounded_rectangle((*pt(164, 300), *pt(348, 334)), radius=12 * s, fill=yen_color(0.7))
    draw.rounded_rectangle((*pt(164, 360), *pt(348, 394)), radius=12 * s, fill=yen_color(0.95))

    highlight = [top, pt(188, 262), pt(206, 262), pt(256, 202), pt(306, 262), pt(324, 262)]
    draw.polygon(highlight, fill=(255, 255, 255, 140))


def draw_icon(size: int) -> Image.Image:
    radius = int(size * 0.227)
    base = draw_gradient_background(size)
    mask = mask_rounded_square(size, radius)
    icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    icon.paste(base, mask=mask)
    add_shine(icon)
    draw = ImageDraw.Draw(icon, "RGBA")
    add_rings(draw, size)
    draw_yen_symbol(draw, size)
    return icon


def main() -> None:
    PUBLIC_ICONS.mkdir(parents=True, exist_ok=True)
    img512 = draw_icon(512)
    img512.save(PUBLIC_ICONS / "icon-512.png", format="PNG")
    draw_icon(192).save(PUBLIC_ICONS / "icon-192.png", format="PNG")
    sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    img512.save(PUBLIC_ICONS / "desktop.ico", format="ICO", sizes=sizes)
    print("icons ready")


if __name__ == "__main__":
    main()
