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

  const toc = document.getElementById('toc');
  const postContent = document.querySelector('.post-content');

  if (toc && postContent) {
    const headings = Array.from(postContent.querySelectorAll('h1, h2'));

    if (headings.length >= 3) {
      const usedIds = {};
      document.querySelectorAll('[id]').forEach((el) => { usedIds[el.id] = true; });
      const tocList = document.createElement('ul');
      const tocLinks = [];

      headings.forEach((heading) => {
        if (!heading.id) {
          const base = heading.textContent.trim().toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '') || 'section';
          let slug = base;
          let n = 2;
          while (usedIds[slug]) { slug = base + '-' + n; n += 1; }
          heading.id = slug;
        }
        usedIds[heading.id] = true;

        const link = document.createElement('a');
        link.href = '#' + heading.id;
        link.textContent = heading.textContent;

        const item = document.createElement('li');
        if (heading.tagName === 'H2') item.className = 'is-sub';
        item.appendChild(link);
        tocList.appendChild(item);
        tocLinks.push({ link: link, heading: heading });
      });

      toc.appendChild(tocList);
      toc.hidden = false;

      if ('IntersectionObserver' in window) {
        const setActive = (id) => {
          tocLinks.forEach((entry) => {
            entry.link.classList.toggle('is-active', entry.heading.id === id);
          });
        };
        const spy = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) setActive(entry.target.id);
          });
        }, { rootMargin: '-15% 0px -75% 0px' });
        tocLinks.forEach((entry) => spy.observe(entry.heading));
      }
    }
  }
});