import { removeBackground } from '@imgly/background-removal';
import JSZip from 'jszip';
import { state } from './state.js';

// Triggers a click download on a Blob file
export function triggerFileDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Download a single item
export function downloadSingleItem(item) {
  if (item.status !== 'success' || !item.finalBlob) return;
  
  // Format original name for export (replace extension with png)
  const baseName = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
  let bgSuffix = state.globalBgColor === 'transparent' ? 'transparente' : 'fondocolor';
  if (state.globalBgColor === '#ffffff') bgSuffix = 'fondoblanco';
  
  const outputName = `${baseName}_${bgSuffix}.png`;
  triggerFileDownload(item.finalBlob, outputName);
}

// Zip compressing and exporting batch
export async function downloadBatchAsZip(completedItems, beforeZipCallback, afterZipCallback) {
  if (completedItems.length === 0) return;

  if (beforeZipCallback) beforeZipCallback();

  try {
    const zip = new JSZip();
    
    // Add completed files to ZIP
    completedItems.forEach((item, index) => {
      const baseName = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
      let bgSuffix = state.globalBgColor === 'transparent' ? 'transparente' : 'fondocolor';
      if (state.globalBgColor === '#ffffff') bgSuffix = 'fondoblanco';
      
      const fileName = `${baseName}_${bgSuffix}_${index + 1}.png`;
      zip.file(fileName, item.finalBlob);
    });

    const contentBlob = await zip.generateAsync({ type: 'blob' });
    triggerFileDownload(contentBlob, 'FondoBlanco_AI_Lote.zip');

  } catch (err) {
    console.error('Error generando archivo ZIP:', err);
    alert('Ocurrió un error al empaquetar el archivo ZIP.');
  } finally {
    if (afterZipCallback) afterZipCallback();
  }
}

// Re-renders a completed item canvas with the target background color
export function applyBackgroundColorToItem(item) {
  return new Promise((resolve, reject) => {
    if (!item.processedBlob) return resolve();

    const canvas = item.cardElement.querySelector('.card-canvas');
    const ctx = canvas.getContext('2d');
    
    const img = new Image();
    const url = URL.createObjectURL(item.processedBlob);
    
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      
      // Resize canvas to full image resolution to preserve quality
      canvas.width = w;
      canvas.height = h;
      
      ctx.clearRect(0, 0, w, h);
      
      // Draw background color if not transparent
      if (state.globalBgColor !== 'transparent') {
        ctx.fillStyle = state.globalBgColor;
        ctx.fillRect(0, 0, w, h);
        
        // Remove transparent-checker checkerboard visual helper
        canvas.classList.remove('transparent-checker');
      } else {
        // Add checkerboard background back for visual aid
        canvas.classList.add('transparent-checker');
      }
      
      // Draw original transparent image overlay
      ctx.drawImage(img, 0, 0);
      
      // Save canvas output as Blob to optimize download performance
      canvas.toBlob((blob) => {
        item.finalBlob = blob;
        URL.revokeObjectURL(url);
        resolve();
      }, 'image/png');
    };

    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };

    img.src = url;
  });
}

// Triggers when global background color shifts
export async function updateAllProcessedBackgrounds() {
  const completedItems = state.queue.filter(item => item.status === 'success');
  
  for (const item of completedItems) {
    await applyBackgroundColorToItem(item);
  }
}

// Perform Background Removal on a single item using imgly AI
export async function processItem(item, progressCallback) {
  item.status = 'processing';

  try {
    const config = {
      model: 'large', // Keeps the original model setting
      progress: (key, current, total) => {
        const percent = Math.round((current / total) * 100);
        item.progress = percent;
        
        let statusMsg = 'Procesando...';
        if (key.includes('fetch')) {
          statusMsg = 'Cargando IA...';
        } else if (key.includes('compute')) {
          statusMsg = 'Cortando silueta...';
          state.modelLoadedOnce = true;
        }
        
        if (progressCallback) {
          progressCallback(item, statusMsg, percent, key.includes('fetch'));
        }
      }
    };

    // Trigger AI background removal
    const resultBlob = await removeBackground(item.file, config);
    item.processedBlob = resultBlob;
    item.status = 'success';
    
    // Draw the image onto our custom colored canvas
    await applyBackgroundColorToItem(item);

  } catch (err) {
    console.error(`Error procesando archivo ${item.name}:`, err);
    item.status = 'error';
  }
}
