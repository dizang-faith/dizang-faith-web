/**
 * dizang.faith - Reader Application
 * Pure JavaScript implementation for sutra reading
 */

(function() {
  'use strict';

  // ============================================
  // State
  // ============================================
  let sutraData = null;
  let currentChapterIndex = 0;
  let chapterElements = [];
  let useTraditional = false;

  // ============================================
  // DOM Elements
  // ============================================
  const elements = {
    progressBar: document.getElementById('progressBar'),
    sutraTitleHeader: document.getElementById('sutraTitleHeader'),
    tocToggle: document.getElementById('tocToggle'),
    tocSidebar: document.getElementById('tocSidebar'),
    tocClose: document.getElementById('tocClose'),
    tocNav: document.getElementById('tocNav'),
    tocOverlay: document.getElementById('tocOverlay'),
    settingsToggle: document.getElementById('settingsToggle'),
    settingsPanel: document.getElementById('settingsPanel'),
    themeToggle: document.getElementById('themeToggle'),
    pinyinToggle: document.getElementById('pinyinToggle'),
    scriptToggle: document.getElementById('scriptToggle'),
    sutraContent: document.getElementById('sutraContent'),
    readerMain: document.getElementById('readerMain'),
    prevChapter: document.getElementById('prevChapter'),
    nextChapter: document.getElementById('nextChapter'),
    backToTop: document.getElementById('backToTop')
  };

  // ============================================
  // Initialization
  // ============================================
  function init() {
    loadSettings();
    loadSutra();
    bindEvents();

    // Register callback for script toggle (header button triggers sutra reload)
    if (window.ScriptConverter) {
      window.ScriptConverter.onToggle(onScriptToggled);
    }

    // Re-render when pinyin library becomes available (loaded async via ESM)
    window.addEventListener('pinyinReady', function() {
      if (sutraData) {
        renderSutra(sutraData);
      }
    });
  }

  // ============================================
  // Settings Management
  // ============================================
  function loadSettings() {
    // Load theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-mode');
    }

    // Load font size
    const savedFontSize = localStorage.getItem('fontSize') || 'medium';
    setFontSize(savedFontSize);
    updateFontSizeButtons(savedFontSize);

    // Load pinyin preference
    const showPinyin = localStorage.getItem('showPinyin') === 'true';
    if (elements.pinyinToggle) {
      elements.pinyinToggle.checked = showPinyin;
    }
    if (showPinyin) {
      document.body.classList.add('show-pinyin');
    }

    // Load script preference (simplified/traditional)
    useTraditional = localStorage.getItem('useTraditional') === 'true';
    if (elements.scriptToggle) {
      elements.scriptToggle.checked = useTraditional;
    }
    if (useTraditional) {
      document.body.classList.add('use-traditional');
    }
  }

  function setFontSize(size) {
    document.body.classList.remove('font-small', 'font-medium', 'font-large', 'font-xlarge');
    document.body.classList.add('font-' + size);
    localStorage.setItem('fontSize', size);
  }

  function updateFontSizeButtons(activeSize) {
    const buttons = document.querySelectorAll('.font-size-btn');
    buttons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.size === activeSize);
    });
  }

  function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }

  function togglePinyin() {
    const showPinyin = elements.pinyinToggle.checked;
    document.body.classList.toggle('show-pinyin', showPinyin);
    localStorage.setItem('showPinyin', showPinyin);
  }

  function toggleScript() {
    var newValue = elements.scriptToggle.checked;

    // Use ScriptConverter to handle the toggle (this syncs everything)
    if (window.ScriptConverter) {
      window.ScriptConverter.setScript(newValue);
    } else {
      // Fallback: manual handling
      useTraditional = newValue;
      localStorage.setItem('useTraditional', useTraditional);
      document.body.classList.toggle('use-traditional', useTraditional);
      loadSutra();
    }
  }

  // Called by ScriptConverter when script is toggled (from header button or checkbox)
  function onScriptToggled(isTraditional) {
    useTraditional = isTraditional;
    loadSutra();
  }

  function toggleSettings() {
    elements.settingsPanel.classList.toggle('open');
  }

  // ============================================
  // ToC Management
  // ============================================
  function openToc() {
    elements.tocSidebar.classList.add('open');
    elements.tocOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeToc() {
    elements.tocSidebar.classList.remove('open');
    elements.tocOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function buildToc(data) {
    elements.tocNav.innerHTML = '';

    // Add opening verse to ToC if exists
    if (data.openingVerse) {
      const item = document.createElement('a');
      item.href = '#opening-verse';
      item.className = 'toc-item';
      item.textContent = '开经偈';
      item.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('opening-verse').scrollIntoView({ behavior: 'smooth' });
        if (window.innerWidth < 1024) closeToc();
      });
      elements.tocNav.appendChild(item);
    }

    // Add chapters
    data.chapters.forEach((chapter, index) => {
      const item = document.createElement('a');
      item.href = '#chapter-' + index;
      item.className = 'toc-item';
      item.textContent = chapter.title;
      item.dataset.index = index;
      item.addEventListener('click', (e) => {
        e.preventDefault();
        scrollToChapter(index);
        if (window.innerWidth < 1024) closeToc();
      });
      elements.tocNav.appendChild(item);
    });

    // Add dedication to ToC if exists
    if (data.dedication) {
      const item = document.createElement('a');
      item.href = '#dedication';
      item.className = 'toc-item';
      item.textContent = '回向文';
      item.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('dedication').scrollIntoView({ behavior: 'smooth' });
        if (window.innerWidth < 1024) closeToc();
      });
      elements.tocNav.appendChild(item);
    }

    // Convert ToC items to Traditional if needed
    if (window.ScriptConverter && window.ScriptConverter.isTraditional()) {
      const tocItems = elements.tocNav.querySelectorAll('.toc-item');
      window.ScriptConverter.convertDynamicContent(Array.from(tocItems));
    }
  }

  function updateActiveTocItem(index) {
    const items = elements.tocNav.querySelectorAll('.toc-item');
    items.forEach((item, i) => {
      // Skip opening verse and dedication items
      if (item.dataset.index !== undefined) {
        item.classList.toggle('active', parseInt(item.dataset.index) === index);
      }
    });
    currentChapterIndex = index;
    updateChapterNavButtons();
  }

  // ============================================
  // Sutra Loading and Rendering
  // ============================================
  function getSutraIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('sutra') || 'dizang-benyuan';
  }

  function getChapterFromHash() {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#chapter-')) {
      return parseInt(hash.replace('#chapter-', ''), 10);
    }
    return null;
  }

  async function loadSutra() {
    const sutraId = getSutraIdFromUrl();
    const suffix = useTraditional ? '-tw' : '';
    const url = 'sutras/' + sutraId + suffix + '.json';

    try {
      let response = await fetch(url);
      // Fallback to simplified if traditional version doesn't exist
      if (!response.ok && useTraditional) {
        const fallbackUrl = 'sutras/' + sutraId + '.json';
        response = await fetch(fallbackUrl);
      }
      if (!response.ok) {
        throw new Error('Sutra not found');
      }
      sutraData = await response.json();
      renderSutra(sutraData);

      // Scroll to specific chapter if hash exists
      const chapterIndex = getChapterFromHash();
      if (chapterIndex !== null && chapterIndex < sutraData.chapters.length) {
        setTimeout(() => scrollToChapter(chapterIndex), 100);
      }
    } catch (error) {
      showError('无法加载经文。请检查网络连接后重试。');
      console.error('Failed to load sutra:', error);
    }
  }

  function renderSutra(data) {
    // Update page title
    document.title = data.title + ' | 地藏信仰';
    elements.sutraTitleHeader.textContent = data.title;

    // Build ToC
    buildToc(data);

    // Render content
    let html = '';

    // Sutra title and translator
    html += '<h1 class="sutra-main-title">' + escapeHtml(data.title) + '</h1>';
    html += '<p class="sutra-main-translator">' + escapeHtml(data.translator) + '</p>';

    // Opening verse (开经偈)
    if (data.openingVerse) {
      html += '<section class="opening-verse" id="opening-verse">';
      html += '<h2 class="opening-verse-title">开经偈</h2>';
      html += '<div class="opening-verse-content">';
      data.openingVerse.forEach(line => {
        html += '<span class="opening-verse-line">' + renderWithPinyin(line) + '</span>';
      });
      html += '</div>';
      html += '</section>';
      html += '<div class="lotus-divider"></div>';
    }

    // Chapters
    chapterElements = [];
    data.chapters.forEach((chapter, index) => {
      html += '<section class="chapter" id="chapter-' + index + '">';
      html += '<h2 class="chapter-title">' + escapeHtml(chapter.title) + '</h2>';
      chapter.paragraphs.forEach(para => {
        // Check if paragraph is a mantra/dharani
        if (para.type === 'mantra') {
          html += '<div class="mantra">';
          if (para.title) {
            html += '<div class="mantra-title">' + escapeHtml(para.title) + '</div>';
          }
          html += '<p>' + escapeHtml(para.text) + '</p>';
          html += '</div>';
        } else {
          // Regular paragraph - use automatic pinyin
          const text = typeof para === 'string' ? para : para.text;
          html += '<p class="chapter-paragraph">' + renderWithPinyin(text) + '</p>';
        }
      });
      html += '</section>';
    });

    // Dedication (回向文)
    if (data.dedication) {
      html += '<div class="lotus-divider"></div>';
      html += '<section class="dedication" id="dedication">';
      html += '<h2 class="dedication-title">回向文</h2>';
      html += '<div class="dedication-content">';
      data.dedication.forEach(line => {
        html += '<span class="dedication-line">' + renderWithPinyin(line) + '</span>';
      });
      html += '</div>';
      html += '</section>';
    }

    elements.sutraContent.innerHTML = html;

    // Store chapter elements for intersection observer
    chapterElements = Array.from(document.querySelectorAll('.chapter'));

    // Setup intersection observer for active chapter tracking
    setupChapterObserver();

    // Enable navigation buttons
    updateChapterNavButtons();
  }

  function renderWithPinyin(text) {
    // Use pinyin-pro library (loaded via ESM and exposed as window.pinyinFn)
    if (typeof window.pinyinFn === 'function') {
      let html = '';
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        // Check if it's a Chinese character
        if (/[\u4e00-\u9fff]/.test(char)) {
          try {
            const py = window.pinyinFn(char, { toneType: 'symbol' });
            html += '<ruby>' + escapeHtml(char) + '<rt>' + escapeHtml(py) + '</rt></ruby>';
          } catch (e) {
            html += escapeHtml(char);
          }
        } else {
          html += escapeHtml(char);
        }
      }
      return html;
    }
    // Fallback: just return escaped text without pinyin
    return escapeHtml(text);
  }

  function showError(message) {
    elements.sutraContent.innerHTML = '<div class="loading-message"><p>' + escapeHtml(message) + '</p></div>';
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ============================================
  // Chapter Navigation
  // ============================================
  function scrollToChapter(index) {
    if (index >= 0 && index < chapterElements.length) {
      const element = chapterElements[index];
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, null, '#chapter-' + index);
    }
  }

  function goToPrevChapter() {
    if (currentChapterIndex > 0) {
      scrollToChapter(currentChapterIndex - 1);
    }
  }

  function goToNextChapter() {
    if (sutraData && currentChapterIndex < sutraData.chapters.length - 1) {
      scrollToChapter(currentChapterIndex + 1);
    }
  }

  function updateChapterNavButtons() {
    if (!sutraData) return;

    elements.prevChapter.disabled = currentChapterIndex <= 0;
    elements.nextChapter.disabled = currentChapterIndex >= sutraData.chapters.length - 1;
  }

  // ============================================
  // Scroll Handling
  // ============================================
  function setupChapterObserver() {
    const options = {
      root: null,
      rootMargin: '-20% 0px -70% 0px',
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const index = chapterElements.indexOf(entry.target);
          if (index !== -1) {
            updateActiveTocItem(index);
            history.replaceState(null, null, '#chapter-' + index);
          }
        }
      });
    }, options);

    chapterElements.forEach(chapter => observer.observe(chapter));
  }

  function updateProgressBar() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    elements.progressBar.style.width = progress + '%';
  }

  function updateBackToTopButton() {
    const scrollTop = window.scrollY;
    const showThreshold = 300;
    elements.backToTop.classList.toggle('visible', scrollTop > showThreshold);
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // ============================================
  // Event Binding
  // ============================================
  function bindEvents() {
    // Theme toggle
    if (elements.themeToggle) {
      elements.themeToggle.addEventListener('click', toggleTheme);
    }

    // Pinyin toggle
    if (elements.pinyinToggle) {
      elements.pinyinToggle.addEventListener('change', togglePinyin);
    }

    // Script toggle (simplified/traditional)
    if (elements.scriptToggle) {
      elements.scriptToggle.addEventListener('change', toggleScript);
    }

    // Settings toggle
    if (elements.settingsToggle) {
      elements.settingsToggle.addEventListener('click', toggleSettings);
    }

    // Font size buttons
    document.querySelectorAll('.font-size-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        setFontSize(btn.dataset.size);
        updateFontSizeButtons(btn.dataset.size);
      });
    });

    // ToC toggle
    if (elements.tocToggle) {
      elements.tocToggle.addEventListener('click', openToc);
    }

    // ToC close
    if (elements.tocClose) {
      elements.tocClose.addEventListener('click', closeToc);
    }

    // ToC overlay click
    if (elements.tocOverlay) {
      elements.tocOverlay.addEventListener('click', closeToc);
    }

    // Chapter navigation
    if (elements.prevChapter) {
      elements.prevChapter.addEventListener('click', goToPrevChapter);
    }

    if (elements.nextChapter) {
      elements.nextChapter.addEventListener('click', goToNextChapter);
    }

    // Back to top
    if (elements.backToTop) {
      elements.backToTop.addEventListener('click', scrollToTop);
    }

    // Scroll events (throttled)
    const throttledScrollHandler = throttle(() => {
      updateProgressBar();
      updateBackToTopButton();
    }, 50);

    window.addEventListener('scroll', throttledScrollHandler);

    // Close settings when clicking outside
    document.addEventListener('click', (e) => {
      if (elements.settingsPanel.classList.contains('open')) {
        if (!elements.settingsPanel.contains(e.target) && !elements.settingsToggle.contains(e.target)) {
          elements.settingsPanel.classList.remove('open');
        }
      }
    });

    // Handle hash changes
    window.addEventListener('hashchange', () => {
      const chapterIndex = getChapterFromHash();
      if (chapterIndex !== null && chapterIndex < chapterElements.length) {
        scrollToChapter(chapterIndex);
      }
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          goToPrevChapter();
          break;
        case 'ArrowRight':
          goToNextChapter();
          break;
        case 'Escape':
          closeToc();
          elements.settingsPanel.classList.remove('open');
          break;
      }
    });
  }

  // ============================================
  // Start Application
  // ============================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
