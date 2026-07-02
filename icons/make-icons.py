"""¥マークのアイコン PNG / ICO を生成する。"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
PUBLIC_ICONS = HERE.parent / "public" / "icons"
BG = "#0071e3"
FG = "#ffffff"


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/meiryo.ttc",
        "C:/Windows/Fonts/arial.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def draw_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    radius = int(size * 0.21)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=BG)
    font = load_font(int(size * 0.55))
    text = "¥"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = (size - tw) / 2 - bbox[0]
    y = (size - th) / 2 - bbox[1] - size * 0.02
    draw.text((x, y), text, font=font, fill=FG)
    return img


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
