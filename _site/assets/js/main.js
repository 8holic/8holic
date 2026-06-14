document.addEventListener('DOMContentLoaded', function() {
  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.getElementById('menuToggle');
  const closeSidebar = document.querySelector('.close-sidebar');
  const filterButtons = document.querySelectorAll('.tag-filter-btn, .post-filter-clear');
  const postCards = document.querySelectorAll('.post-preview[data-tags]');
  const emptyState = document.querySelector('.post-filter-empty');

  function openSidebar() {
    sidebar.classList.add('open');
  }

  function closeSidebarFunc() {
    sidebar.classList.remove('open');
  }

  if (menuToggle) menuToggle.addEventListener('click', openSidebar);
  if (closeSidebar) closeSidebar.addEventListener('click', closeSidebarFunc);

  if (filterButtons.length && postCards.length) {
    const setActiveButton = (activeTag) => {
      filterButtons.forEach((button) => {
        button.classList.toggle('is-active', button.dataset.tag === activeTag);
      });
    };

    const applyFilter = (tag) => {
      let visibleCount = 0;

      postCards.forEach((card) => {
        const cardTags = (card.dataset.tags || '').split(',').map((value) => value.trim()).filter(Boolean);
        const matches = tag === 'all' || cardTags.includes(tag);
        card.hidden = !matches;
        card.classList.toggle('is-hidden', !matches);
        if (matches) visibleCount += 1;
      });

      if (emptyState) {
        emptyState.hidden = visibleCount !== 0;
      }

      setActiveButton(tag);
    };

    filterButtons.forEach((button) => {
      button.addEventListener('click', () => applyFilter(button.dataset.tag || 'all'));
    });
  }
});