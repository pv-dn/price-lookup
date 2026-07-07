"""¥アイコン PNG / ICO を生成する。"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
PUBLIC_ICONS = HERE.parent / "public" / "icons"

BG_TOP = (30, 79, 214)
BG_MID = (10, 92, 255)
BG_BOTTOM = (5, 58, 140)

FONT_CANDIDATES = [
    Path("C:/Windows/Fonts/meiryob.ttc"),
    Path("C:/Windows/Fonts/meiryo.ttc"),
    Path("C:/Windows/Fonts/YuGothB.ttc"),
    Path("C:/Windows/Fonts/segoeuib.ttf"),
    Path("C:/Windows/Fonts/arialbd.ttf"),
]


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


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in FONT_CANDIDATES:
        if path.exists():
            try:
                return ImageFont.truetype(str(path), size=size)
            except OSError:
                continue
    return ImageFont.load_default()


def draw_yen_text(draw: ImageDraw.ImageDraw, size: int) -> None:
    font_size = int(size * 0.58)
    font = load_font(font_size)
    cx = size / 2
    cy = size / 2 + size * 0.03
    draw.text((cx + size * 0.02, cy + size * 0.03), "¥", font=font, fill=(0, 24, 64, 90), anchor="mm")
    draw.text((cx, cy), "¥", font=font, fill=(255, 255, 255, 255), anchor="mm")


def draw_icon(size: int) -> Image.Image:
    radius = int(size * 0.227)
    base = draw_gradient_background(size)
    mask = mask_rounded_square(size, radius)
    icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    icon.paste(base, mask=mask)
    add_shine(icon)
    draw = ImageDraw.Draw(icon, "RGBA")
    draw_yen_text(draw, size)
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
