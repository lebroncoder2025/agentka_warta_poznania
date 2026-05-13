document.addEventListener('DOMContentLoaded', () => {
  initSmoothScroll();
  initRevealOnScroll();
  initGalleryLightbox();
  initBookingDemo();
});

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const hash = link.getAttribute('href');
      if (!hash || hash === '#') return;
      const target = document.querySelector(hash);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function initRevealOnScroll() {
  const revealItems = document.querySelectorAll('.reveal');
  if (!revealItems.length) return;

  if (!('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('in-view'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealItems.forEach((item) => observer.observe(item));
}

function initGalleryLightbox() {
  const modal = document.getElementById('gallery-modal');
  const modalImage = document.getElementById('gallery-modal-image');
  const closeButton = document.getElementById('gallery-close');
  if (!modal || !modalImage || !closeButton) return;

  const openModal = (src, alt) => {
    modalImage.src = src;
    modalImage.alt = alt || 'Podgląd zdjęcia';
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    modalImage.removeAttribute('src');
    document.body.style.overflow = '';
  };

  document.querySelectorAll('[data-gallery-src]').forEach((button) => {
    button.addEventListener('click', () => {
      openModal(button.dataset.gallerySrc || '', button.dataset.galleryAlt || 'Podgląd zdjęcia');
    });
  });

  closeButton.addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) {
      closeModal();
    }
  });
}

function initBookingDemo() {
  const calendarEl = document.getElementById('booking-calendar');
  const dateLabelEl = document.getElementById('booking-date-label');
  const dateNoteEl = document.getElementById('booking-date-note');
  const slotListEl = document.getElementById('booking-slot-list');
  const monthLabelEl = document.getElementById('booking-month-label');

  if (!calendarEl || !dateLabelEl || !dateNoteEl || !slotListEl || !monthLabelEl) return;

  const state = {
    days: buildBookingDays(),
    selectedKey: '2026-05-25',
    selectedSlot: null,
  };

  monthLabelEl.textContent = 'maj 2026';
  renderCalendar(calendarEl, state);

  const initialDay = state.days.find((day) => day.key === state.selectedKey) || state.days.find((day) => day.available) || state.days[0];
  if (initialDay) {
    selectDay(initialDay.key, state, { calendarEl, dateLabelEl, dateNoteEl, slotListEl });
  }

  calendarEl.addEventListener('click', (event) => {
    const button = event.target.closest('[data-date]');
    if (!button) return;
    selectDay(button.dataset.date, state, { calendarEl, dateLabelEl, dateNoteEl, slotListEl });
  });
}

function buildBookingDays() {
  const days = [];
  const start = new Date(2026, 3, 27); // 27 April 2026
  const end = new Date(2026, 4, 31); // 31 May 2026
  const patterns = [
    ['09:00', '10:00', '11:30'],
    ['09:30', '12:00', '14:00'],
    ['10:00', '13:30', '15:00'],
    ['08:30', '10:30', '12:30'],
  ];

  let current = new Date(start);
  let index = 0;
  while (current <= end) {
    const workingDay = current.getDay() >= 1 && current.getDay() <= 5;
    const blocked = current.getDate() % 7 === 0;
    const slots = workingDay && !blocked ? patterns[index % patterns.length] : [];
    days.push({
      key: toDateKey(current),
      dayNumber: current.getDate(),
      monthShort: current.toLocaleDateString('pl-PL', { month: 'short' }),
      label: formatLongDate(current),
      slots,
      available: slots.length > 0,
    });
    current = addDays(current, 1);
    index += 1;
  }

  return days;
}

function renderCalendar(calendarEl, state) {
  calendarEl.innerHTML = '';
  state.days.forEach((day) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'calendar-day';
    button.dataset.date = day.key;
    button.setAttribute('aria-label', day.label);
    if (!day.available) {
      button.classList.add('is-empty');
    }

    button.innerHTML = `
      <div class="day-top">
        <span class="day-number">${day.dayNumber}</span>
        <span class="day-month">${day.monthShort}</span>
      </div>
      <strong>${day.available ? 'Dostępny' : 'Brak slotów'}</strong>
      <div class="day-slots">
        ${day.available ? day.slots.slice(0, 3).map((slot) => `<span>${slot}</span>`).join('') : '<span>—</span>'}
      </div>
    `;

    calendarEl.appendChild(button);
  });
}

function selectDay(key, state, targets) {
  const day = state.days.find((item) => item.key === key);
  if (!day) return;

  state.selectedKey = key;
  state.selectedSlot = day.available ? day.slots[0] : null;

  targets.calendarEl.querySelectorAll('[data-date]').forEach((button) => {
    button.classList.toggle('is-selected', button.dataset.date === key);
  });

  targets.dateLabelEl.textContent = day.label;
  targets.dateNoteEl.textContent = day.available
    ? 'Wybierz godzinę z listy obok, aby podświetlić termin.'
    : 'W tym dniu nie ma wolnych godzin. Wybierz inny dzień.';

  renderSlots(day, state, targets.slotListEl, targets.dateNoteEl);
}

function renderSlots(day, state, slotListEl, dateNoteEl) {
  slotListEl.innerHTML = '';

  if (!day.available) {
    const empty = document.createElement('span');
    empty.className = 'slot-pill is-muted';
    empty.textContent = 'Brak wolnych terminów';
    slotListEl.appendChild(empty);
    return;
  }

  day.slots.forEach((slot) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'slot-pill';
    if (slot === state.selectedSlot) {
      button.classList.add('is-active');
    }
    button.textContent = slot;
    button.addEventListener('click', () => {
      state.selectedSlot = slot;
      slotListEl.querySelectorAll('.slot-pill').forEach((item) => item.classList.remove('is-active'));
      button.classList.add('is-active');
      dateNoteEl.textContent = `Wybrano godzinę ${slot} dla dnia ${day.label}.`;
    });
    slotListEl.appendChild(button);
  });
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatLongDate(date) {
  const value = date.toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return value.charAt(0).toUpperCase() + value.slice(1);
}
