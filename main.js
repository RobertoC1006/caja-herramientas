import { removeBackground } from '@imgly/background-removal';
import JSZip from 'jszip';

// Application State
let queue = [];
let isProcessing = false;
let globalBgColor = '#ffffff'; // White by default

// Cache active model references/flags
let modelLoadedOnce = false;

// DOM Elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const resultsSection = document.getElementById('results-section');
const resultsGrid = document.getElementById('results-grid');
const samplesSection = document.getElementById('samples-section');
const queueStatusText = document.getElementById('queue-status-text');
const queueStatusBar = document.getElementById('queue-status-bar');

// Stats Elements
const statTotal = document.getElementById('stat-total');
const statProcessed = document.getElementById('stat-processed');
const statRemaining = document.getElementById('stat-remaining');

// Button Elements
const btnDownloadZip = document.getElementById('btn-download-zip');
const btnClearAll = document.getElementById('btn-clear-all');

// Color Picker Elements
const colorOptionsContainer = document.getElementById('color-options-container');
const customColorInput = document.getElementById('custom-color-input');
const customColorRadio = document.getElementById('radio-custom-color');
const customColorPreview = document.getElementById('custom-color-preview');

// Modal Slider Elements
const previewModal = document.getElementById('preview-modal');
const modalOverlay = document.getElementById('modal-overlay');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalFileName = document.getElementById('modal-file-name');
const modalBtnDownload = document.getElementById('modal-btn-download');
const sliderImgOriginal = document.getElementById('slider-img-original');
const sliderImgProcessed = document.getElementById('slider-img-processed');
const sliderHandle = document.getElementById('slider-handle');
const sliderContainer = document.getElementById('comparison-slider-container');

// Sample Images Mapping
const sampleUrls = {
  shoe: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
  plant: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800&q=80',
  coffee: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=80'
};

/* --- 1. Initialization and Event Listeners --- */

function init() {
  setupDragAndDrop();
  setupColorSelectors();
  setupActionButtons();
  setupModalSlider();
  setupSampleButtons();
}

// Drag & Drop event bindings
function setupDragAndDrop() {
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.add('drop-zone-active');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.remove('drop-zone-active');
    }, false);
  });

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleUploadedFiles(files);
  });

  fileInput.addEventListener('change', (e) => {
    handleUploadedFiles(e.target.files);
  });

  // Clicking on drop zone triggers file input
  dropZone.addEventListener('click', (e) => {
    if (e.target !== fileInput && !e.target.closest('.browse-link')) {
      fileInput.click();
    }
  });
}

// Color option control bindings
function setupColorSelectors() {
  colorOptionsContainer.addEventListener('change', (e) => {
    if (e.target.name === 'bg-color') {
      globalBgColor = e.target.value;
      updateAllProcessedBackgrounds();
    }
  });

  // Handle custom color picker input
  customColorInput.addEventListener('input', (e) => {
    const newColor = e.target.value;
    customColorRadio.value = newColor;
    customColorRadio.checked = true;
    globalBgColor = newColor;
    
    // Update preview color bubble style
    customColorPreview.style.background = newColor;
    customColorPreview.innerHTML = ''; // Remove the plus icon when a color is selected
    
    updateAllProcessedBackgrounds();
  });

  // Clicking custom picker area checks its radio
  customColorPreview.addEventListener('click', () => {
    customColorInput.click();
  });
}

// Action button bindings
function setupActionButtons() {
  btnDownloadZip.addEventListener('click', downloadBatchAsZip);
  btnClearAll.addEventListener('click', clearAllQueue);
}

// Setup sample buttons
function setupSampleButtons() {
  document.querySelectorAll('.sample-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const type = btn.dataset.sample;
      const url = sampleUrls[type];
      if (!url) return;

      btn.style.opacity = '0.5';
      btn.style.pointerEvents = 'none';

      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const file = new File([blob], `ejemplo-${type}.jpg`, { type: 'image/jpeg' });
        handleUploadedFiles([file]);
      } catch (err) {
        console.error('Error cargando imagen de muestra:', err);
        alert('No se pudo cargar la imagen de ejemplo. Verifica tu conexión.');
      } finally {
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
      }
    });
  });
}

/* --- 2. File Queuing & Processing --- */

