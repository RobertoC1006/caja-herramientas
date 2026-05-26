// Orchestrator for the Background Remover Tool
import { state } from './state.js';
import {
  processItem,
  updateAllProcessedBackgrounds,
  downloadSingleItem,
  downloadBatchAsZip
} from './processor.js';
import {
  createImageCard,
  updateCardProgress,
  updateCardUI
} from './card-ui.js';
import {
  setupModalSlider,
  openComparisonModal
} from './modal-ui.js';
import {
  setupDragAndDrop,
  setupColorSelectors,
  setupActionButtons,
  setupSampleButtons
} from './event-handlers.js';
import {
  initDownloadFlow,
  startDownloadCountdown
} from './download-flow.js';

// DOM Elements local to this orchestrator
let dropZone, fileInput, resultsSection, resultsGrid, samplesSection, queueStatusText, queueStatusBar;
let statTotal, statProcessed, statRemaining;
let btnDownloadZip, btnClearAll;
let colorOptionsContainer, customColorInput, customColorRadio, customColorPreview;
let limitAlert, btnAlertClose;

export function initBgRemover() {
  // Query DOM Elements
  dropZone = document.getElementById('drop-zone');
  fileInput = document.getElementById('file-input');
  resultsSection = document.getElementById('results-section');
  resultsGrid = document.getElementById('results-grid');
  samplesSection = document.getElementById('samples-section');
  queueStatusText = document.getElementById('queue-status-text');
  queueStatusBar = document.getElementById('queue-status-bar');

  statTotal = document.getElementById('stat-total');
  statProcessed = document.getElementById('stat-processed');
  statRemaining = document.getElementById('stat-remaining');

  btnDownloadZip = document.getElementById('btn-download-zip');
  btnClearAll = document.getElementById('btn-clear-all');

  colorOptionsContainer = document.getElementById('color-options-container');
  customColorInput = document.getElementById('custom-color-input');
  customColorRadio = document.getElementById('radio-custom-color');
  customColorPreview = document.getElementById('custom-color-preview');

  limitAlert = document.getElementById('batch-limit-alert');
  btnAlertClose = document.getElementById('btn-alert-close');

  if (!dropZone) return; // Exit if element not found on page

  // Initialize event handlers
  setupDragAndDrop(dropZone, fileInput, handleUploadedFiles);
  
  setupColorSelectors({
    colorOptionsContainer,
    customColorInput,
    customColorRadio,
    customColorPreview,
    onColorChanged: async (newColor) => {
      state.globalBgColor = newColor;
      await updateAllProcessedBackgrounds();
    }
  });

  setupActionButtons({
    btnDownloadZip,
    btnClearAll,
    onDownloadZip: () => {
      const completedItems = state.queue.filter(item => item.status === 'success');
      // Trigger the 5 second countdown before running download
      startDownloadCountdown(() => {
        downloadBatchAsZip(
          completedItems,
          () => {
            btnDownloadZip.setAttribute('disabled', 'true');
            btnDownloadZip.dataset.originalText = btnDownloadZip.innerHTML;
            btnDownloadZip.innerHTML = `
              <div class="spinner" style="width: 18px; height: 18px; display: inline-block;"></div>
              Comprimiendo ZIP...
            `;
          },
          () => {
            btnDownloadZip.removeAttribute('disabled');
            btnDownloadZip.innerHTML = btnDownloadZip.dataset.originalText;
          }
        );
      });
    },
    onClearAll: clearAllQueue
  });

  setupSampleButtons(handleUploadedFiles);
  setupModalSlider();

  // Alert banner close binding
  if (btnAlertClose && limitAlert) {
    btnAlertClose.addEventListener('click', () => {
      limitAlert.style.display = 'none';
    });
  }

  // Initialize the download flow countdown modal and success screen logic
  initDownloadFlow(() => {
    // Callback when user clicks 'Volver a procesar' on success page
    clearAllQueue();
  });
}

/* --- Core Queue Controller & UI Bridge --- */

