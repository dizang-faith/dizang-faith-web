/**
 * Script Converter Module - Handles Simplified/Traditional Chinese conversion
 */
(function() {
  'use strict';

  // UI elements that should be converted
  const UI_SELECTORS = [
    '.hero-title',
    '.hero-tagline',
    '.hero-vow',
    '.hero-quote p',
    '.hero-quote cite',
    '.scroll-text',
    '.section-title',
    '.section-desc',
    '.sutra-card .sutra-title',
    '.sutra-card .sutra-translator',
    '.sutra-card .sutra-desc',
    '.home-footer p',
    '.toc-header h2',
    '.settings-content h3',
    '.font-size-btn',
    '.pinyin-toggle label span',
    '.script-toggle label span',
    '.loading-message p',
    '.nav-btn',
    '.site-name',
    '.quote-card .quote-text',
    '.quote-card .quote-source'
  ];

  let converter = null;
  let originalTexts = new Map();
  let onToggleCallback = null;

  // Initialize OpenCC converter
  function initConverter() {
    if (typeof OpenCC !== 'undefined' && !converter) {
      converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
    }
  }

  // Get the text node from an element (for elements containing form inputs)
  function getTextNode(el) {
    for (var i = 0; i < el.childNodes.length; i++) {
      if (el.childNodes[i].nodeType === Node.TEXT_NODE && el.childNodes[i].textContent.trim()) {
        return el.childNodes[i];
      }
    }
    return null;
  }

  // Store original text content for all UI elements
  function storeOriginalTexts() {
    UI_SELECTORS.forEach(function(selector) {
      document.querySelectorAll(selector).forEach(function(el) {
        if (!originalTexts.has(el)) {
          // For labels containing inputs, store the text node reference and text
          var textNode = getTextNode(el);
          if (textNode && el.querySelector('input')) {
            originalTexts.set(el, { textNode: textNode, text: textNode.textContent });
          } else {
            originalTexts.set(el, el.textContent);
          }
        }
      });
    });
  }

  // Convert all UI text to Traditional Chinese
  function convertToTraditional() {
    if (!converter) {
      initConverter();
      if (!converter) return;
    }

    storeOriginalTexts();

    originalTexts.forEach(function(stored, el) {
      if (el && el.parentNode) {
        // Handle labels with inputs (stored as object with textNode)
        if (stored && stored.textNode) {
          stored.textNode.textContent = converter(stored.text);
        } else {
          el.textContent = converter(stored);
        }
      }
    });

    document.body.classList.add('use-traditional');
    document.documentElement.lang = 'zh-TW';

    // Update aria-label on toggle button
    var btn = document.getElementById('scriptToggleBtn');
    if (btn) {
      btn.setAttribute('aria-label', converter('切换简繁体'));
    }
  }

  // Restore all UI text to Simplified Chinese
  function restoreToSimplified() {
    originalTexts.forEach(function(stored, el) {
      if (el && el.parentNode) {
        // Handle labels with inputs (stored as object with textNode)
        if (stored && stored.textNode) {
          stored.textNode.textContent = stored.text;
        } else {
          el.textContent = stored;
        }
      }
    });

    document.body.classList.remove('use-traditional');
    document.documentElement.lang = 'zh-CN';

    // Update aria-label on toggle button
    var btn = document.getElementById('scriptToggleBtn');
    if (btn) {
      btn.setAttribute('aria-label', '切换简繁体');
    }
  }

  // Toggle between scripts
  function toggleScript() {
    var wasTraditional = localStorage.getItem('useTraditional') === 'true';
    var newValue = !wasTraditional;

    localStorage.setItem('useTraditional', newValue ? 'true' : 'false');

    if (newValue) {
      convertToTraditional();
    } else {
      restoreToSimplified();
    }

    // Sync with settings panel checkbox if it exists (reader.html)
    var scriptToggleCheckbox = document.getElementById('scriptToggle');
    if (scriptToggleCheckbox) {
      scriptToggleCheckbox.checked = newValue;
    }

    // Call the registered callback (e.g., to reload sutra content)
    if (onToggleCallback) {
      onToggleCallback(newValue);
    }
  }

  // Set script preference programmatically (used by settings panel)
  function setScript(useTraditional) {
    var currentValue = localStorage.getItem('useTraditional') === 'true';
    if (currentValue === useTraditional) return;

    localStorage.setItem('useTraditional', useTraditional ? 'true' : 'false');

    if (useTraditional) {
      convertToTraditional();
    } else {
      restoreToSimplified();
    }

    // Call the registered callback (e.g., to reload sutra content)
    if (onToggleCallback) {
      onToggleCallback(useTraditional);
    }
  }

  // Register a callback to be called after toggle (e.g., for reloading content)
  function onToggle(callback) {
    onToggleCallback = callback;
  }

  // Apply saved preference on page load
  function applySavedPreference() {
    var useTraditional = localStorage.getItem('useTraditional') === 'true';

    if (useTraditional) {
      // Small delay to ensure DOM and OpenCC are ready
      setTimeout(function() {
        convertToTraditional();
      }, 100);
    }
  }

  // Convert dynamically added content (e.g., ToC items)
  function convertDynamicContent(elements) {
    if (!converter) {
      initConverter();
      if (!converter) return;
    }

    var useTraditional = localStorage.getItem('useTraditional') === 'true';
    if (!useTraditional) return;

    elements.forEach(function(el) {
      if (!originalTexts.has(el)) {
        originalTexts.set(el, el.textContent);
        el.textContent = converter(el.textContent);
      }
    });
  }

  // Initialize module
  function init() {
    initConverter();

    // Bind toggle button click
    var btn = document.getElementById('scriptToggleBtn');
    if (btn) {
      btn.addEventListener('click', toggleScript);
    }

    // Apply saved preference
    applySavedPreference();
  }

  // Export for use by other scripts
  window.ScriptConverter = {
    init: init,
    toggleScript: toggleScript,
    setScript: setScript,
    onToggle: onToggle,
    convertToTraditional: convertToTraditional,
    restoreToSimplified: restoreToSimplified,
    applySavedPreference: applySavedPreference,
    convertDynamicContent: convertDynamicContent,
    isTraditional: function() {
      return localStorage.getItem('useTraditional') === 'true';
    }
  };

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
