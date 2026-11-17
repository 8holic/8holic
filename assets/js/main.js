document.addEventListener('DOMContentLoaded', function () {
  // ---- Mobile drawer ----
  const drawer = document.getElementById('drawer');
  const menuToggle = document.getElementById('menuToggle');
  const drawerClose = document.getElementById('drawerClose');
  if (menuToggle && drawer) menuToggle.addEventListener('click', () => drawer.classList.add('open'));
  if (drawerClose && drawer) drawerClose.addEventListener('click', () => drawer.classList.remove('open'));
  if (drawer) {
    drawer.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => drawer.classList.remove('open')));
  }

  // ---- Listing filters + title search ----
  const tagButtons = document.querySelectorAll('.tag-filter-btn, .post-filter-clear');
  const searchInput = document.querySelector('.title-search');
  const list = searchInput
    ? document.querySelector(searchInput.dataset.target)
    : document.querySelector('.post-list');
  const emptyState = document.querySelector('.post-filter-empty');

  if (list) {
    const cards = Array.from(list.querySelectorAll('.post-preview'));
    let activeTag = 'all';
    let query = '';

    const apply = () => {
      let visibleCount = 0;
      cards.forEach((card) => {
        const cardTags = (card.dataset.tags || '').split(',').map((v) => v.trim()).filter(Boolean);
        const matchesTag = activeTag === 'all' || cardTags.includes(activeTag);
        const matchesSearch = !query || (card.dataset.title || '').includes(query);
        const show = matchesTag && matchesSearch;
        card.hidden = !show;
        if (show) visibleCount += 1;
      });
      if (emptyState) emptyState.hidden = visibleCount !== 0;
      tagButtons.forEach((b) => b.classList.toggle('is-active', (b.dataset.tag || 'all') === activeTag));
    };

    tagButtons.forEach((button) => {
      button.addEventListener('click', () => {
        activeTag = button.dataset.tag || 'all';
        apply();
      });
    });

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        query = searchInput.value.trim().toLowerCase();
        apply();
      });
    }
  }

  // ---- Expand short feed posts ----
  document.querySelectorAll('.feed-toggle').forEach((button) => {
    button.addEventListener('click', () => {
      const item = button.closest('.feed-item');
      const preview = item ? item.querySelector('.feed-preview') : null;
      const full = item ? item.querySelector('.feed-full') : null;
      if (!full) return;
      const opening = full.hidden;
      full.hidden = !opening;
      if (preview) preview.hidden = opening;
      button.textContent = opening ? 'Show less' : 'Read more →';
      button.setAttribute('aria-expanded', String(opening));
    });
  });
});
