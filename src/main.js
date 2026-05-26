import { initBgRemover } from './tools/bg-remover/index.js';
import { refreshAds } from './core/ads.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize the background remover tool
  initBgRemover();

  // Mobile Menu Toggling
  const btnMenuToggle = document.getElementById('btn-menu-toggle');
  const appSidebar = document.getElementById('app-sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');

  if (btnMenuToggle && appSidebar && sidebarOverlay) {
    btnMenuToggle.addEventListener('click', () => {
      appSidebar.classList.add('open');
      sidebarOverlay.classList.add('open');
    });

    sidebarOverlay.addEventListener('click', closeMobileSidebar);
  }

  // Also bind clicking the active/only menu item to close mobile sidebar
  const menuItems = document.querySelectorAll('.sidebar-menu-item');
  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      closeMobileSidebar();
      refreshAds();
    });
  });

  // Privacy Policy Modal Events
  const btnPrivacy = document.getElementById('btn-privacy-policy');
  const privacyModal = document.getElementById('privacy-policy-modal');
  const btnPrivacyClose = document.getElementById('privacy-modal-close-btn');
  const privacyOverlay = document.getElementById('privacy-modal-overlay');
  const btnPrivacyAccept = document.getElementById('btn-privacy-accept');

  if (btnPrivacy && privacyModal) {
    btnPrivacy.addEventListener('click', () => {
      privacyModal.classList.add('active');
    });

    const closePrivacyModal = () => {
      privacyModal.classList.remove('active');
    };

    [btnPrivacyClose, privacyOverlay, btnPrivacyAccept].forEach(btn => {
      if (btn) btn.addEventListener('click', closePrivacyModal);
    });
  }

  function closeMobileSidebar() {
    if (appSidebar && sidebarOverlay) {
      appSidebar.classList.remove('open');
      sidebarOverlay.classList.remove('open');
    }
  }
});