function handleUploadedFiles(fileList) {
  const imageFiles = Array.from(fileList).filter(file => file.type.startsWith('image/'));
  
  if (imageFiles.length === 0) return;

  // Show results grid, hide sample suggestions if needed
  resultsSection.style.display = 'block';
  samplesSection.style.display = 'none';
  btnClearAll.removeAttribute('disabled');

  imageFiles.forEach(file => {
    const originalUrl = URL.createObjectURL(file);
    const item = {
      id: 'img-' + Math.random().toString(36).substr(2, 9),
      file: file,
      name: file.name,
      status: 'waiting',
      progress: 0,
      originalUrl: originalUrl,
      processedBlob: null,     // Will hold the transparent background image blob
      finalBlob: null,         // Will hold the image with the custom background
      cardElement: null
    };

    queue.push(item);
    createImageCard(item);
  });

  updateStats();
  processQueue();
}

function createImageCard(item) {
  const card = document.createElement('div');
  card.className = 'image-card';
  card.id = item.id;

  card.innerHTML = `
    <div class="card-preview-area">
      <button class="btn-icon btn-icon-delete" title="Quitar de la lista">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
      
      <!-- Card Image elements -->
      <img src="${item.originalUrl}" alt="Original" class="card-original-preview">
      <canvas class="card-canvas transparent-checker"></canvas>
      
      <!-- Hover action buttons (hidden initially) -->
      <div class="card-hover-actions">
        <button class="btn-icon btn-compare" title="Comparar antes/después" disabled>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 3h5v5M8 21H3v-5M12 2v20M2 12h20" />
          </svg>
        </button>
        <button class="btn-icon btn-download-card" title="Descargar" disabled>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
        </button>
      </div>

      <!-- Overlay for waiting/processing status -->
      <div class="card-overlay">
        <div class="spinner"></div>
        <div class="overlay-status-title">En espera...</div>
        <div class="overlay-progress-bar-container">
          <div class="overlay-progress-bar"></div>
        </div>
        <div class="overlay-progress-val">0%</div>
      </div>
    </div>

    <div class="card-info">
      <div class="card-title" title="${item.name}">${item.name}</div>
      <div class="card-actions-bar">
        <span class="badge-status status-waiting">Espera</span>
        <button class="btn btn-secondary btn-download-single" disabled>Descargar</button>
      </div>
    </div>
  `;

  // Bind individual delete button
  card.querySelector('.btn-icon-delete').addEventListener('click', (e) => {
    e.stopPropagation();
    removeItemFromQueue(item.id);
  });

  // Bind compare button
  card.querySelector('.btn-compare').addEventListener('click', (e) => {
    e.stopPropagation();
    openComparisonModal(item);
  });

  // Bind download buttons
  const dlCard = card.querySelector('.btn-download-card');
  const dlSingle = card.querySelector('.btn-download-single');
  [dlCard, dlSingle].forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      downloadSingleItem(item);
    });
  });

  resultsGrid.appendChild(card);
  item.cardElement = card;
}

// Stats counter updater
function updateStats() {
  const total = queue.length;
  const processed = queue.filter(item => item.status === 'success' || item.status === 'error').length;
  const remaining = total - processed;

  statTotal.textContent = total;
  statProcessed.textContent = processed;
  statRemaining.textContent = remaining;

  // Toggle download ZIP button
  const hasSuccessful = queue.some(item => item.status === 'success');
  if (hasSuccessful) {
    btnDownloadZip.removeAttribute('disabled');
  } else {
    btnDownloadZip.setAttribute('disabled', 'true');
  }
}

// Queue Controller
async function processQueue() {
  if (isProcessing) return;

  const nextItem = queue.find(item => item.status === 'waiting');
  if (!nextItem) {
    isProcessing = false;
    queueStatusBar.style.display = 'none';
    return;
  }

  isProcessing = true;
  queueStatusBar.style.display = 'flex';
  queueStatusText.textContent = modelLoadedOnce 
    ? `Procesando: ${nextItem.name}...` 
    : `Descargando modelo de IA (primera vez)...`;

  await processItem(nextItem);

  isProcessing = false;
  updateStats();
  
  // Recursively process the rest of the queue
  processQueue();
}

// Perform Background Removal on a single item
async function processItem(item) {
  item.status = 'processing';
  updateCardUI(item);

  try {
    const config = {
      model: 'large', // Cambiado a 'medium' para descarga y procesamiento mucho más rápidos
      progress: (key, current, total) => {
        const percent = Math.round((current / total) * 100);
        item.progress = percent;
        
        let statusMsg = 'Procesando...';
        if (key.includes('fetch')) {
          statusMsg = 'Cargando IA...';
          queueStatusText.textContent = `Descargando modelo de IA: ${percent}%`;
        } else if (key.includes('compute')) {
          statusMsg = 'Cortando silueta...';
          queueStatusText.textContent = `Removiendo fondo de: ${item.name} (${percent}%)`;
          modelLoadedOnce = true;
        }
        
        updateCardProgress(item, statusMsg, percent);
      }
    };

    // Trigger AI background removal
    const resultBlob = await removeBackground(item.file, config);
    item.processedBlob = resultBlob;
    item.status = 'success';
    
    // Draw the image onto our custom colored canvas
    await applyBackgroundColorToItem(item);
    
    // Complete Card UI styling
    updateCardUI(item);

  } catch (err) {
    console.error(`Error procesando archivo ${item.name}:`, err);
    item.status = 'error';
    updateCardUI(item, 'Error al procesar');
  }
}

