// DOM Card representation for processing items
export function createImageCard(item, { onDelete, onCompare, onDownload }) {
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
    if (onDelete) onDelete(item.id);
  });

  // Bind compare button
  card.querySelector('.btn-compare').addEventListener('click', (e) => {
    e.stopPropagation();
    if (onCompare) onCompare(item);
  });

  // Bind download buttons
  const dlCard = card.querySelector('.btn-download-card');
  const dlSingle = card.querySelector('.btn-download-single');
  [dlCard, dlSingle].forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (onDownload) onDownload(item);
    });
  });

  item.cardElement = card;
  return card;
}

// Update visual status cards progress
export function updateCardProgress(item, message, percent) {
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

// Update card components styles according to final state
export function updateCardUI(item, errorText = 'Error') {
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
