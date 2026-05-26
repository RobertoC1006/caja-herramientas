import { initBgRemover } from './tools/bg-remover/index.js';
import { refreshAds } from './core/ads.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded: Initializing CajaHerramientas AI components...');

  // 1. Privacy Policy Modal Events (Priority initialization)
  try {
    const btnPrivacy = document.getElementById('btn-privacy-policy');
    const privacyModal = document.getElementById('privacy-policy-modal');
    const btnPrivacyClose = document.getElementById('privacy-modal-close-btn');
    const privacyOverlay = document.getElementById('privacy-modal-overlay');
    const btnPrivacyAccept = document.getElementById('btn-privacy-accept');

    console.log('Privacy Modal elements status:', {
      btnPrivacy: !!btnPrivacy,
      privacyModal: !!privacyModal,
      btnPrivacyClose: !!btnPrivacyClose,
      privacyOverlay: !!privacyOverlay,
      btnPrivacyAccept: !!btnPrivacyAccept
    });

    if (btnPrivacy && privacyModal) {
      btnPrivacy.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Opening Privacy Modal');
        privacyModal.classList.add('active');
      });

      const closePrivacyModal = () => {
        console.log('Closing Privacy Modal');
        privacyModal.classList.remove('active');
      };

      [btnPrivacyClose, privacyOverlay, btnPrivacyAccept].forEach(btn => {
        if (btn) {
          btn.addEventListener('click', closePrivacyModal);
        }
      });
    } else {
      console.warn('Privacy modal elements not found in the DOM.');
    }
  } catch (err) {
    console.error('Error initializing Privacy Modal:', err);
  }

  // 2. Mobile Menu Toggling
  let appSidebar, sidebarOverlay;
  try {
    const btnMenuToggle = document.getElementById('btn-menu-toggle');
    appSidebar = document.getElementById('app-sidebar');
    sidebarOverlay = document.getElementById('sidebar-overlay');

    if (btnMenuToggle && appSidebar && sidebarOverlay) {
      btnMenuToggle.addEventListener('click', () => {
        appSidebar.classList.add('open');
        sidebarOverlay.classList.add('open');
      });

      sidebarOverlay.addEventListener('click', closeMobileSidebar);
    }

    const menuItems = document.querySelectorAll('.sidebar-menu-item');
    menuItems.forEach(item => {
      item.addEventListener('click', () => {
        closeMobileSidebar();
        refreshAds();
      });
    });
  } catch (err) {
    console.error('Error initializing Mobile Menu:', err);
  }

  function closeMobileSidebar() {
    if (appSidebar && sidebarOverlay) {
      appSidebar.classList.remove('open');
      sidebarOverlay.classList.remove('open');
    }
  }

  // 3. Initialize the background remover tool (Isolated to prevent failures from stopping other JS)
  try {
    console.log('Initializing Background Remover...');
    initBgRemover();
    console.log('Background Remover initialized successfully.');
  } catch (err) {
    console.error('Error during initBgRemover:', err);
  }
});

