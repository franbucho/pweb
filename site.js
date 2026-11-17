'use strict';
// Book launch: midnight in New York on November 26, 2026 (EST, UTC-05:00).
const BOOK_LAUNCH = Date.parse('2026-11-26T00:00:00-05:00');
const COMING_SOON = 'Coming soon on Amazon (Kindle & paperback).';

function remainingTime(now) {
  const seconds = Math.max(0, Math.ceil((BOOK_LAUNCH - now) / 1000));
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor(seconds % 86400 / 3600),
    minutes: Math.floor(seconds % 3600 / 60),
    seconds: seconds % 60,
    released: seconds === 0
  };
}

if (typeof module !== 'undefined') module.exports = { BOOK_LAUNCH, remainingTime };

if (typeof document !== 'undefined') {
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

  // Book countdown. When it reaches zero the timer and the launch date are
  // hidden and only "Coming soon on Amazon" remains (the release may slip).
  const countdowns = document.querySelectorAll('[data-countdown]');
  function updateCountdowns() {
    const time = remainingTime(Date.now());
    countdowns.forEach(element => {
      const banner = element.parentElement;
      const status = banner.querySelector('.launch-status');
      if (time.released) {
        element.hidden = true;
        if (status) status.textContent = 'Coming soon on Amazon.';
        return;
      }
      for (const unit of ['days', 'hours', 'minutes', 'seconds']) {
        element.querySelector(`[data-unit="${unit}"]`).textContent = String(time[unit]).padStart(2, '0');
      }
      if (status && status.textContent !== COMING_SOON) status.textContent = COMING_SOON;
      element.setAttribute('aria-label', `${time.days} days, ${time.hours} hours, ${time.minutes} minutes until launch`);
    });
    if (time.released) {
      document.querySelectorAll('[data-launch-only]').forEach(item => { item.hidden = true; });
    }
    return time.released;
  }
  if (countdowns.length && !updateCountdowns()) {
    const timer = window.setInterval(() => {
      if (updateCountdowns()) window.clearInterval(timer);
    }, 1000);
  }
}
