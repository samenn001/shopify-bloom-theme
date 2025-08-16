'use strict';

// Requires constants.js (BUNDLE_FREEBIES) and pubsub.js to be loaded globally.
// This script runs only on pages that define window.BUNDLE_PRODUCT_ID (landing section).

(function () {
  if (typeof window === 'undefined') return;
  if (typeof BUNDLE_FREEBIES === 'undefined') return;

  // Resolve product id from global hint or from product-info element
  function resolveProductId() {
    if (window.BUNDLE_PRODUCT_ID) return window.BUNDLE_PRODUCT_ID;
    const el = document.querySelector('product-info[data-product-id]');
    if (el && el.dataset && el.dataset.productId) return el.dataset.productId;
    return null;
  }

  let PRODUCT_ID = resolveProductId();
  if (!PRODUCT_ID) return;

  const DEBUG = /(^|[?&])debug_freebies=1(&|$)/.test(location.search);

  let syncInProgress = false;

  function getDesiredGiftsForQty(qty) {
    if (qty >= 3 && Array.isArray(BUNDLE_FREEBIES[3])) return BUNDLE_FREEBIES[3];
    if (qty >= 2 && Array.isArray(BUNDLE_FREEBIES[2])) return BUNDLE_FREEBIES[2];
    return [];
  }

  async function fetchCart() {
    const res = await fetch('/cart.js', { headers: { Accept: 'application/json' } });
    return res.json();
  }

  function computeBundleQty(cart) {
    let qty = 0;
    for (const item of cart.items || []) {
      if (String(item.product_id) === String(PRODUCT_ID)) {
        qty += item.quantity;
      }
    }
    return qty;
  }

  function currentGiftVariantIds(cart) {
    const ids = new Set();
    for (const item of cart.items || []) {
      const isGift = (item.properties && (item.properties._free_gift === true || item.properties._free_gift === 'true'))
        || (item.discount_allocations && item.discount_allocations.some(d => (d.title || '').toLowerCase().includes('gift')));
      // Also detect by exact variant id list
      const isConfiguredGift = BUNDLE_FREEBIES[2]?.includes(item.variant_id) || BUNDLE_FREEBIES[3]?.includes(item.variant_id);
      if (isGift || isConfiguredGift) ids.add(item.variant_id);
    }
    return ids;
  }

  async function ensureFreebies() {
    if (syncInProgress) return;
    syncInProgress = true;
    try {
      const cart = await fetchCart();
      const qty = computeBundleQty(cart);
      const desired = new Set(getDesiredGiftsForQty(qty).map((v) => Number(v)));
      const present = currentGiftVariantIds(cart);
      if (DEBUG) console.debug('[freebies] ensure', { PRODUCT_ID, qty, desired: Array.from(desired), present: Array.from(present) });

      // Determine gifts to add (missing)
      const toAdd = [];
      desired.forEach((variantId) => {
        if (!present.has(variantId)) {
          toAdd.push({
            id: variantId,
            quantity: 1,
            properties: { _free_gift: 'true', _bundle_qty: String(qty) },
          });
        }
      });

      if (toAdd.length > 0) {
        try {
          const addResp = await fetch('/cart/add.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ items: toAdd }),
          });
          const addJson = await addResp.json();
          if (DEBUG && !addResp.ok) console.debug('[freebies] bulk add failed', addResp.status, addJson);
          if (DEBUG) console.debug('[freebies] bulk add resp', addResp.status, addJson);
          if (!addResp.ok || addJson?.status) {
            // Fallback sequential adds
            for (const g of toAdd) {
              try {
                const resp = await fetch('/cart/add.js', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                  body: JSON.stringify(g),
                });
                const j = await resp.json();
                if (DEBUG && !resp.ok) console.debug('[freebies] single add failed', resp.status, j);
                if (DEBUG) console.debug('[freebies] single add ok', g.id);
              } catch (e) {}
            }
          }
          // Notify UI to refresh
          try {
            const r = await fetch('/cart.js');
            const cartData = await r.json();
            publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-freebies', cartData: { cart: cartData } });
            if (DEBUG) console.debug('[freebies] published cartUpdate');
          } catch (e) {}
        } catch (e) {}
      }
    } catch (e) {
      // ignore
    } finally {
      syncInProgress = false;
    }
  }

  // Run after add-to-cart updates
  try {
    subscribe(PUB_SUB_EVENTS.cartUpdate, () => ensureFreebies());
  } catch (e) {
    // pubsub missing; skip
  }

  // Initial check shortly after page load and when DOM changes (for async PDP loads)
  window.addEventListener('load', () => setTimeout(() => {
    PRODUCT_ID = resolveProductId() || PRODUCT_ID;
    if (PRODUCT_ID) ensureFreebies();
  }, 800));
  const mo = new MutationObserver(() => {
    const pid = resolveProductId();
    if (pid && pid !== PRODUCT_ID) {
      PRODUCT_ID = pid;
      ensureFreebies();
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  // Expose manual trigger in debug mode
  if (DEBUG) {
    window.forceAddGifts = ensureFreebies;
    console.debug('[freebies] debug mode: call window.forceAddGifts() to retry');
  }
})();


