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

  // ---- Post filters (posts listing) ----
  const tagButtons = document.querySelectorAll('.tag-filter-btn, .post-filter-clear');
  const formatButtons = document.querySelectorAll('.format-filter-btn, .format-filter-clear');
  const postCards = document.querySelectorAll('.post-preview[data-tags]');
  const emptyState = document.querySelector('.post-filter-empty');
  if (postCards.length && (tagButtons.length || formatButtons.length)) {
    let activeTag = 'all';
    let activeFormat = 'all';
    const applyFilters = () => {
      let visibleCount = 0;
      postCards.forEach((card) => {
        const cardTags = (card.dataset.tags || '').split(',').map((v) => v.trim()).filter(Boolean);
        const cardFormat = card.dataset.format || 'log';
        const matches = (activeTag === 'all' || cardTags.includes(activeTag))
          && (activeFormat === 'all' || cardFormat === activeFormat);
        card.hidden = !matches;
        card.classList.toggle('is-hidden', !matches);
        if (matches) visibleCount += 1;
      });
      if (emptyState) emptyState.hidden = visibleCount !== 0;
      tagButtons.forEach((b) => b.classList.toggle('is-active', (b.dataset.tag || 'all') === activeTag));
      formatButtons.forEach((b) => b.classList.toggle('is-active', (b.dataset.format || 'all') === activeFormat));
    };
    tagButtons.forEach((button) => {
      button.addEventListener('click', () => {
        activeTag = button.dataset.tag || 'all';
        applyFilters();
      });
    });
    formatButtons.forEach((button) => {
      button.addEventListener('click', () => {
        activeFormat = button.dataset.format || 'all';
        applyFilters();
      });
    });
  }

  // ---- Series chapter anchor isolation ----
  document.querySelectorAll('.series-chapter').forEach((chapter) => {
    const body = chapter.querySelector('.series-chapter-body');
    if (!body) return;
    body.querySelectorAll('[id]').forEach((element) => {
      element.id = `${chapter.id}-${element.id}`;
    });
  });
});
