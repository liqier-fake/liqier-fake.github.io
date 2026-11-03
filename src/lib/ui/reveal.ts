/**
 * Scroll reveals in the manner of a title sequence:
 *   data-rv="up"       — the block rises and fades in
 *   data-rv="chars"    — each character lifts out of a mask (CJK headings)
 *   data-rv="letters"  — same, for a Latin wordmark
 * Reduced motion shows everything immediately.
 */
export function mountReveal(root: ParentNode): () => void {
  const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-rv]'));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  targets.forEach((el) => {
    if (el.dataset.rv !== 'chars' && el.dataset.rv !== 'letters') return;
    if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', el.textContent?.replace(/\s+/g, '') ?? '');
    let index = 0;
    const split = (node: Node): void => {
      if (node.nodeType === Node.TEXT_NODE) {
        const fragment = document.createDocumentFragment();
        for (const char of node.textContent ?? '') {
          if (/\s/.test(char)) { fragment.append(char); continue; }
          const mask = document.createElement('span');
          mask.className = 'rv-mask';
          mask.setAttribute('aria-hidden', 'true');
          const glyph = document.createElement('span');
          glyph.className = 'rv-glyph';
          glyph.style.setProperty('--i', String(index));
          glyph.textContent = char;
          index += 1;
          mask.append(glyph);
          fragment.append(mask);
        }
        node.parentNode?.replaceChild(fragment, node);
      } else if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName !== 'BR') {
        Array.from(node.childNodes).forEach(split);
      }
    };
    Array.from(el.childNodes).forEach(split);
  });

  document.documentElement.dataset.rvReady = '';
  if (reduced || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('rv-in'));
    return () => undefined;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('rv-in');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
  targets.forEach((el) => observer.observe(el));
  return () => observer.disconnect();
}
