document.addEventListener('DOMContentLoaded', function() {
  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.getElementById('menuToggle');
  const closeSidebar = document.querySelector('.close-sidebar');

  function openSidebar() {
    sidebar.classList.add('open');
  }

  function closeSidebarFunc() {
    sidebar.classList.remove('open');
  }

  if (menuToggle) menuToggle.addEventListener('click', openSidebar);
  if (closeSidebar) closeSidebar.addEventListener('click', closeSidebarFunc);
});