// serialize + raster export for the live sankey <svg>. no external deps

function triggerDownload(href: string, filename: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// clone the live svg, stamp width/height/xmlns, return standalone markup
function serialize(svg: SVGSVGElement): { markup: string; width: number; height: number } {
  const rect = svg.getBoundingClientRect();
  const width = Math.round(rect.width);
  const height = Math.round(rect.height);
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  clone.setAttribute('viewBox', `0 0 ${width} ${height}`);
  const markup = new XMLSerializer().serializeToString(clone);
  return { markup: '<?xml version="1.0" encoding="UTF-8"?>\n' + markup, width, height };
}

export function exportSVG(svg: SVGSVGElement, name: string) {
  const { markup } = serialize(svg);
  const blob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, `${name}.svg`);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportPNG(svg: SVGSVGElement, name: string, scale = 2): Promise<void> {
  const { markup, width, height } = serialize(svg);
  const blob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas 2D context unavailable.'));
        return;
      }
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((out) => {
        if (!out) {
          reject(new Error('PNG encoding failed.'));
          return;
        }
        const pngUrl = URL.createObjectURL(out);
        triggerDownload(pngUrl, `${name}.png`);
        setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
        resolve();
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to rasterise SVG.'));
    };
    img.src = url;
  });
}

export function exportJSON(data: unknown, name: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, `${name}.json`);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
