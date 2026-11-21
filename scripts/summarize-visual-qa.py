from pathlib import Path
import json
from PIL import Image, ImageChops, ImageStat

root = Path(__file__).resolve().parent.parent
folder = root / 'reference/qa/pages'
data = json.loads((folder / 'results.json').read_text(encoding='utf-8'))
out = []
for i in range(0, len(data), 2):
    a, b = data[i:i+2]
    suffix = a['route'].replace('/', '-') + '-' + str(a['width']) + '.png'
    original = Image.open(folder / ('reference-' + suffix)).convert('RGB')
    local = Image.open(folder / ('local-' + suffix)).convert('RGB')
    diff = ImageChops.difference(original, local)
    out.append({'route': a['route'], 'width': a['width'], 'same_text': a['text'] == b['text'],
        'mean_absolute_channel_error': round(sum(ImageStat.Stat(diff).mean)/3, 4),
        'reference_height': a['height'], 'local_height': b['height'], 'local_broken_images': b['broken']})
(folder / 'pixel-summary.json').write_text(json.dumps(out, indent=2), encoding='utf-8')
print(json.dumps(out, indent=2))
