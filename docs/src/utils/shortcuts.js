/**
 * Sets up global keyboard shortcuts.
 * @param {Object} actions - Map of key (lowercase) to callback function.
 */
export function setupShortcuts(actions) {
  document.addEventListener('keydown', (e) => {
    // Only handle keypresses if no input element is focused
    const activeElement = document.activeElement;
    const isInputFocused = activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.isContentEditable;

    // Skip if an input is focused or if Cmd/Ctrl/Alt keys are pressed
    // (but allow Shift modifier for potential alternative shortcuts)
    if (isInputFocused || e.metaKey || e.ctrlKey || e.altKey) {
      return;
    }

    const key = e.key.toLowerCase();

    // Always allow the '?' shortcut to open the dialog,
    // but check preference for all other single-key shortcuts.
    if (key !== '?' && localStorage.getItem('timebase-shortcuts-enabled') === 'false') {
      return;
    }

    if (actions[key]) {
      actions[key]();
    }
  });
}

/**
 * Sets up the shortcuts dialog behavior.
 * @param {string} dialogId - ID of the dialog element.
 * @param {string} closeBtnId - ID of the close button element.
 * @returns {Object} Object with a `show` method to open the dialog.
 */
export function setupShortcutsDialog(dialogId = 'shortcuts-dialog', closeBtnId = 'close-shortcuts') {
  const dialog = document.getElementById(dialogId);
  const closeBtn = document.getElementById(closeBtnId);
  const checkbox = document.getElementById('toggle-shortcuts-pref');
  let previousActiveElement = null;

  if (checkbox) {
    // Initialize checkbox state from localStorage (default to true/checked)
    const enabled = localStorage.getItem('timebase-shortcuts-enabled') !== 'false';
    checkbox.checked = enabled;

    // Listen for change events to persist state
    checkbox.addEventListener('change', () => {
      localStorage.setItem('timebase-shortcuts-enabled', checkbox.checked.toString());
    });
  }

  if (dialog && closeBtn) {
    // Add click event to close button
    closeBtn.addEventListener('click', () => {
      dialog.close();
    });

    // Close dialog when clicking on the backdrop (outside the dialog)
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        dialog.close();
      }
    });

    // Restore focus to the triggering element when the dialog closes
    dialog.addEventListener('close', () => {
      if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
        previousActiveElement.focus();
      }
    });
  }

  return {
    show: () => {
      if (dialog && !dialog.open) {
        previousActiveElement = document.activeElement;
        dialog.showModal();
      }
    }
  };
}
