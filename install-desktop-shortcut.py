"""デスクトップショートカットを作成（¥アイコン・日本語名）。"""
from __future__ import annotations

import ctypes
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

APP_NAME = "ホワイト事業部価格表"
APP_URL = "https://pv-dn.github.io/price-lookup/"
PWA_APP_ID = "ajgofmiflbeidbiapppkabpgnncpaaip"
ROOT = Path(__file__).resolve().parent


def get_desktop_dirs() -> list[Path]:
    buf = ctypes.create_unicode_buffer(260)
    ctypes.windll.shell32.SHGetFolderPathW(None, 0, None, 0, buf)
    dirs = [Path(buf.value)]
    home = Path(os.environ["USERPROFILE"])
    for extra in (home / "Desktop", home / "OneDrive" / "Desktop"):
        if extra.is_dir() and extra not in dirs:
            dirs.append(extra)
    return dirs


def is_price_lookup_shortcut(path: Path) -> bool:
    try:
        data = path.read_bytes()
    except OSError:
        return False
    return b"price-lookup" in data or PWA_APP_ID.encode() in data


def find_browser() -> str:
    candidates = [
        Path(os.environ.get("ProgramFiles", r"C:\Program Files"))
        / "Google"
        / "Chrome"
        / "Application"
        / "chrome.exe",
        Path(os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)"))
        / "Microsoft"
        / "Edge"
        / "Application"
        / "msedge.exe",
    ]
    for candidate in candidates:
        if candidate.is_file():
            return str(candidate)
    raise RuntimeError("Chrome または Edge が見つかりません")


def vbs_path_literal(path: Path | str) -> str:
    return str(path).replace("\\", "\\\\")


def main() -> None:
    subprocess.run([sys.executable, str(ROOT / "icons" / "make-icons.py")], check=True)

    source_icon = ROOT / "public" / "icons" / "desktop.ico"
    if not source_icon.is_file():
        raise FileNotFoundError(f"アイコンが見つかりません: {source_icon}")

    icon_dir = Path(os.environ["LOCALAPPDATA"]) / "price-lookup"
    icon_dir.mkdir(parents=True, exist_ok=True)
    icon_path = icon_dir / "desktop.ico"
    shutil.copy2(source_icon, icon_path)

    browser = find_browser()
    desktop_dirs = get_desktop_dirs()
    primary_desktop = desktop_dirs[0]
    temp_path = primary_desktop / "price-lookup-temp.lnk"
    shortcut_path = primary_desktop / f"{APP_NAME}.lnk"

    for desktop in desktop_dirs:
        for item in desktop.glob("*.lnk"):
            if is_price_lookup_shortcut(item):
                item.unlink()
        temp = desktop / "price-lookup-temp.lnk"
        if temp.is_file():
            temp.unlink()
        if shortcut_path.parent == desktop and shortcut_path.is_file():
            shortcut_path.unlink()

    vbs = f"""Set shell = CreateObject("WScript.Shell")
Set sc = shell.CreateShortcut("{vbs_path_literal(temp_path)}")
sc.TargetPath = "{vbs_path_literal(browser)}"
sc.Arguments = "--app={APP_URL}"
sc.IconLocation = "{vbs_path_literal(icon_path)},0"
sc.Description = "{APP_NAME}"
sc.WorkingDirectory = "{vbs_path_literal(icon_dir)}"
sc.Save
"""

    with tempfile.NamedTemporaryFile("w", suffix=".vbs", delete=False, encoding="utf-16") as handle:
        handle.write(vbs)
        vbs_path = handle.name

    try:
        subprocess.run(["cscript", "//nologo", vbs_path], check=True)
    finally:
        os.unlink(vbs_path)

    if shortcut_path.exists():
        shortcut_path.unlink()
    temp_path.replace(shortcut_path)

    ie4u = Path(os.environ.get("SystemRoot", r"C:\Windows")) / "System32" / "ie4uinit.exe"
    if ie4u.is_file():
        subprocess.run([str(ie4u), "-show"], check=False)

    ctypes.windll.shell32.SHChangeNotify(0x08000000, 0x0000, None, None)

    print(f"Created: {shortcut_path}")
    print(f"Icon: {icon_path}")


if __name__ == "__main__":
    main()
