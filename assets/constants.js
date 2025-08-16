const ON_CHANGE_DEBOUNCE_TIMER = 300;

const PUB_SUB_EVENTS = {
  cartUpdate: 'cart-update',
  quantityUpdate: 'quantity-update',
  optionValueSelectionChange: 'option-value-selection-change',
  variantChange: 'variant-change',
  cartError: 'cart-error',
};

// Bundle freebies mapping (set your gift variant IDs here)
// Example: { 2: [11111111111], 3: [22222222222, 33333333333, 44444444444] }
// These variants should typically be $0 gift products and can be hidden from collections.
// They will be added with line-item properties to mark them as free gifts.
const BUNDLE_FREEBIES = {
  2: [51668228899153],
  3: [51668228931921, 51668228964689, 51668229030225],
}
