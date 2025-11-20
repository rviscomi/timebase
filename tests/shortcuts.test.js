import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setupShortcuts, setupShortcutsDialog } from '../src/shortcuts.js';

describe('Shortcuts Module', () => {
  describe('setupShortcuts', () => {
    let actions;

    beforeEach(() => {
      actions = {
        'a': vi.fn(),
        'b': vi.fn(),
        '?': vi.fn()
      };
      setupShortcuts(actions);
    });

    afterEach(() => {
      document.body.innerHTML = '';
      vi.restoreAllMocks();
    });

    it('should trigger action when key is pressed', () => {
      const event = new KeyboardEvent('keydown', { key: 'a' });
      document.dispatchEvent(event);
      expect(actions['a']).toHaveBeenCalled();
    });

    it('should not trigger action when input is focused', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      const event = new KeyboardEvent('keydown', { key: 'a' });
      document.dispatchEvent(event);
      expect(actions['a']).not.toHaveBeenCalled();
    });

    it('should not trigger action when textarea is focused', () => {
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.focus();

      const event = new KeyboardEvent('keydown', { key: 'a' });
      document.dispatchEvent(event);
      expect(actions['a']).not.toHaveBeenCalled();
    });

    it('should not trigger action when modifier keys are pressed', () => {
      const event = new KeyboardEvent('keydown', { key: 'a', ctrlKey: true });
      document.dispatchEvent(event);
      expect(actions['a']).not.toHaveBeenCalled();
    });

    it('should handle special keys like ?', () => {
      const event = new KeyboardEvent('keydown', { key: '?' });
      document.dispatchEvent(event);
      expect(actions['?']).toHaveBeenCalled();
    });

    it('should ignore keys not in actions', () => {
      const event = new KeyboardEvent('keydown', { key: 'z' });
      document.dispatchEvent(event);
      // No error should occur
    });
  });

  describe('setupShortcutsDialog', () => {
    let dialog;
    let closeBtn;

    beforeEach(() => {
      document.body.innerHTML = `
        <dialog id="shortcuts-dialog">
          <button id="close-shortcuts">Close</button>
        </dialog>
      `;
      dialog = document.getElementById('shortcuts-dialog');
      closeBtn = document.getElementById('close-shortcuts');
      
      // Mock dialog methods as they might not be fully implemented in happy-dom
      dialog.showModal = vi.fn(() => { dialog.open = true; });
      dialog.close = vi.fn(() => { dialog.open = false; });
    });

    it('should show dialog when show() is called', () => {
      const manager = setupShortcutsDialog();
      manager.show();
      expect(dialog.showModal).toHaveBeenCalled();
    });

    it('should close dialog when close button is clicked', () => {
      setupShortcutsDialog();
      closeBtn.click();
      expect(dialog.close).toHaveBeenCalled();
    });

    it('should close dialog when clicking backdrop', () => {
      setupShortcutsDialog();
      dialog.click();
      expect(dialog.close).toHaveBeenCalled();
    });

    it('should not close dialog when clicking inside dialog content', () => {
      setupShortcutsDialog();
      const content = document.createElement('div');
      dialog.appendChild(content);
      
      // Simulate click on content, not dialog itself
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: content });
      dialog.dispatchEvent(event);
      
      expect(dialog.close).not.toHaveBeenCalled();
    });
  });
});
