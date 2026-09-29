// Helper to generate a procedural 1D barcode pattern
export function generateBarcodePattern(barcodeStr: string): string[] {
  const charMap: { [key: string]: string } = {
    '0': '11001010',
    '1': '10110010',
    '2': '10101100',
    '3': '11011010',
    '4': '10010110',
    '5': '11001011',
    '6': '10110110',
    '7': '10010110',
    '8': '11001101',
    '9': '10110110',
  };
  const defaultPattern = '101100';
  let pattern = '10101'; // Start guard bars
  const cleanStr = (barcodeStr || '').trim() || '123456';
  for (let i = 0; i < cleanStr.length; i++) {
    const char = cleanStr[i];
    pattern += charMap[char] || defaultPattern;
  }
  pattern += '10101'; // End guard bars
  return pattern.split('');
}
