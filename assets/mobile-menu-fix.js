// Complete Mobile Menu Overlay Fix
// This script completely overrides the default menu behavior to remove gray overlay

(function() {
  'use strict';
  
  // Wait for DOM to be ready
  function domReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }
  
  domReady(function() {
    console.log('Mobile menu fix initializing...');
    
    // Skip this script on bloom-climb-collection pages (shop page)
    if (document.body.classList.contains('bloom-climb-collection')) {
      console.log('Skipping mobile menu fix on shop page - has its own menu');
      return;
    }
    
    // Remove all backdrop elements
    function removeAllBackdrops() {
      // Remove any existing backdrop elements
      const backdrops = document.querySelectorAll('.menu-backdrop, .mobile-menu-backdrop, [class*="backdrop"]');
      backdrops.forEach(backdrop => {
        backdrop.style.display = 'none !important';
        backdrop.style.visibility = 'hidden !important';
        backdrop.style.opacity = '0 !important';
        backdrop.style.pointerEvents = 'none !important';
        backdrop.style.background = 'transparent !important';
        // Try to remove it completely
        try {
          backdrop.remove();
        } catch(e) {
          // If can't remove, at least hide it
          backdrop.style.cssText = 'display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; background: transparent !important; z-index: -9999 !important;';
        }
      });
    }
    
    // Override the HeaderDrawer behavior
    function overrideHeaderDrawer() {
      const headerDrawer = document.querySelector('header-drawer');
      if (!headerDrawer) return;
      
      const details = headerDrawer.querySelector('details');
      const summary = headerDrawer.querySelector('summary');
      const menuDrawer = headerDrawer.querySelector('#menu-drawer');
      
      if (!details || !summary) return;
      
      // Remove any pseudo-element styles by adding a class
      headerDrawer.classList.add('no-overlay');
      details.classList.add('no-overlay');
      
      // Override the click handler
      summary.removeEventListener('click', summary.onclick);
      summary.onclick = null;
      
      summary.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const isOpen = details.hasAttribute('open');
        
        if (isOpen) {
          // Close menu
          details.removeAttribute('open');
          details.classList.remove('menu-opening');
          document.body.classList.remove('overflow-hidden-tablet');
          document.body.classList.remove('overflow-hidden-desktop');
          document.body.style.overflow = '';
          document.body.style.position = '';
          if (menuDrawer) {
            menuDrawer.style.transform = 'translateX(-100%)';
            menuDrawer.style.visibility = 'hidden';
          }
          summary.setAttribute('aria-expanded', 'false');
        } else {
          // Open menu
          details.setAttribute('open', '');
          details.classList.add('menu-opening');
          document.body.style.overflow = 'hidden';
          if (menuDrawer) {
            menuDrawer.style.transform = 'translateX(0)';
            menuDrawer.style.visibility = 'visible';
          }
          summary.setAttribute('aria-expanded', 'true');
        }
        
        // Always remove backdrops after any action
        setTimeout(removeAllBackdrops, 0);
      });
      
      // Close menu when clicking links
      const menuLinks = headerDrawer.querySelectorAll('#menu-drawer a');
      menuLinks.forEach(link => {
        link.addEventListener('click', function() {
          details.removeAttribute('open');
          details.classList.remove('menu-opening');
          document.body.classList.remove('overflow-hidden-tablet');
          document.body.classList.remove('overflow-hidden-desktop');
          document.body.style.overflow = '';
          if (menuDrawer) {
            menuDrawer.style.transform = 'translateX(-100%)';
            menuDrawer.style.visibility = 'hidden';
          }
          summary.setAttribute('aria-expanded', 'false');
          removeAllBackdrops();
        });
      });
    }
    
    // Add CSS to force hide overlay
    function addOverrideStyles() {
      const style = document.createElement('style');
      style.textContent = `
        /* Force remove all overlays and backdrops */
        .menu-backdrop,
        .mobile-menu-backdrop,
        [class*="backdrop"],
        header-drawer .menu-backdrop,
        header-drawer::before,
        header-drawer::after,
        header-drawer details::before,
        header-drawer details::after,
        header-drawer summary::before,
        header-drawer summary::after,
        menu-drawer::before,
        menu-drawer::after,
        .menu-drawer-container::before,
        .menu-drawer-container::after,
        details[open] > summary::before,
        .js details[open] > summary::before,
        .js menu-drawer > details > summary::before,
        .js menu-drawer > details[open]:not(.menu-opening) > summary::before,
        menu-drawer > details[open] > summary::before {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
          background: transparent !important;
          z-index: -9999 !important;
          content: none !important;
        }
        
        /* Ensure menu drawer is visible and accessible */
        #menu-drawer {
          z-index: 9999 !important;
        }
        
        /* Remove overflow hidden that might cause issues */
        @media (max-width: 989px) {
          body.overflow-hidden-tablet {
            overflow: hidden !important;
            position: relative !important; /* Not fixed to avoid issues */
          }
        }
        
        /* Make sure the menu is on top */
        header-drawer details[open] #menu-drawer {
          z-index: 10000 !important;
        }
      `;
      document.head.appendChild(style);
    }
    
    // Monitor for any new backdrop elements
    function watchForBackdrops() {
      const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.type === 'childList') {
            removeAllBackdrops();
          }
          if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
            const target = mutation.target;
            if (target.classList && (target.classList.contains('menu-backdrop') || 
                target.className.includes('backdrop'))) {
              target.style.display = 'none !important';
              target.style.visibility = 'hidden !important';
              target.style.opacity = '0 !important';
            }
          }
        });
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    }
    
    // Execute all fixes
    addOverrideStyles();
    removeAllBackdrops();
    overrideHeaderDrawer();
    watchForBackdrops();
    
    // Re-run fixes after a delay to catch any late-loading elements
    setTimeout(function() {
      removeAllBackdrops();
      overrideHeaderDrawer();
    }, 500);
    
    setTimeout(function() {
      removeAllBackdrops();
      overrideHeaderDrawer();
    }, 1000);
    
    // Also run on window load
    window.addEventListener('load', function() {
      removeAllBackdrops();
      overrideHeaderDrawer();
    });
    
    console.log('Mobile menu fix applied successfully');
  });
})();