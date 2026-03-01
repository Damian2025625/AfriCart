'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePathname } from 'next/navigation';
import { FiGlobe, FiCheck, FiLoader } from 'react-icons/fi';

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ig', name: 'Igbo',    flag: '🇳🇬' },
  { code: 'yo', name: 'Yoruba', flag: '🇳🇬' },
  { code: 'ha', name: 'Hausa',  flag: '🇳🇬' },
];

export default function LanguageSelector() {
  const { targetLang, switchLanguage, isTranslating, setIsTranslating } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Refs — all mutable state that must NOT cause re-renders
  const isTranslatingRef    = useRef(false);
  const observerRef         = useRef(null);   // MutationObserver
  const debounceTimerRef    = useRef(null);   // debounce for DOM-settle
  const targetLangRef       = useRef(targetLang); // always up-to-date lang value inside observer
  const lastTranslatedSnap  = useRef(null);   // snapshot key to avoid duplicate runs

  // Keep targetLangRef in sync whenever state changes
  useEffect(() => {
    targetLangRef.current = targetLang;
  }, [targetLang]);

  // ── Core translation function ─────────────────────────────────────────────
  const translatePage = useCallback(async (langName) => {
    if (langName === 'English') {
      // Restore originals
      document.querySelectorAll('[data-original-text]').forEach(el => {
        const orig = el.getAttribute('data-original-text');
        if (orig) {
          const textNode = Array.from(el.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
          if (textNode) textNode.nodeValue = orig;
        }
        el.removeAttribute('data-translated');
      });
      return;
    }

    if (isTranslatingRef.current) return; // already running

    // Build a snapshot key from current page text so we don't retranslate identical DOM
    const mainEl = document.querySelector('main') || document.body;
    const snap = langName + ':' + mainEl.innerText.substring(0, 200);
    if (lastTranslatedSnap.current === snap) return;

    // Collect untranslated text nodes
    const nodes = [];
    const texts = [];
    const walker = document.createTreeWalker(mainEl, NodeFilter.SHOW_TEXT);
    let node;

    while ((node = walker.nextNode())) {
      const text = node.nodeValue?.trim();
      const parent = node.parentElement;
      if (
        text &&
        text.length > 1 &&
        !parent.closest('script, style, noscript, .no-translate, [role="status"]') &&
        parent.getAttribute('data-translated') !== langName &&
        !text.match(/^(Loading|Please wait|Fetching)\b/i)
      ) {
        if (!parent.hasAttribute('data-original-text')) {
          parent.setAttribute('data-original-text', text);
        }
        nodes.push(node);
        texts.push(text);
      }
    }

    if (texts.length === 0) return;

    // ── Fire translation API in batches ──────────────────────────────────────
    isTranslatingRef.current = true;
    setIsTranslating(true);

    try {
      const chunkSize = 15;
      for (let i = 0; i < texts.length; i += chunkSize) {
        const batch = texts.slice(i, i + chunkSize);

        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ textBatch: batch, targetLang: langName }),
        });

        if (!res.ok) continue;
        const data = await res.json();

        if (data.translatedBatch) {
          data.translatedBatch.forEach((translated, idx) => {
            const ni = i + idx;
            if (nodes[ni] && nodes[ni].parentElement) {
              nodes[ni].nodeValue = translated;
              nodes[ni].parentElement.setAttribute('data-translated', langName);
            }
          });
        }

        await new Promise(r => setTimeout(r, 150));
      }

      // Record what we just translated so we don't repeat the same DOM state
      lastTranslatedSnap.current = snap;
    } catch (err) {
      console.error('Translation error:', err);
    } finally {
      isTranslatingRef.current = false;
      setIsTranslating(false);
    }
  }, [setIsTranslating]);

  // ── MutationObserver: watches DOM, fires translation AFTER content settles ─
  const startObserver = useCallback(() => {
    // Disconnect any old observer
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    const targetEl = document.querySelector('main') || document.body;

    observerRef.current = new MutationObserver(() => {
      // Every time the DOM changes, reset the debounce timer
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      // Only proceed if a non-English language is active
      const lang = targetLangRef.current;
      if (lang === 'English') return;

      // Wait for DOM to stop changing (debounce 900ms = content finished loading)
      debounceTimerRef.current = setTimeout(() => {
        console.log(`[Translator] DOM settled — translating to ${lang}`);
        translatePage(lang);
      }, 900);
    });

    observerRef.current.observe(targetEl, {
      childList:  true,   // watch for elements being added/removed
      subtree:    true,   // watch all descendants
      characterData: false, // ignore text-only changes (those are OUR translations)
    });

    console.log('[Translator] Observer started on', targetEl.tagName);
  }, [translatePage]);

  // ── Reset on pathname change ───────────────────────────────────────────────
  useEffect(() => {
    // New page → clear snapshot so translation runs fresh even if same language
    lastTranslatedSnap.current = null;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    // Restart observer on the new page's <main>
    // Small delay to let Next.js mount the new page element
    const t = setTimeout(startObserver, 100);
    return () => clearTimeout(t);
  }, [pathname, startObserver]);

  // ── Also make sure observer is running on first mount ─────────────────────
  useEffect(() => {
    startObserver();
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [startObserver]);

  // ── When user manually switches language ──────────────────────────────────
  const handleLanguageSelect = (langName) => {
    setIsOpen(false);
    switchLanguage(langName);

    // Reset snap so it translates even if DOM hasn't changed since last run
    lastTranslatedSnap.current = null;

    // Translate immediately (with a small delay to let the state update propagate)
    setTimeout(() => translatePage(langName), 200);
  };

  const current = languages.find(l => l.name === targetLang) || languages[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isTranslating}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-all shadow-sm ${
          isTranslating ? 'opacity-75 cursor-not-allowed' : ''
        }`}
      >
        {isTranslating ? (
          <FiLoader className="animate-spin text-green-600" />
        ) : (
          <FiGlobe className="text-gray-600" />
        )}
        <span className="font-medium text-gray-700 hidden sm:inline">
          {current.flag} {current.name}
        </span>
        <span className="sm:hidden text-xl">{current.flag}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageSelect(lang.name)}
                disabled={isTranslating}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  targetLang === lang.name ? 'bg-green-50 text-green-700' : 'text-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{lang.flag}</span>
                  <span className="font-medium">{lang.name}</span>
                </div>
                {targetLang === lang.name && <FiCheck />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}