"""Compare original/local scrolled privacy screenshots, keeping CAPTCHA separate."""
import json
from pathlib import Path
from PIL import Image, ImageChops

folder = Path(__file__).resolve().parents[1] / "reference" / "privacy"
metrics = json.loads((folder / "visible-comparison.json").read_text())
results = []
for width in [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920]:
    original = Image.open(folder / f"original-visible-{width}.png").convert("RGB")
    local = Image.open(folder / f"local-visible-{width}.png").convert("RGB")
    assert original.size == local.size
    difference = ImageChops.difference(original, local)
    bounds = difference.getbbox()
    changed = sum(pixel != (0, 0, 0) for pixel in difference.getdata())
    frame = next(m["captcha"] for m in metrics if m["name"] == "local" and m["width"] == width)
    difference.paste((0, 0, 0), (int(frame["x"]), int(frame["viewportY"]),
                               int(frame["x"] + frame["width"] + 1),
                               int(frame["viewportY"] + frame["height"] + 1)))
    outside = sum(pixel != (0, 0, 0) for pixel in difference.getdata())
    results.append({"width": width, "originalSize": original.size, "localSize": local.size,
                    "differentPixels": changed, "differenceBounds": bounds,
                    "differentPixelsOutsideCaptcha": outside})
    assert outside == 0, f"Privacy screenshot differs outside CAPTCHA at {width}px"
(folder / "pixel-comparison.json").write_text(json.dumps(results, indent=2))
print(json.dumps({"widths": len(results), "differentPixelsOutsideCaptcha": 0, "results": results}, indent=2))
