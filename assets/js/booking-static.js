/* booking-static.js — static demo of the FullCalendar-based booking widget.
   Mirrors the logic of the WordPress agentka-calendar plugin (public.js)
   but uses hardcoded demo slots instead of AJAX.
   Requires: FullCalendar index.global.min.js loaded BEFORE this file.
*/
(function () {
  'use strict';

  /* ── 1. Build demo slot data for current month + next few weeks ── */
  var DEMO_SLOTS = (function () {
    var slots = [];
    var id = 1;

    function pad(v) { return String(v).padStart(2, '0'); }

    /* Days that have some/all slots already "booked" for demo realism */
    var fullyBooked = {
      '2026-05-15': true,
      '2026-05-20': true,
      '2026-05-28': true
    };
    var partiallyBooked = {
      '2026-05-13': ['10:30', '14:00'],
      '2026-05-14': ['09:00'],
      '2026-05-19': ['14:00'],
      '2026-05-22': ['10:30'],
      '2026-05-27': ['09:00'],
      '2026-06-02': ['10:30', '14:00']
    };

    var times = ['09:00', '10:30', '14:00'];

    /* Generate slots Mon-Fri from 2026-05-13 to 2026-06-12 */
    var d = new Date('2026-05-13T12:00:00');
    var end = new Date('2026-06-13T00:00:00');

    while (d < end) {
      var dow = d.getDay();
      if (dow !== 0 && dow !== 6) {
        var dateKey = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());

        times.forEach(function (t) {
          var available = true;
          if (fullyBooked[dateKey]) {
            available = false;
          } else if (partiallyBooked[dateKey] && partiallyBooked[dateKey].indexOf(t) !== -1) {
            available = false;
          }

          var dateLabel = new Intl.DateTimeFormat('pl-PL', {
            weekday: 'short', day: 'numeric', month: 'long'
          }).format(new Date(dateKey + 'T12:00:00'));

          slots.push({
            id: id++,
            date_key: dateKey,
            datetime: dateKey + 'T' + t + ':00',
            time_label: t,
            label: dateLabel + ' — ' + t,
            available: available
          });
        });
      }
      d.setDate(d.getDate() + 1);
    }

    return slots;
  }());

  /* ── 2. Boot after DOM ready ── */
  document.addEventListener('DOMContentLoaded', function () {
    var calendarEl = document.getElementById('agentka-calendar');
    if (!calendarEl || typeof FullCalendar === 'undefined') { return; }

    /* Sidebar refs */
    var slotListEl      = document.getElementById('agentka-slot-list');
    var dateTitleEl     = document.getElementById('agentka-selected-date-text');
    var dateMetaEl      = document.getElementById('agentka-selected-date-meta');
    var slotCountEl     = document.getElementById('agentka-slot-count');
    var panelEl         = document.getElementById('agentka-booking-panel');
    var formEl          = document.getElementById('agentka-booking');
    var slotIdInput     = formEl ? formEl.querySelector('[name="slot_id"]') : null;
    var statusEl        = document.getElementById('agentka-booking-status');
    var resetBtn        = document.getElementById('agentka-reset-selection');
    var slotTextEl      = document.getElementById('agentka-selected-slot-text');

    var calendar;
    var selectedSlotId = null;

    /* ── Lookup maps ── */
    var slotsByDate    = {};
    var availableCounts = {};
    var firstDate      = null;

    function pad(v) { return String(v).padStart(2, '0'); }

    function toDateKey(date) {
      return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
    }

    function formatDateLabel(dateKey) {
      return new Intl.DateTimeFormat('pl-PL', {
        weekday: 'long', day: 'numeric', month: 'long'
      }).format(new Date(dateKey + 'T12:00:00'));
    }

    DEMO_SLOTS.forEach(function (slot) {
      var dk = slot.date_key;
      if (!slotsByDate[dk]) { slotsByDate[dk] = []; }
      slotsByDate[dk].push(slot);
      if (slot.available) {
        availableCounts[dk] = (availableCounts[dk] || 0) + 1;
        if (!firstDate) { firstDate = dk; }
      }
    });

    if (!firstDate) { firstDate = toDateKey(new Date()); }

    /* ── Day cell annotation (mirrors annotateDayCells in public.js) ── */
    function annotateDayCells(info) {
      var dateKey = toDateKey(info.date);
      var count   = availableCounts[dateKey] || 0;
      if (!count) { return; }

      info.el.classList.add('agentka-day-has-slots');

      var badge = document.createElement('span');
      badge.className = 'agentka-day-badge';
      badge.textContent = count + ' wolne';
      info.el.appendChild(badge);
    }

    /* ── Render slot list in sidebar ── */
    function renderSlotList(dateKey) {
      selectedSlotId = null;
      if (slotIdInput) { slotIdInput.value = ''; }
      if (panelEl)     { panelEl.classList.add('is-hidden'); }
      if (statusEl)    { statusEl.textContent = ''; statusEl.className = 'agentka-booking-status'; }

      var avail = availableCounts[dateKey] || 0;

      if (dateTitleEl) { dateTitleEl.textContent = formatDateLabel(dateKey); }
      if (dateMetaEl)  {
        dateMetaEl.textContent = avail
          ? 'Wybierz godzinę z listy poniżej.'
          : 'Brak wolnych terminów w tym dniu.';
      }
      if (slotCountEl) { slotCountEl.textContent = String(avail); }

      if (!slotListEl) { return; }

      var slots = slotsByDate[dateKey] || [];

      if (!slots.length) {
        slotListEl.innerHTML = '<p class="agentka-slot-empty">Wybierz dzień z kalendarza, aby zobaczyć godziny.</p>';
        return;
      }

      slotListEl.innerHTML = '';
      slots.forEach(function (slot) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'agentka-slot-button' + (slot.available ? '' : ' is-disabled');
        if (!slot.available) { btn.disabled = true; }
        btn.innerHTML =
          '<span><strong>' + slot.time_label + '</strong></span>' +
          '<span>' + (slot.available ? 'Wolny' : 'Zajęty') + '</span>';

        if (slot.available) {
          btn.addEventListener('click', function () {
            document.querySelectorAll('.agentka-slot-button.is-active').forEach(function (el) {
              el.classList.remove('is-active');
            });
            btn.classList.add('is-active');
            selectedSlotId = slot.id;
            if (slotIdInput)  { slotIdInput.value = slot.id; }
            if (slotTextEl)   { slotTextEl.textContent = formatDateLabel(slot.date_key) + ', godz. ' + slot.time_label; }
            if (panelEl)      { panelEl.classList.remove('is-hidden'); }
          });
        }

        slotListEl.appendChild(btn);
      });
    }

    /* ── Create FullCalendar instance (1:1 with createCalendar() in public.js) ── */
    calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'dayGridMonth',
      locale: 'pl',
      firstDay: 1,           /* Monday first — standard PL calendar */
      height: 'auto',
      expandRows: false,
      fixedWeekCount: false,
      headerToolbar: {
        left:   'prev,next today',
        center: 'title',
        right:  ''
      },
      selectable: true,
      navLinks: false,
      /* No events array — exactly like the WP plugin.
         Available days are marked via dayCellDidMount badges only. */
      dayCellDidMount: annotateDayCells,
      dateClick: function (info) {
        /* Highlight selected day */
        document.querySelectorAll('.fc-daygrid-day.is-selected').forEach(function (el) {
          el.classList.remove('is-selected');
        });
        if (info.dayEl) { info.dayEl.classList.add('is-selected'); }

        renderSlotList(info.dateStr);
        calendar.gotoDate(info.dateStr);
      }
    });

    calendar.render();

    /* Auto-select first available day */
    calendar.gotoDate(firstDate);
    renderSlotList(firstDate);

    /* ── Reset button ── */
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        if (dateTitleEl)  { dateTitleEl.textContent  = 'Wybierz dzień w kalendarzu'; }
        if (dateMetaEl)   { dateMetaEl.textContent   = 'Pokażę tu listę dostępnych godzin dla wybranego dnia.'; }
        if (slotCountEl)  { slotCountEl.textContent  = '0'; }
        if (slotListEl)   { slotListEl.innerHTML = '<p class="agentka-slot-empty">Wybierz dzień z kalendarza, aby zobaczyć godziny.</p>'; }
        if (panelEl)      { panelEl.classList.add('is-hidden'); }
        selectedSlotId = null;
        document.querySelectorAll('.fc-daygrid-day.is-selected').forEach(function (el) {
          el.classList.remove('is-selected');
        });
      });
    }

    /* ── Form: demo message on submit ── */
    if (formEl) {
      formEl.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!selectedSlotId) {
          if (statusEl) {
            statusEl.className = 'agentka-booking-status is-error';
            statusEl.textContent = 'Najpierw wybierz godzinę z listy terminów.';
          }
          return;
        }
        if (statusEl) {
          statusEl.className = 'agentka-booking-status';
          statusEl.textContent = 'Wersja demonstracyjna — formularz nie wysyła danych. W pełnej wersji rezerwacja trafia do systemu.';
        }
      });
    }
  });

}());
