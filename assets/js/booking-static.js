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
    var selectedDateKey = null;
    var selectedMonthKey = null;
    var mobileCalendarEl = null;
    var mobileMonthSelectEl = null;
    var mobileWeeksEl = null;
    var isMobileCalendar = window.matchMedia && window.matchMedia('(max-width: 720px)').matches;

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

    function formatMobileDateLabel(dateKey) {
      return new Intl.DateTimeFormat('pl-PL', {
        weekday: 'short', day: 'numeric', month: 'short'
      }).format(new Date(dateKey + 'T12:00:00'));
    }

    function formatMobileMonthLabel(dateKey) {
      return new Intl.DateTimeFormat('pl-PL', {
        month: 'long', year: 'numeric'
      }).format(new Date(dateKey + 'T12:00:00'));
    }

    function getSortedDateKeys() {
      return Object.keys(slotsByDate).sort();
    }

    function getMonthKey(dateKey) {
      return String(dateKey || '').slice(0, 7);
    }

    function getMonthKeys() {
      var months = [];
      getSortedDateKeys().forEach(function (dateKey) {
        var monthKey = getMonthKey(dateKey);
        if (months.indexOf(monthKey) === -1) {
          months.push(monthKey);
        }
      });
      return months;
    }

    function getMonthDates(monthKey) {
      return getSortedDateKeys().filter(function (dateKey) {
        return getMonthKey(dateKey) === monthKey;
      });
    }

    function formatMonthChoiceLabel(monthKey) {
      return new Intl.DateTimeFormat('pl-PL', {
        month: 'long',
        year: 'numeric'
      }).format(new Date(monthKey + '-01T12:00:00'));
    }

    function formatWeekRangeLabel(startKey, endKey) {
      var formatter = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short' });
      return formatter.format(new Date(startKey + 'T12:00:00')) + ' – ' + formatter.format(new Date(endKey + 'T12:00:00'));
    }

    function getWeekGroups(dateKeys) {
      var groups = [];
      var lookup = {};

      dateKeys.forEach(function (dateKey) {
        var date = new Date(dateKey + 'T12:00:00');
        var dow = date.getDay();
        var shift = dow === 0 ? -6 : 1 - dow;
        var weekStart = new Date(date);
        weekStart.setDate(date.getDate() + shift);
        var startKey = toDateKey(weekStart);

        if (!lookup[startKey]) {
          lookup[startKey] = {
            startKey: startKey,
            endKey: dateKey,
            dates: []
          };
          groups.push(lookup[startKey]);
        }

        lookup[startKey].dates.push(dateKey);
        lookup[startKey].endKey = dateKey;
      });

      return groups;
    }

    function updateMobileSelection(dateKey) {
      if (!mobileCalendarEl) { return; }

      mobileCalendarEl.querySelectorAll('.agentka-mobile-day').forEach(function (button) {
        var isActive = button.getAttribute('data-date-key') === dateKey;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
    }

    function chooseDate(dateKey) {
      selectedDateKey = dateKey;
      renderSlotList(dateKey);
      updateMobileSelection(dateKey);

      if (isMobileCalendar) {
        var nextMonthKey = getMonthKey(dateKey);
        if (nextMonthKey && nextMonthKey !== selectedMonthKey) {
          selectedMonthKey = nextMonthKey;
          if (mobileMonthSelectEl) {
            mobileMonthSelectEl.value = nextMonthKey;
          }
          renderMobileWeeks();
        }
      }
    }

    function renderMobileCalendar() {
      var monthKeys = getMonthKeys();

      calendarEl.classList.add('is-mobile-calendar');
      calendarEl.innerHTML = '';

      mobileCalendarEl = document.createElement('div');
      mobileCalendarEl.className = 'agentka-mobile-calendar';

      var intro = document.createElement('div');
      intro.className = 'agentka-mobile-calendar-head';
      intro.innerHTML =
        '<p class="agentka-kicker">Kalendarz terminów</p>' +
        '<h3>Wybierz miesiąc i tydzień</h3>' +
        '<p>Na telefonie pokazuję miesiącami i tygodniami, żeby lista terminów nie rosła bez końca.</p>';
      mobileCalendarEl.appendChild(intro);

      calendarEl.appendChild(mobileCalendarEl);
      var controls = document.createElement('div');
      controls.className = 'agentka-mobile-calendar-controls';

      var monthLabel = document.createElement('label');
      monthLabel.className = 'agentka-mobile-month-picker';
      monthLabel.innerHTML = '<span>Miesiąc</span>';

      mobileMonthSelectEl = document.createElement('select');
      mobileMonthSelectEl.className = 'agentka-mobile-month-select';
      monthKeys.forEach(function (monthKey) {
        var option = document.createElement('option');
        option.value = monthKey;
        option.textContent = formatMonthChoiceLabel(monthKey);
        mobileMonthSelectEl.appendChild(option);
      });

      if (!selectedMonthKey || monthKeys.indexOf(selectedMonthKey) === -1) {
        selectedMonthKey = getMonthKey(selectedDateKey || firstDate || monthKeys[0] || toDateKey(new Date()));
      }

      mobileMonthSelectEl.value = selectedMonthKey;
      mobileMonthSelectEl.addEventListener('change', function () {
        selectedMonthKey = mobileMonthSelectEl.value;
        renderMobileWeeks();
        var monthDates = getMonthDates(selectedMonthKey);
        if (!monthDates.length) {
          return;
        }

        if (monthDates.indexOf(selectedDateKey) === -1) {
          var firstAvailable = monthDates.find(function (dateKey) {
            return (availableCounts[dateKey] || 0) > 0;
          }) || monthDates[0];
          if (firstAvailable) {
            chooseDate(firstAvailable);
          }
        }
      });

      monthLabel.appendChild(mobileMonthSelectEl);
      controls.appendChild(monthLabel);
      var tip = document.createElement('p');
      tip.textContent = 'Przewiń tygodnie albo zmień miesiąc.';
      controls.appendChild(tip);
      mobileCalendarEl.appendChild(controls);

      mobileWeeksEl = document.createElement('div');
      mobileWeeksEl.className = 'agentka-mobile-weeks';
      mobileCalendarEl.appendChild(mobileWeeksEl);

      renderMobileWeeks();
    }

    function renderMobileWeeks() {
      if (!mobileWeeksEl) {
        return;
      }

      var dateKeys = getMonthDates(selectedMonthKey || getMonthKey(selectedDateKey || firstDate || ''));
      var weekGroups = getWeekGroups(dateKeys);

      mobileWeeksEl.innerHTML = '';

      if (!dateKeys.length) {
        mobileWeeksEl.innerHTML = '<p class="agentka-mobile-empty">Brak terminów w tym miesiącu.</p>';
        return;
      }

      weekGroups.forEach(function (weekGroup) {
        var section = document.createElement('section');
        section.className = 'agentka-mobile-week';

        var availableCount = weekGroup.dates.reduce(function (count, dateKey) {
          return count + (availableCounts[dateKey] || 0);
        }, 0);

        section.innerHTML =
          '<div class="agentka-mobile-week-head">' +
            '<p class="agentka-mobile-week-label">' + formatWeekRangeLabel(weekGroup.startKey, weekGroup.endKey) + '</p>' +
            '<span class="agentka-mobile-week-count">' + availableCount + ' wolne</span>' +
          '</div>';

        var list = document.createElement('div');
        list.className = 'agentka-mobile-week-days';

        weekGroup.dates.forEach(function (dateKey) {
          var avail = availableCounts[dateKey] || 0;
          var button = document.createElement('button');
          button.type = 'button';
          button.className = 'agentka-mobile-day' + (avail ? '' : ' is-empty');
          button.setAttribute('data-date-key', dateKey);
          button.setAttribute('aria-pressed', 'false');
          button.innerHTML =
            '<span class="agentka-mobile-day-top">' +
              '<span class="agentka-mobile-day-date">' + formatMobileDateLabel(dateKey) + '</span>' +
              '<span class="agentka-mobile-day-count">' + (avail ? avail + ' wolne' : 'Brak terminów') + '</span>' +
            '</span>' +
            '<strong>' + (avail ? 'Dotknij, aby zobaczyć godziny' : 'Dzień bez wolnych slotów') + '</strong>';

          button.addEventListener('click', function () {
            chooseDate(dateKey);
          });

          list.appendChild(button);
        });

        section.appendChild(list);
        mobileWeeksEl.appendChild(section);
      });

      updateMobileSelection(selectedDateKey);
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
    selectedDateKey = firstDate;

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
    if (isMobileCalendar) {
      renderMobileCalendar();
      chooseDate(firstDate);
    } else {
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

          chooseDate(info.dateStr);
        }
      });

      calendar.render();

      /* Auto-select first available day */
      calendar.gotoDate(firstDate);
      chooseDate(firstDate);
    }

    /* ── Reset button ── */
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        if (dateTitleEl)  { dateTitleEl.textContent  = 'Wybierz dzień w kalendarzu'; }
        if (dateMetaEl)   { dateMetaEl.textContent   = 'Pokażę tu listę dostępnych godzin dla wybranego dnia.'; }
        if (slotCountEl)  { slotCountEl.textContent  = '0'; }
        if (slotListEl)   { slotListEl.innerHTML = '<p class="agentka-slot-empty">Wybierz dzień z kalendarza, aby zobaczyć godziny.</p>'; }
        if (panelEl)      { panelEl.classList.add('is-hidden'); }
        selectedSlotId = null;
        selectedDateKey = firstDate;
        document.querySelectorAll('.fc-daygrid-day.is-selected').forEach(function (el) {
          el.classList.remove('is-selected');
        });
        updateMobileSelection(firstDate);
        if (calendar && !isMobileCalendar) {
          calendar.gotoDate(firstDate);
        }
        chooseDate(firstDate);
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
