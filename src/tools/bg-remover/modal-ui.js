// Modal Before/After Comparison Slider

let previewModal, modalOverlay, modalCloseBtn, modalFileName, modalBtnDownload;
let sliderImgOriginal, sliderImgProcessed, sliderHandle, sliderContainer;

let sliderWidth = 0;
let isDraggingSlider = false;

export function setupModalSlider() {
  previewModal = document.getElementById('preview-modal');
  modalOverlay = document.getElementById('modal-overlay');
  modalCloseBtn = document.getElementById('modal-close-btn');
  modalFileName = document.getElementById('modal-file-name');
  modalBtnDownload = document.getElementById('modal-btn-download');
  sliderImgOriginal = document.getElementById('slider-img-original');
  sliderImgProcessed = document.getElementById('slider-img-processed');
  sliderHandle = document.getElementById('slider-handle');
  sliderContainer = document.getElementById('comparison-slider-container');

  if (!sliderContainer) return;

  // Mouse down or Touch start triggers drag
  sliderContainer.addEventListener('mousedown', (e) => {
    isDraggingSlider = true;
    moveSlider(e);
  });
  window.addEventListener('mouseup', () => { isDraggingSlider = false; });
  
  sliderContainer.addEventListener('touchstart', (e) => {
    isDraggingSlider = true;
    if (e.touches.length > 0) {
      moveSlider(e.touches[0]);
    }
  });
  window.addEventListener('touchend', () => { isDraggingSlider = false; });

  // Move events
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

export function openComparisonModal(item, onDownload) {
  if (item.status !== 'success') return;

  modalFileName.textContent = item.name;
  
  // Set images for comparison
  sliderImgOriginal.style.backgroundImage = `url(${item.originalUrl})`;
  
  // Extract PNG data URL from card canvas
  const canvas = item.cardElement.querySelector('.card-canvas');
  const processedDataUrl = canvas.toDataURL('image/png');
  sliderImgProcessed.style.backgroundImage = `url(${processedDataUrl})`;

  // Bind the download button in modal
  modalBtnDownload.onclick = () => {
    if (onDownload) onDownload(item);
  };

  // Set slider to 50% split on open
  sliderImgProcessed.style.clipPath = 'polygon(0 0, 50% 0, 50% 100%, 0 100%)';
  sliderHandle.style.left = '50%';

  previewModal.classList.add('active');
  sliderWidth = sliderContainer.offsetWidth;

  // Refresh Google Adsense inside the modal
  try {
    if (window.adsbygoogle) {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    }
  } catch (e) {
    console.warn('Error refreshing comparison modal ad:', e);
  }
}

function moveSlider(e) {
  if (!isDraggingSlider || !sliderContainer) return;

  const rect = sliderContainer.getBoundingClientRect();
  const x = e.clientX - rect.left;
  
  let percentage = (x / rect.width) * 100;
  if (percentage < 0) percentage = 0;
  if (percentage > 100) percentage = 100;

  sliderImgProcessed.style.clipPath = `polygon(0 0, ${percentage}% 0, ${percentage}% 100%, 0 100%)`;
  sliderHandle.style.left = `${percentage}%`;
}

export function closeModal() {
  if (previewModal) {
    previewModal.classList.remove('active');
  }
  if (sliderImgOriginal && sliderImgProcessed) {
    sliderImgOriginal.style.backgroundImage = 'none';
    sliderImgProcessed.style.backgroundImage = 'none';
  }
}
