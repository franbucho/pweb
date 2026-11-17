'use strict';
// Mobile navigation toggle shared by every page.
document.documentElement.classList.add('js');
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
if (menuButton && navigation) {
  const mobile = window.matchMedia('(max-width: 640px)');
  function setMenu(open) {
    navigation.hidden = mobile.matches && !open;
    menuButton.setAttribute('aria-expanded', String(open));
  }
  setMenu(false);
  menuButton.addEventListener('click', () => setMenu(navigation.hidden));
  mobile.addEventListener('change', () => setMenu(false));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && mobile.matches && !navigation.hidden) {
      setMenu(false);
      menuButton.focus();
    }
  });
}
