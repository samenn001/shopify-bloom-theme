if (!customElements.get('product-form')) {
  customElements.define(
    'product-form',
    class ProductForm extends HTMLElement {
      constructor() {
        super();

        this.form = this.querySelector('form');
        const variantField = this.variantIdInput;
        if (variantField) {
          variantField.disabled = false;
        }
        this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
        this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        this.submitButton = this.querySelector('[type="submit"]');
        this.submitButtonText = this.submitButton.querySelector('span');

        if (document.querySelector('cart-drawer')) this.submitButton.setAttribute('aria-haspopup', 'dialog');

        this.hideErrors = this.dataset.hideErrors === 'true';
      }

      onSubmitHandler(evt) {
        evt.preventDefault();
        if (this.submitButton.getAttribute('aria-disabled') === 'true') return;

        this.handleErrorMessage();

        this.submitButton.setAttribute('aria-disabled', true);
        this.submitButton.classList.add('loading');
        const spinnerEl = this.querySelector('.loading__spinner') || this.querySelector('.loading-overlay__spinner');
        if (spinnerEl) spinnerEl.classList.remove('hidden');

        const config = fetchConfig('javascript');
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        delete config.headers['Content-Type'];

        const formData = new FormData(this.form);
        
        // Debug: Log what's being submitted
        console.log('Form submission data:', {
          variantId: formData.get('id'),
          quantity: formData.get('quantity'),
          formElement: this.form,
          quantityInputs: document.querySelectorAll('input[name="quantity"]')
        });
        if (this.cart) {
          formData.append(
            'sections',
            this.cart.getSectionsToRender().map((section) => section.id)
          );
          formData.append('sections_url', window.location.pathname);
          this.cart.setActiveElement(document.activeElement);
        }
        config.body = formData;

        fetch(`${routes.cart_add_url}`, config)
          .then((response) => response.json())
          .then((response) => {
            if (response.status) {
              publish(PUB_SUB_EVENTS.cartError, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                errors: response.errors || response.description,
                message: response.message,
              });
              this.handleErrorMessage(response.description);

              const soldOutMessage = this.submitButton.querySelector('.sold-out-message');
              if (!soldOutMessage) return;
              this.submitButton.setAttribute('aria-disabled', true);
              this.submitButtonText.classList.add('hidden');
              soldOutMessage.classList.remove('hidden');
              this.error = true;
              return;
            } else if (!this.cart) {
              window.location = window.routes.cart_url;
              return;
            }

            const startMarker = CartPerformance.createStartingMarker('add:wait-for-subscribers');
            if (!this.error)
              publish(PUB_SUB_EVENTS.cartUpdate, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                cartData: response,
              }).then(() => {
                CartPerformance.measureFromMarker('add:wait-for-subscribers', startMarker);
              });
            this.error = false;

            // If a bundle quantity greater than 1 is selected, add configured freebies automatically
            try {
              // Try multiple ways to find the quantity input
              let quantityInput = this.form.querySelector('input[name="quantity"]');
              if (!quantityInput) {
                // Try to find by ID pattern
                const sectionElement = this.closest('[data-section]');
                const sectionId = sectionElement ? sectionElement.dataset.section : null;
                if (sectionId) {
                  quantityInput = document.querySelector('input#quantity-input-' + sectionId);
                }
              }
              if (!quantityInput) {
                // Fallback: find any quantity input on the page
                quantityInput = document.querySelector('input[name="quantity"]');
              }
              
              // Prefer selected bundle radio value if present
              let bundleQty = 1;
              const selectedBundleRadio = document.querySelector('.bundle-radio:checked');
              if (selectedBundleRadio) {
                bundleQty = parseInt(selectedBundleRadio.value || '1', 10);
              } else {
                bundleQty = quantityInput ? parseInt(quantityInput.value || '1', 10) : 1;
              }
              console.log('Bundle gift check:', {
                bundleQty: bundleQty,
                inputFound: !!quantityInput,
                inputValue: quantityInput?.value,
                bundleFreebiesDefined: typeof BUNDLE_FREEBIES !== 'undefined',
                bundleFreebiesContent: typeof BUNDLE_FREEBIES !== 'undefined' ? BUNDLE_FREEBIES : 'not defined',
                giftsForThisQty: typeof BUNDLE_FREEBIES !== 'undefined' ? BUNDLE_FREEBIES[bundleQty] : 'N/A'
              });
              
              if (bundleQty > 1 && typeof BUNDLE_FREEBIES !== 'undefined' && BUNDLE_FREEBIES[bundleQty]?.length) {
                console.log('Adding freebies for bundle qty', bundleQty, ':', BUNDLE_FREEBIES[bundleQty]);
                const gifts = BUNDLE_FREEBIES[bundleQty].map((variantId) => ({
                  id: variantId,
                  quantity: 1,
                  properties: {
                    _free_gift: true,
                    _bundle_qty: bundleQty
                  }
                }));

                const refreshCartUI = () => {
                  if (!this.cart) return;
                  fetch('/cart.js')
                    .then((r) => r.json())
                    .then((cartData) => {
                      publish(PUB_SUB_EVENTS.cartUpdate, {
                        source: 'product-form-gifts',
                        cartData: { cart: cartData }
                      });
                    })
                    .catch(() => {});
                };

                // Add with a small delay to ensure main product adds first, try bulk first then fall back to sequential
                setTimeout(() => {
                  (async () => {
                    try {
                      const bulkResp = await fetch('/cart/add.js', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                        body: JSON.stringify({ items: gifts })
                      });
                      const bulkJson = await bulkResp.json();
                      if (!bulkResp.ok || bulkJson?.status) {
                        throw new Error(bulkJson?.message || bulkJson?.description || 'Bulk freebies add failed');
                      }
                      console.log('Freebies added (bulk):', bulkJson);
                      refreshCartUI();
                      return;
                    } catch (bulkError) {
                      console.warn('Bulk freebies add failed, falling back to sequential', bulkError);
                    }

                    // Fallback: add each gift one by one
                    for (const gift of gifts) {
                      try {
                        const resp = await fetch('/cart/add.js', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                          body: JSON.stringify(gift)
                        });
                        const json = await resp.json();
                        if (!resp.ok || json?.status) {
                          console.error('Failed to add free gift variant', gift.id, json);
                        } else {
                          console.log('Free gift added (single):', gift.id);
                        }
                      } catch (e) {
                        console.error('Error adding free gift variant', gift.id, e);
                      }
                    }
                    refreshCartUI();
                  })();
                }, 500);
              }
            } catch(e) { 
              console.error('Free gift add failed', e); 
            }
            const quickAddModal = this.closest('quick-add-modal');
            if (quickAddModal) {
              document.body.addEventListener(
                'modalClosed',
                () => {
                  setTimeout(() => {
                    CartPerformance.measure("add:paint-updated-sections", () => {
                      this.cart.renderContents(response);
                    });
                  });
                },
                { once: true }
              );
              quickAddModal.hide(true);
            } else {
              CartPerformance.measure("add:paint-updated-sections", () => {
                this.cart.renderContents(response);
              });
            }
          })
          .catch((e) => {
            console.error(e);
          })
          .finally(() => {
            this.submitButton.classList.remove('loading');
            if (this.cart && this.cart.classList.contains('is-empty')) this.cart.classList.remove('is-empty');
            if (!this.error) this.submitButton.removeAttribute('aria-disabled');
            const endSpinnerEl = this.querySelector('.loading__spinner') || this.querySelector('.loading-overlay__spinner');
            if (endSpinnerEl) endSpinnerEl.classList.add('hidden');

            CartPerformance.measureFromEvent("add:user-action", evt);
          });
      }

      handleErrorMessage(errorMessage = false) {
        if (this.hideErrors) return;

        this.errorMessageWrapper =
          this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
        if (!this.errorMessageWrapper) return;
        this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');

        this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

        if (errorMessage) {
          this.errorMessage.textContent = errorMessage;
        }
      }

      toggleSubmitButton(disable = true, text) {
        if (disable) {
          this.submitButton.setAttribute('disabled', 'disabled');
          if (text) this.submitButtonText.textContent = text;
        } else {
          this.submitButton.removeAttribute('disabled');
          this.submitButtonText.textContent = window.variantStrings.addToCart;
        }
      }

      get variantIdInput() {
        return this.form.querySelector('[name=id]');
      }
    }
  );
}
