import React, { useState } from 'react';

/**
 * Excel-like drag-to-resize table columns.
 * Returns the current widths (px) and a pointer-down handler for each column's resize grip.
 * In RTL, dragging left widens the column.
 */
export function useResizableColumns(initialWidths: Record<string, number>, lang: 'ar' | 'en') {
  const [colWidths, setColWidths] = useState<Record<string, number>>(initialWidths);

  const handleResizeStart = (e: React.PointerEvent, colKey: string) => {
    e.preventDefault();
    e.stopPropagation();

    // Pointer capture keeps the resize going even if the pointer leaves the header
    const targetEl = e.currentTarget as HTMLElement;
    try {
      targetEl.setPointerCapture(e.pointerId);
    } catch {
      // safe fallback
    }

    const startX = e.clientX;
    const startWidth = colWidths[colKey] || 120;
    const isRtl = lang === 'ar';

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const newWidth = Math.max(65, isRtl ? startWidth - dx : startWidth + dx);
      setColWidths(prev => ({ ...prev, [colKey]: newWidth }));
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      try {
        targetEl.releasePointerCapture(upEvent.pointerId);
      } catch {
        // safe fallback
      }
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  return { colWidths, handleResizeStart };
}
