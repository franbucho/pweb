'use strict';
// Midnight in New York on October 30, 2026 (EDT, UTC-04:00).
const BOOK_LAUNCH = Date.parse('2026-10-30T00:00:00-04:00');

function remainingTime(now) {
  const seconds = Math.max(0, Math.ceil((BOOK_LAUNCH - now) / 1000));
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor(seconds % 86400 / 3600),
    minutes: Math.floor(seconds % 3600 / 60),
    seconds: seconds % 60,
    released: now >= BOOK_LAUNCH
  };
}

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

const countdowns = document.querySelectorAll('[data-countdown]');
function updateCountdowns() {
  const time = remainingTime(Date.now());
  countdowns.forEach(element => {
    for (const unit of ['days', 'hours', 'minutes', 'seconds']) {
      element.querySelector(`[data-unit="${unit}"]`).textContent = String(time[unit]).padStart(2, '0');
    }
    const status = element.parentElement.querySelector('.launch-status');
    const message = time.released
      ? 'Launch day has arrived. Release date: October 30, 2026.'
      : 'Counting down to October 30, 2026.';
    if (status.textContent !== message) status.textContent = message;
    element.setAttribute('aria-label', time.released ? 'Launch date reached' : `${time.days} days, ${time.hours} hours, ${time.minutes} minutes remaining`);
  });
  return time.released;
}
if (countdowns.length && !updateCountdowns()) {
  const timer = window.setInterval(() => {
    if (updateCountdowns()) window.clearInterval(timer);
  }, 1000);
}
