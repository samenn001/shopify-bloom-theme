'use strict';

// Requires constants.js (BUNDLE_FREEBIES) and pubsub.js to be loaded globally.
// This script runs only on pages that define window.BUNDLE_PRODUCT_ID (landing section).

(function () {
  if (typeof window === 'undefined') return;
  if (typeof BUNDLE_FREEBIES === 'undefined') return;
  if (!window.BUNDLE_PRODUCT_ID) return;

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
      if (String(item.product_id) === String(window.BUNDLE_PRODUCT_ID)) {
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

      // Determine gifts to add (missing)
      const toAdd = [];
      desired.forEach((variantId) => {
        if (!present.has(variantId)) {
          toAdd.push({
            id: variantId,
            quantity: 1,
            properties: { _free_gift: true, _bundle_qty: qty },
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
          if (!addResp.ok || addJson?.status) {
            // Fallback sequential adds
            for (const g of toAdd) {
              try {
                await fetch('/cart/add.js', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                  body: JSON.stringify(g),
                });
              } catch (e) {}
            }
          }
          // Notify UI to refresh
          try {
            const r = await fetch('/cart.js');
            const cartData = await r.json();
            publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-freebies', cartData: { cart: cartData } });
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

  // Initial check shortly after page load
  window.addEventListener('load', () => setTimeout(ensureFreebies, 800));
})();


