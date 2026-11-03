/** Tracks which [data-chapter] section holds the middle of the viewport and announces changes. */
export function watchChapters(onChange: (index: number) => void): () => void {
  const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-chapter]'));
  let current = -1;
  let frame = 0;
  const measure = (): void => {
    frame = 0;
    const mid = innerHeight * 0.5;
    let next = 0;
    sections.forEach((section, i) => {
      if (section.getBoundingClientRect().top <= mid) next = i;
    });
    const index = Number(sections[next]?.dataset.chapter ?? 0);
    if (index !== current) {
      current = index;
      onChange(index);
    }
  };
  const schedule = (): void => { if (!frame) frame = requestAnimationFrame(measure); };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  measure();
  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
  };
}
