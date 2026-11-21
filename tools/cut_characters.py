# Нарезка листов с персонажами (сетка 2×2: черри, сливка / солнышко, бычье сердце) на отдельные позы
# с прозрачным фоном. Запуск: python3 tools/cut_characters.py <папка с листами> assets/characters
# Нужны: pip install pillow numpy scipy
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage as ndi
src, outdir = sys.argv[1], sys.argv[2]
sheets = {'1.webp':'wave','2.webp':'think','3.webp':'dance','4.webp':'write','5.webp':'read','6.webp':'relax','7.webp':'jump'}
varieties = ['cherry','plum','yellow','oxheart']  # TL, TR, BL, BR
for fn, pose in sheets.items():
    im = Image.open(os.path.join(src, fn)).convert('RGBA')
    a = np.array(im).astype(np.float32)
    rgb, alpha = a[...,:3], a[...,3]
    H, W = alpha.shape
    mn = rgb.min(axis=2)
    if alpha.min() < 10:  # already transparent
        newa = alpha.copy()
    else:
        cand = mn > 232
        lab, n = ndi.label(cand)
        border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:,0], lab[:,-1]]))) - {0}
        bg = np.isin(lab, list(border))
        newa = np.full_like(alpha, 255)
        soft = np.clip((255 - mn) / (255 - 232), 0, 1) * 255
        newa[bg] = soft[bg] * 0.9
        # un-blend white from semi-transparent pixels
        f = np.clip(newa/255, 1e-3, 1)[...,None]
        rgb = np.where(bg[...,None], np.clip((rgb - 255*(1-f))/f, 0, 255), rgb)
    fg = newa > 40
    fg = ndi.binary_dilation(fg, iterations=2)
    lab, n = ndi.label(fg)
    cents = ndi.center_of_mass(fg, lab, range(1, n+1))
    sizes = ndi.sum(fg, lab, range(1, n+1))
    qmap = np.full((H, W), -1)
    yy, xx = np.mgrid[0:H, 0:W]
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        if sizes[i-1] < 30: continue
        m = lab == i
        cy, cx = cents[i-1]
        ycut, xcut = (H/2 if cy > H/2 else H/2), W/2
        if sl[0].start < H/2 - 40 and sl[0].stop > H/2 + 40:
            if fn == '7.webp':
                yq = (yy > H/2)
            else:
                rows = m[int(H/2-150):int(H/2+150)].sum(axis=1); ycut = H/2-150 + rows.argmin()
                yq = (yy > ycut)
        else:
            yq = np.full((H, W), cy > H/2)
        if sl[1].start < W/2 - 40 and sl[1].stop > W/2 + 40:
            cols = m[:, int(W/2-150):int(W/2+150)].sum(axis=0); xcut = W/2-150 + cols.argmin()
            xq = (xx > xcut)
        else:
            xq = np.full((H, W), cx > W/2)
        q = yq.astype(int)*2 + xq.astype(int)
        qmap[m] = q[m]
    out = np.dstack([rgb, newa]).astype(np.uint8)
    for q, v in enumerate(varieties):
        m = qmap == q
        o = out.copy(); o[...,3] = np.where(m, o[...,3], 0)
        ys, xs = np.where(o[...,3] > 8)
        y0,y1,x0,x1 = ys.min(), ys.max(), xs.min(), xs.max()
        crop = Image.fromarray(o[max(0,y0-6):y1+7, max(0,x0-6):x1+7])
        crop.thumbnail((640, 640), Image.LANCZOS)
        os.makedirs(os.path.join(outdir, v), exist_ok=True)
        crop.save(os.path.join(outdir, v, pose + '.webp'), 'WEBP', quality=88, method=6)
        print(v, pose, crop.size)