/* --- 3. UI Update Helpers --- */

// Update visual status cards
function updateCardProgress(item, message, percent) {
  const card = item.cardElement;
  if (!card) return;

  const overlay = card.querySelector('.card-overlay');
  const msgLabel = overlay.querySelector('.overlay-status-title');
  const progressBar = overlay.querySelector('.overlay-progress-bar');
  const progressVal = overlay.querySelector('.overlay-progress-val');

  msgLabel.textContent = message;
  progressBar.style.width = `${percent}%`;
  progressVal.textContent = `${percent}%`;
}

function updateCardUI(item, errorText = 'Error') {
  const card = item.cardElement;
  if (!card) return;

  const overlay = card.querySelector('.card-overlay');
  const badge = card.querySelector('.badge-status');
  const originalPreview = card.querySelector('.card-original-preview');
  const resultCanvas = card.querySelector('.card-canvas');
  
  // Hover buttons & single download btn
  const btnCompare = card.querySelector('.btn-compare');
  const btnDownloadCard = card.querySelector('.btn-download-card');
  const btnDownloadSingle = card.querySelector('.btn-download-single');

  if (item.status === 'processing') {
    badge.className = 'badge-status status-processing';
    badge.textContent = 'Procesando';
    overlay.style.display = 'flex';
  } else if (item.status === 'success') {
    badge.className = 'badge-status status-success';
    badge.textContent = 'Completado';
    overlay.style.display = 'none';
    
    // Switch preview elements
    originalPreview.style.display = 'none';
    resultCanvas.style.display = 'block';

    // Enable interaction buttons
    btnCompare.removeAttribute('disabled');
    btnDownloadCard.removeAttribute('disabled');
    btnDownloadSingle.removeAttribute('disabled');
    btnDownloadSingle.className = 'btn btn-primary btn-download-single';
  } else if (item.status === 'error') {
    badge.className = 'badge-status status-error';
    badge.textContent = 'Error';
    
    overlay.querySelector('.spinner').style.display = 'none';
    overlay.querySelector('.overlay-status-title').textContent = errorText;
    overlay.querySelector('.overlay-status-title').style.color = 'var(--color-error)';
    overlay.querySelector('.overlay-progress-bar-container').style.display = 'none';
    overlay.querySelector('.overlay-progress-val').style.display = 'none';
  }
}

// Removes a single item from the batch
function removeItemFromQueue(id) {
  const index = queue.findIndex(item => item.id === id);
  if (index === -1) return;

  const item = queue[index];
  
  // Revoke object URLs to clear memory
  if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
  
  // Remove element from DOM
  if (item.cardElement) {
    item.cardElement.remove();
  }

  queue.splice(index, 1);
  updateStats();

  if (queue.length === 0) {
    resultsSection.style.display = 'none';
    samplesSection.style.display = 'block';
    btnDownloadZip.setAttribute('disabled', 'true');
    btnClearAll.setAttribute('disabled', 'true');
  }

  // If we deleted the active processing item, we restart processing
  if (item.status === 'processing') {
    isProcessing = false;
    processQueue();
  }
}

// Clear entire grid & queue
function clearAllQueue() {
  queue.forEach(item => {
    if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
  });

  queue = [];
  resultsGrid.innerHTML = '';
  resultsSection.style.display = 'none';
  samplesSection.style.display = 'block';
  isProcessing = false;
  queueStatusBar.style.display = 'none';

  updateStats();
  btnClearAll.setAttribute('disabled', 'true');
}

/* --- 4. Background Rendering Canvas Operations --- */

