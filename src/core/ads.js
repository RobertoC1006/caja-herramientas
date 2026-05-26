/**
 * Helper to handle dynamic Google AdSense refreshing in a Single Page App (SPA)
 */
export function refreshAds() {
  try {
    // If adsbygoogle is loaded on the page, request a push to reload the container
    if (window.adsbygoogle) {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      console.log('AdSense ad block refreshed successfully.');
    }
  } catch (err) {
    console.warn('Error refreshing AdSense ad blocks:', err);
  }
}
