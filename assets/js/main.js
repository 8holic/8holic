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

  // ---- Tag filter (posts listing) ----
  const filterButtons = document.querySelectorAll('.tag-filter-btn, .post-filter-clear');
  const postCards = document.querySelectorAll('.post-preview[data-tags]');
  const emptyState = document.querySelector('.post-filter-empty');
  if (filterButtons.length && postCards.length) {
    const applyFilter = (tag) => {
      let visibleCount = 0;
      postCards.forEach((card) => {
        const cardTags = (card.dataset.tags || '').split(',').map((v) => v.trim()).filter(Boolean);
        const matches = tag === 'all' || cardTags.includes(tag);
        card.hidden = !matches;
        card.classList.toggle('is-hidden', !matches);
        if (matches) visibleCount += 1;
      });
      if (emptyState) emptyState.hidden = visibleCount !== 0;
      filterButtons.forEach((b) => b.classList.toggle('is-active', b.dataset.tag === tag));
    };
    filterButtons.forEach((button) => {
      button.addEventListener('click', () => applyFilter(button.dataset.tag || 'all'));
    });
  }
});
