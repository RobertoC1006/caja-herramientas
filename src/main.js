import { initBgRemover } from './tools/bg-remover/index.js';
import { refreshAds } from './core/ads.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded: Initializing CajaHerramientas AI components...');

  // 1. Legal Policy Modal Events (Priority initialization)
  try {
    const btnLegal = document.getElementById('btn-legal-trigger');
    const legalModal = document.getElementById('legal-modal');
    const btnLegalClose = document.getElementById('legal-close-btn');
    const legalOverlay = document.getElementById('legal-overlay');
    const btnLegalAccept = document.getElementById('btn-legal-accept');

    if (btnLegal && legalModal) {
      btnLegal.addEventListener('click', (e) => {
        e.preventDefault();
        legalModal.classList.add('active');
      });

      const closeLegalModal = () => {
        legalModal.classList.remove('active');
      };

      [btnLegalClose, legalOverlay, btnLegalAccept].forEach(btn => {
        if (btn) {
          btn.addEventListener('click', closeLegalModal);
        }
      });
    } else {
      console.warn('Legal modal elements not found in the DOM.');
    }
  } catch (err) {
    console.error('Error initializing Legal Modal:', err);
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

