// User Interaction and Event Handlers

const sampleUrls = {
  shoe: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
  plant: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800&q=80',
  coffee: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=80'
};

export function setupDragAndDrop(dropZone, fileInput, onFilesSelected) {
  if (!dropZone || !fileInput) return;

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
    if (onFilesSelected) onFilesSelected(files);
  });

  fileInput.addEventListener('change', (e) => {
    if (onFilesSelected) onFilesSelected(e.target.files);
  });

  // Clicking on drop zone triggers file input
  dropZone.addEventListener('click', (e) => {
    if (e.target !== fileInput && !e.target.closest('.browse-link')) {
      fileInput.click();
    }
  });
}

export function setupColorSelectors({
  colorOptionsContainer,
  customColorInput,
  customColorRadio,
  customColorPreview,
  onColorChanged
}) {
  if (!colorOptionsContainer) return;

  colorOptionsContainer.addEventListener('change', (e) => {
    if (e.target.name === 'bg-color') {
      if (onColorChanged) onColorChanged(e.target.value);
    }
  });

  // Handle custom color picker input
  customColorInput.addEventListener('input', (e) => {
    const newColor = e.target.value;
    customColorRadio.value = newColor;
    customColorRadio.checked = true;
    
    // Update preview color bubble style
    customColorPreview.style.background = newColor;
    customColorPreview.innerHTML = ''; // Remove the plus icon when a color is selected
    
    if (onColorChanged) onColorChanged(newColor);
  });

  // Clicking custom picker area checks its radio
  customColorPreview.addEventListener('click', () => {
    customColorInput.click();
  });
}

export function setupActionButtons({ btnDownloadZip, btnClearAll, onDownloadZip, onClearAll }) {
  if (btnDownloadZip) {
    btnDownloadZip.addEventListener('click', () => {
      if (onDownloadZip) onDownloadZip();
    });
  }
  if (btnClearAll) {
    btnClearAll.addEventListener('click', () => {
      if (onClearAll) onClearAll();
    });
  }
}

export function setupSampleButtons(onFilesSelected) {
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
        if (onFilesSelected) onFilesSelected([file]);
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
