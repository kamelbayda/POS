import { toBlob } from 'html-to-image';

/**
 * Renders a receipt element to a PNG. Scrolling parts (the item list is capped in the
 * preview) are expanded while capturing so every line is in the picture.
 */
export async function receiptToPng(el: HTMLElement): Promise<Blob> {
  const clipped = [...el.querySelectorAll<HTMLElement>('*')].filter((node) => {
    const cs = getComputedStyle(node);
    return cs.maxHeight !== 'none' && (cs.overflowY === 'auto' || cs.overflowY === 'scroll');
  });
  const saved = clipped.map((node) => [node.style.maxHeight, node.style.overflow] as const);
  clipped.forEach((node) => { node.style.maxHeight = 'none'; node.style.overflow = 'visible'; });
  try {
    const blob = await toBlob(el, { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: false });
    if (!blob) throw new Error('empty image');
    return blob;
  } finally {
    clipped.forEach((node, i) => { node.style.maxHeight = saved[i][0]; node.style.overflow = saved[i][1]; });
  }
}

export type ShareOutcome = 'shared' | 'cancelled' | 'fallback';

/**
 * Sends the receipt picture. Where the device can share files (phones, tablets) the
 * system share sheet opens and the user picks WhatsApp and the contact. Elsewhere the
 * picture is downloaded and copied, and the customer's WhatsApp chat is opened so it
 * can be pasted there.
 */
export async function shareReceiptImage(opts: {
  el: HTMLElement;
  fileName: string;
  caption: string;
  phone?: string;
}): Promise<ShareOutcome> {
  const blob = await receiptToPng(opts.el);
  const file = new File([blob], opts.fileName, { type: 'image/png' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: opts.caption });
      return 'shared';
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return 'cancelled';
      // fall through to the download path
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = opts.fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  try {
    await navigator.clipboard?.write?.([new ClipboardItem({ 'image/png': blob })]);
  } catch {
    // clipboard images are not allowed everywhere; the download is enough
  }
  const phone = (opts.phone || '').replace(/[^0-9]/g, '');
  if (phone) window.open(`https://wa.me/${phone}`, '_blank');
  return 'fallback';
}
