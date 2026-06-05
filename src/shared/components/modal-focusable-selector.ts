// Tabbable elements inside the modal — used by the focus trap. Disabled form
// controls can't receive focus, so they're excluded to keep the trap accurate.
const modalFocusableSelector =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export default modalFocusableSelector;
