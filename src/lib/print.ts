import * as storage from './storage';

// Helper to print a specific DOM element's inner contents using an isolated, sandboxed iframe
export function printElementViaIFrame(elementId: string, customStyles: string = '', forceManual: boolean = false) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with ID ${elementId} not found.`);
    return;
  }

  // Load saved settings to check for direct silent print
  let directSilent = true; // Default is true for high-speed POS experience
  try {
    const stored = storage.getItem('pos_settings');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.directSilentPrint !== undefined) {
        directSilent = parsed.directSilentPrint;
      }
    }
  } catch (err) {
    console.error('Error loading settings in printer:', err);
  }

  // Dispatch background spooler event for visual tracking & acoustic trigger in UI
  window.dispatchEvent(new CustomEvent('aronium-direct-print', {
    detail: {
      elementId,
      textContents: element.innerText || 'POS Print Job document'
    }
  }));

  // Create a clean, hidden iframe element for isolated printing
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.width = '0px';
  iframe.style.height = '0px';
  iframe.style.border = 'none';
  iframe.style.left = '-9999px';
  iframe.style.top = '-9999px';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!iframeDoc) {
    console.error('Failed to access iframe document.');
    return;
  }

  iframeDoc.open();

  // Load all styles from the parent document to preserve Tailwind/custom styles
  let stylesHtml = '';
  try {
    const parentSheets = document.styleSheets;
    for (let i = 0; i < parentSheets.length; i++) {
      const sheet = parentSheets[i];
      try {
        if (sheet.href) {
          stylesHtml += `<link rel="stylesheet" href="${sheet.href}">\n`;
        } else if (sheet.cssRules) {
          let rules = '';
          for (let j = 0; j < sheet.cssRules.length; j++) {
            rules += sheet.cssRules[j].cssText + '\n';
          }
          stylesHtml += `<style>${rules}</style>\n`;
        }
      } catch (e) {
        // Safe context cross-origin error handling
      }
    }
  } catch (err) {
    console.error('Error fetching parent stylesheets:', err);
  }

  // Replace lazy loading with eager loading in cloned elements to force immediate render in hidden iframe
  const processedHTML = element.innerHTML.replace(/loading=["']lazy["']/g, 'loading="eager"');

  // Write the printing document with direct styles of high quality
  iframeDoc.write(`
    <!DOCTYPE html>
    <html dir="${document.dir || 'rtl'}">
      <head>
        <title>طباعة</title>
        <meta charset="UTF-8" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;700;900&family=Courier+New&display=swap" rel="stylesheet">
        ${stylesHtml}
        <style>
          /* Global resets specifically for printer preview reliability */
          html, body {
            background: white !important;
            background-color: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          /* Force all text elements to pure solid black for crisp printing */
          body, p, span, td, th, h1, h2, h3, h4, h5, h6, pre {
            color: black !important;
            text-shadow: none !important;
            box-shadow: none !important;
          }
          /* Apply custom styles */
          ${customStyles}
        </style>
      </head>
      <body>
        <div id="${elementId}" class="bg-white text-black" style="background: white !important; color: black !important;">
          ${processedHTML}
        </div>
      </body>
    </html>
  `);
  iframeDoc.close();

  // Print once the frame loads and all images inside are loaded
  const executePrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('Unified IFrame print failed:', e);
    }
    // Clean up post-print
    setTimeout(() => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }, 3000);
  };

  // Wait for all images to complete loading inside the iframe
  const printWindow = iframe.contentWindow;
  if (printWindow) {
    const images = printWindow.document.querySelectorAll('img');
    if (images.length === 0) {
      setTimeout(executePrint, 500);
    } else {
      let loadedImages = 0;
      const totalImages = images.length;
      const timeoutId = setTimeout(executePrint, 2500); // safety fallback limit (2.5s max wait)

      const trackImageLoad = () => {
        loadedImages++;
        if (loadedImages === totalImages) {
          clearTimeout(timeoutId);
          setTimeout(executePrint, 300); // tiny buffer for rendering engine to rasterize
        }
      };

      images.forEach((img) => {
        if (img.complete) {
          trackImageLoad();
        } else {
          img.onload = trackImageLoad;
          img.onerror = trackImageLoad; // treat errors as loaded to not block the document print entirely
        }
      });
    }
  } else {
    setTimeout(executePrint, 500);
  }
}

// Play realistic thermal printer sound using Web Audio API
export function playReceiptPrintSound() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const parentTime = ctx.currentTime;
    
    // Simulate active stepper motor buzz by generating quick micro-bursts of high-quality sawtooth waves
    for (let i = 0; i < 7; i++) {
      const startTime = parentTime + i * 0.22;
      const duration = 0.14;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130 + (i % 2 === 0 ? 10 : 0), startTime);
      osc.frequency.exponentialRampToValueAtTime(155, startTime + duration);
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(400, startTime);
      filter.Q.setValueAtTime(2.5, startTime);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    }
    
    // Play a dual-tone successful paper rip cut notification at the end
    const ripOsc = ctx.createOscillator();
    const ripGain = ctx.createGain();
    ripOsc.type = 'sine';
    ripOsc.frequency.setValueAtTime(2100, parentTime + 7 * 0.22);
    ripGain.gain.setValueAtTime(0, parentTime + 7 * 0.22);
    ripGain.gain.linearRampToValueAtTime(0.06, parentTime + 7 * 0.22 + 0.02);
    ripGain.gain.exponentialRampToValueAtTime(0.001, parentTime + 7 * 0.22 + 0.1);
    
    ripOsc.connect(ripGain);
    ripGain.connect(ctx.destination);
    ripOsc.start(parentTime + 7 * 0.22);
    ripOsc.stop(parentTime + 7 * 0.22 + 0.1);
  } catch (err) {
    console.warn('Audio feedback failed or was blocked by gesture rules:', err);
  }
}

/** Prints a complete, self-contained HTML document (its own styles) through a hidden iframe. */
export function printHtmlDocument(html: string) {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:absolute;width:0;height:0;border:0;left:-9999px;top:-9999px';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();
  const run = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('Print failed:', e);
    }
    setTimeout(() => iframe.remove(), 3000);
  };
  // Wait for the web font so Arabic text prints in the right typeface
  const fonts = (doc as Document & { fonts?: FontFaceSet }).fonts;
  const timeout = setTimeout(run, 1500);
  fonts?.ready.then(() => { clearTimeout(timeout); setTimeout(run, 100); });
}