function handleUploadedFiles(fileList) {
  const imageFiles = Array.from(fileList).filter(file => file.type.startsWith('image/'));
  
  if (imageFiles.length === 0) return;

  // Lógica del Límite de Lote de 5 imágenes
  const currentCount = state.queue.length;
  const newFilesCount = imageFiles.length;
  let allowedFiles = imageFiles;
  
  if (currentCount >= 5) {
    // Already full, show warning alert and reject everything
    if (limitAlert) limitAlert.style.display = 'flex';
    return;
  }
  
  if (currentCount + newFilesCount > 5) {
    // Exceeds limit, grab only what is needed to reach 5
    const spaceLeft = 5 - currentCount;
    allowedFiles = imageFiles.slice(0, spaceLeft);
    if (limitAlert) limitAlert.style.display = 'flex';
  } else {
    // Doesn't exceed, make sure to hide the alert just in case
    if (limitAlert) limitAlert.style.display = 'none';
  }

  if (allowedFiles.length === 0) return;

  // Update layout sections
  resultsSection.style.display = 'block';
  samplesSection.style.display = 'none';
  btnClearAll.removeAttribute('disabled');

  allowedFiles.forEach(file => {
    const originalUrl = URL.createObjectURL(file);
    const item = {
      id: 'img-' + Math.random().toString(36).substr(2, 9),
      file: file,
      name: file.name,
      status: 'waiting',
      progress: 0,
      originalUrl: originalUrl,
      processedBlob: null,     // Holds transparent background image blob
      finalBlob: null,         // Holds image with custom color background
      cardElement: null
    };

    state.queue.push(item);
    
    // Create UI Card element using card-ui fragment
    const card = createImageCard(item, {
      onDelete: removeItemFromQueue,
      onCompare: (itm) => openComparisonModal(itm, (compareItem) => {
        // Trigger countdown on single item download from compare modal
        startDownloadCountdown(() => downloadSingleItem(compareItem));
      }),
      onDownload: (itm) => {
        // Trigger countdown on single item download from card button
        startDownloadCountdown(() => downloadSingleItem(itm));
      }
    });
    
    resultsGrid.appendChild(card);
  });

  updateStats();
  processQueue();
}

// Queue Processing Loop
async function processQueue() {
  if (state.isProcessing) return;

  const nextItem = state.queue.find(item => item.status === 'waiting');
  if (!nextItem) {
    state.isProcessing = false;
    queueStatusBar.style.display = 'none';
    
    // Hide the processing ad block when done
    const adProcessing = document.getElementById('ad-processing-container');
    if (adProcessing) adProcessing.style.display = 'none';
    return;
  }

  state.isProcessing = true;
  queueStatusBar.style.display = 'flex';
  queueStatusText.textContent = state.modelLoadedOnce 
    ? `Procesando: ${nextItem.name}...` 
    : `Descargando modelo de IA (primera vez)...`;

  // Show the processing ad block and trigger reload/refresh
  const adProcessing = document.getElementById('ad-processing-container');
  if (adProcessing) {
    adProcessing.style.display = 'flex';
    try {
      if (window.adsbygoogle) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch(e) {}
  }

  // Process the background removal via processor fragment
  await processItem(nextItem, (item, message, percent, isFetching) => {
    if (isFetching) {
      queueStatusText.textContent = `Descargando modelo de IA: ${percent}%`;
    } else {
      queueStatusText.textContent = `Removiendo fondo de: ${item.name} (${percent}%)`;
    }
    updateCardProgress(item, message, percent);
  });

  // Update Card UI
  updateCardUI(nextItem, 'Error al procesar');

  state.isProcessing = false;
  updateStats();
  
  // Recursively process the rest of the queue
  processQueue();
}

function updateStats() {
  const total = state.queue.length;
  const processed = state.queue.filter(item => item.status === 'success' || item.status === 'error').length;
  const remaining = total - processed;

  statTotal.textContent = total;
  statProcessed.textContent = processed;
  statRemaining.textContent = remaining;

  // Toggle download ZIP button
  const hasSuccessful = state.queue.some(item => item.status === 'success');
  if (hasSuccessful) {
    btnDownloadZip.removeAttribute('disabled');
  } else {
    btnDownloadZip.setAttribute('disabled', 'true');
  }
}

function removeItemFromQueue(id) {
  const index = state.queue.findIndex(item => item.id === id);
  if (index === -1) return;

  const item = state.queue[index];
  
  // Revoke object URLs to clear memory
  if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
  
  // Remove element from DOM
  if (item.cardElement) {
    item.cardElement.remove();
  }

  state.queue.splice(index, 1);
  updateStats();

  // Hide the limit alert if we drop below 5 images
  if (state.queue.length < 5 && limitAlert) {
    limitAlert.style.display = 'none';
  }

  if (state.queue.length === 0) {
    resultsSection.style.display = 'none';
    samplesSection.style.display = 'block';
    btnDownloadZip.setAttribute('disabled', 'true');
    btnClearAll.setAttribute('disabled', 'true');
    
    // Make sure processing ad is hidden if empty
    const adProcessing = document.getElementById('ad-processing-container');
    if (adProcessing) adProcessing.style.display = 'none';
  }

  // If deleted the active processing item, restart loop
  if (item.status === 'processing') {
    state.isProcessing = false;
    processQueue();
  }
}

function clearAllQueue() {
  state.queue.forEach(item => {
    if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
  });

  state.queue = [];
  resultsGrid.innerHTML = '';
  resultsSection.style.display = 'none';
  samplesSection.style.display = 'block';
  state.isProcessing = false;
  queueStatusBar.style.display = 'none';

  // Ensure processing and limit ads/alerts are hidden
  const adProcessing = document.getElementById('ad-processing-container');
  if (adProcessing) adProcessing.style.display = 'none';
  if (limitAlert) limitAlert.style.display = 'none';

  updateStats();
  btnClearAll.setAttribute('disabled', 'true');
}