// Re-renders a completed item canvas with the target background color
function applyBackgroundColorToItem(item) {
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
      if (globalBgColor !== 'transparent') {
        ctx.fillStyle = globalBgColor;
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
async function updateAllProcessedBackgrounds() {
  const completedItems = queue.filter(item => item.status === 'success');
  
  for (const item of completedItems) {
    await applyBackgroundColorToItem(item);
  }
}

/* --- 5. Downloader Engines --- */

// Triggers a click download on a Blob file
function triggerFileDownload(blob, filename) {
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
function downloadSingleItem(item) {
  if (item.status !== 'success' || !item.finalBlob) return;
  
  // Format original name for export (replace extension with png)
  let baseName = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
  let bgSuffix = globalBgColor === 'transparent' ? 'transparente' : 'fondocolor';
  if (globalBgColor === '#ffffff') bgSuffix = 'fondoblanco';
  
  const outputName = `${baseName}_${bgSuffix}.png`;
  triggerFileDownload(item.finalBlob, outputName);
}

// Zip compressing and exporting batch
async function downloadBatchAsZip() {
  const completedItems = queue.filter(item => item.status === 'success');
  if (completedItems.length === 0) return;

  btnDownloadZip.setAttribute('disabled', 'true');
  const originalText = btnDownloadZip.innerHTML;
  btnDownloadZip.innerHTML = `
    <div class="spinner" style="width: 18px; height: 18px; display: inline-block;"></div>
    Comprimiendo ZIP...
  `;

  try {
    const zip = new JSZip();
    
    // Add completed files to ZIP
    completedItems.forEach((item, index) => {
      let baseName = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
      let bgSuffix = globalBgColor === 'transparent' ? 'transparente' : 'fondocolor';
      if (globalBgColor === '#ffffff') bgSuffix = 'fondoblanco';
      
      const fileName = `${baseName}_${bgSuffix}_${index + 1}.png`;
      zip.file(fileName, item.finalBlob);
    });

    const contentBlob = await zip.generateAsync({ type: 'blob' });
    triggerFileDownload(contentBlob, 'FondoBlanco_AI_Lote.zip');

  } catch (err) {
    console.error('Error generando archivo ZIP:', err);
    alert('Ocurrió un error al empaquetar el archivo ZIP.');
  } finally {
    btnDownloadZip.removeAttribute('disabled');
    btnDownloadZip.innerHTML = originalText;
  }
}

/* --- 6. Before/After Comparison Slider --- */

let sliderWidth = 0;
let isDraggingSlider = false;

function setupModalSlider() {
  // Activa el arrastre al presionar en cualquier parte del contenedor de la imagen
  sliderContainer.addEventListener('mousedown', (e) => {
    isDraggingSlider = true;
    moveSlider(e);
  });
  window.addEventListener('mouseup', () => { isDraggingSlider = false; });
  
  // Soporte táctil en todo el contenedor
  sliderContainer.addEventListener('touchstart', (e) => {
    isDraggingSlider = true;
    if (e.touches.length > 0) {
      moveSlider(e.touches[0]);
    }
  });
  window.addEventListener('touchend', () => { isDraggingSlider = false; });

  // Eventos de movimiento
  window.addEventListener('mousemove', moveSlider);
  window.addEventListener('touchmove', (e) => {
    if (isDraggingSlider && e.touches.length > 0) {
      moveSlider(e.touches[0]);
    }
  });

  // Modal closing binds
  modalOverlay.addEventListener('click', closeModal);
  modalCloseBtn.addEventListener('click', closeModal);
}

function openComparisonModal(item) {
  if (item.status !== 'success') return;

  modalFileName.textContent = item.name;
  
  // Set images for comparison
  sliderImgOriginal.style.backgroundImage = `url(${item.originalUrl})`;
  
  // For the processed slide, extract the PNG from canvas
  const canvas = item.cardElement.querySelector('.card-canvas');
  const processedDataUrl = canvas.toDataURL('image/png');
  sliderImgProcessed.style.backgroundImage = `url(${processedDataUrl})`;

  // Bind the download button in modal to this specific item
  modalBtnDownload.onclick = () => downloadSingleItem(item);

  // Set slider to 50% split on open
  sliderImgProcessed.style.clipPath = 'polygon(0 0, 50% 0, 50% 100%, 0 100%)';
  sliderHandle.style.left = '50%';

  previewModal.classList.add('active');
  sliderWidth = sliderContainer.offsetWidth;
}

function moveSlider(e) {
  if (!isDraggingSlider) return;

  // Get coordinates relative to comparison container
  const rect = sliderContainer.getBoundingClientRect();
  const x = e.clientX - rect.left;
  
  // Clamp values inside limits
  let percentage = (x / rect.width) * 100;
  if (percentage < 0) percentage = 0;
  if (percentage > 100) percentage = 100;

  // Apply clip-path and reposition vertical bar
  sliderImgProcessed.style.clipPath = `polygon(0 0, ${percentage}% 0, ${percentage}% 100%, 0 100%)`;
  sliderHandle.style.left = `${percentage}%`;
}

function closeModal() {
  previewModal.classList.remove('active');
  
  // Clear modal assets to free up memory
  sliderImgOriginal.style.backgroundImage = 'none';
  sliderImgProcessed.style.backgroundImage = 'none';
}

// Launch application on load
window.addEventListener('DOMContentLoaded', init);
