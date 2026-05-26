// Managing wait timer and success page transition

let timerModal, countdownNumber, successScreen, bgRemoverTool, btnRestart, progressCircle;
let cooldownContainer, cooldownNumber, cooldownCircle;
let countdownInterval = null;
let cooldownInterval = null;

const DOWNLOAD_CIRCUMFERENCE = 2 * Math.PI * 52; // Radius 52, Circ ~326.7
const COOLDOWN_CIRCUMFERENCE = 2 * Math.PI * 34; // Radius 34, Circ ~213.6

export function initDownloadFlow(onRestart) {
  timerModal = document.getElementById('download-timer-modal');
  countdownNumber = document.getElementById('download-countdown-number');
  successScreen = document.getElementById('tool-success-screen');
  bgRemoverTool = document.getElementById('tool-bg-remover');
  btnRestart = document.getElementById('btn-success-restart');
  progressCircle = timerModal ? timerModal.querySelector('.timer-ring-progress') : null;

  cooldownContainer = document.getElementById('cooldown-timer-container');
  cooldownNumber = document.getElementById('cooldown-countdown-number');
  cooldownCircle = cooldownContainer ? cooldownContainer.querySelector('.cooldown-ring-progress') : null;

  if (progressCircle) {
    progressCircle.style.strokeDasharray = DOWNLOAD_CIRCUMFERENCE;
    progressCircle.style.strokeDashoffset = 0;
  }

  if (cooldownCircle) {
    cooldownCircle.style.strokeDasharray = COOLDOWN_CIRCUMFERENCE;
    cooldownCircle.style.strokeDashoffset = 0;
  }

  if (btnRestart) {
    btnRestart.addEventListener('click', () => {
      // Trigger the 10-second cooldown flow instead of immediately resetting
      startRestartCooldown(onRestart);
    });
  }
}

export function startDownloadCountdown(onDownloadTrigger) {
  if (!timerModal || !countdownNumber) {
    if (onDownloadTrigger) onDownloadTrigger();
    return;
  }

  if (countdownInterval) clearInterval(countdownInterval);

  let secondsLeft = 5;
  countdownNumber.textContent = secondsLeft;
  
  if (progressCircle) {
    progressCircle.style.strokeDashoffset = 0;
  }

  timerModal.classList.add('active');

  const startTime = Date.now();
  const duration = 5000; // 5s

  countdownInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, duration - elapsed);
    const progressSeconds = Math.ceil(remaining / 1000);

    countdownNumber.textContent = progressSeconds;

    if (progressCircle) {
      const offset = (elapsed / duration) * DOWNLOAD_CIRCUMFERENCE;
      progressCircle.style.strokeDashoffset = offset;
    }

    if (remaining <= 0) {
      clearInterval(countdownInterval);
      timerModal.classList.remove('active');
      
      if (onDownloadTrigger) onDownloadTrigger();
      showSuccessScreen();
    }
  }, 30);
}

function showSuccessScreen() {
  if (bgRemoverTool && successScreen) {
    bgRemoverTool.style.display = 'none';
    successScreen.style.display = 'flex';
    successScreen.scrollIntoView({ behavior: 'smooth' });

    // Refresh ads
    try {
      if (window.adsbygoogle) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (e) {
      console.warn('Error refreshing success screen ads:', e);
    }
  }
}

function startRestartCooldown(onCooldownFinish) {
  if (!cooldownContainer || !cooldownNumber) {
    // Fallback if elements not found
    resetToToolView();
    if (onCooldownFinish) onCooldownFinish();
    return;
  }

  if (cooldownInterval) clearInterval(cooldownInterval);

  // Hide the original success screen details
  const successCard = successScreen.querySelector('.success-card');
  const iconWrapper = successCard.querySelector('.success-icon-wrapper');
  const h2 = successCard.querySelector('h2');
  const p = successCard.querySelector('p'); // This matches the main description paragraph

  if (iconWrapper) iconWrapper.style.display = 'none';
  if (h2) h2.style.display = 'none';
  if (p) p.style.display = 'none';
  if (btnRestart) btnRestart.style.display = 'none';

  // Show cooldown container
  cooldownContainer.style.display = 'flex';
  cooldownNumber.textContent = 10;
  
  if (cooldownCircle) {
    cooldownCircle.style.strokeDashoffset = 0;
  }

  // Refresh cooldown ad
  try {
    if (window.adsbygoogle) {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    }
  } catch (e) {}

  const startTime = Date.now();
  const duration = 10000; // 10 seconds

  cooldownInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, duration - elapsed);
    const progressSeconds = Math.ceil(remaining / 1000);

    cooldownNumber.textContent = progressSeconds;

    if (cooldownCircle) {
      const offset = (elapsed / duration) * COOLDOWN_CIRCUMFERENCE;
      cooldownCircle.style.strokeDashoffset = offset;
    }

    if (remaining <= 0) {
      clearInterval(cooldownInterval);

      // Restore success screen original state for next downloads
      cooldownContainer.style.display = 'none';
      if (iconWrapper) iconWrapper.style.display = 'flex';
      if (h2) h2.style.display = 'block';
      if (p) p.style.display = 'block';
      if (btnRestart) btnRestart.style.display = 'inline-flex';

      // Go back to the workspace and clean the queue
      resetToToolView();
      if (onCooldownFinish) onCooldownFinish();
    }
  }, 30);
}

export function resetToToolView() {
  if (bgRemoverTool && successScreen) {
    successScreen.style.display = 'none';
    bgRemoverTool.style.display = 'flex';
    bgRemoverTool.scrollIntoView({ behavior: 'smooth' });
  }
}
