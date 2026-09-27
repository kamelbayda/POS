import React from 'react';

// Product grid sizing for the POS screens, driven by settings.posGridSize
export const getGridColsClass = (size?: string) => {
  switch (size) {
    case '3x3':
      return 'grid-cols-3';
    case '4x4':
      return 'grid-cols-4';
    case '5x5':
      return 'grid-cols-5';
    case '6x6':
      return 'grid-cols-6';
    default:
      return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6';
  }
};

export const getGridColsStyle = (size?: string): React.CSSProperties => {
  switch (size) {
    case '3x3':
      return { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' };
    case '4x4':
      return { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' };
    case '5x5':
      return { gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' };
    case '6x6':
      return { gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' };
    default:
      return { gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 185px), 1fr))' };
  }
};

export const getCardStyle = (size?: string) => {
  switch (size) {
    case '3x3':
      return {
        cardHeight: 'h-[180px] sm:h-[195px]',
        padding: 'p-5',
        titleFont: 'text-sm sm:text-base font-black',
        priceFont: 'text-sm sm:text-base font-black',
        labelFont: 'text-xs',
        emojiSize: 'text-4xl'
      };
    case '4x4':
      return {
        cardHeight: 'h-[160px] sm:h-[175px]',
        padding: 'p-3',
        titleFont: 'text-sm font-extrabold',
        priceFont: 'text-sm font-black',
        labelFont: 'text-[11px]',
        emojiSize: 'text-2xl'
      };
    case '5x5':
      return {
        cardHeight: 'h-[145px]',
        padding: 'p-2.5',
        titleFont: 'text-xs font-bold leading-tight',
        priceFont: 'text-xs font-black',
        labelFont: 'text-[10px]',
        emojiSize: 'text-xl'
      };
    case '6x6':
      return {
        cardHeight: 'h-[125px]',
        padding: 'p-2',
        titleFont: 'text-[10px] font-bold leading-tight',
        priceFont: 'text-[11px] font-black',
        labelFont: 'text-[9px]',
        emojiSize: 'text-lg'
      };
    default:
      return {
        cardHeight: 'h-[180px] sm:h-[195px]',
        padding: 'p-4 sm:p-5',
        titleFont: 'text-sm sm:text-base font-black',
        priceFont: 'text-sm sm:text-base font-black',
        labelFont: 'text-[11px] sm:text-xs',
        emojiSize: 'text-2xl'
      };
  }
};
