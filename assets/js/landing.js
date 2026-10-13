(function () {
  'use strict';

  var BASES_2026 = { preferential: 1441.8, full: 5652 };
  var money = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 });
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Standard sickness benefit: daily rate is rounded to grosze before multiplying.
  function calculateL4(values) {
    var income = Math.max(0, Number(values.income) || 0);
    var costs = Math.max(0, Number(values.costs) || 0);
    var days = Math.max(0, Number(values.weeks) || 0) * 7;
    var base = Math.max(0, Number(values.base) || 0);
    var dailyBenefit = values.insured && values.qualified
      ? Math.round(base * 0.8629 * 0.8 / 30 * 100) / 100 : 0;
    var benefit = Math.round(dailyBenefit * days * 100) / 100;
    var normalIncome = income * days / 30;
    return {
      days: days,
      dailyBenefit: dailyBenefit,
      benefit: benefit,
      normalIncome: normalIncome,
      gap: Math.max(0, normalIncome - benefit),
      replacement: normalIncome > 0 ? benefit / normalIncome * 100 : 0,
      costs: costs * days / 30
    };
  }
  window.AgentkaCalculator = Object.freeze({ calculate: calculateL4, bases: BASES_2026 });

  function currency(value) { return money.format(value) + ' zł'; }
  function scrollBehavior() { return reducedMotion.matches ? 'auto' : 'smooth'; }

  function initNavigation() {
    var navLinks = Array.from(document.querySelectorAll('.site-nav a[href^="#"]'));
    var sections = navLinks.map(function (link) { return document.querySelector(link.getAttribute('href')); }).filter(Boolean);
    if (!sections.length || !('IntersectionObserver' in window)) return;
    var start = document.getElementById('start');
    if (start) sections.unshift(start);
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) {
          var active = link.getAttribute('href') === '#' + entry.target.id;
          link.classList.toggle('is-active', active);
          if (active) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-15% 0px -65% 0px', threshold: 0 });
    sections.forEach(function (section) { observer.observe(section); });
  }

  function initCalculator() {
    var controls = document.getElementById('l4-controls');
    if (!controls) return;
    var income = document.getElementById('l4-income');
    var costs = document.getElementById('l4-costs');
    var weeks = document.getElementById('l4-weeks');
    var insured = document.getElementById('l4-insured');
    var qualified = document.getElementById('l4-qualified');
    var customBase = document.getElementById('l4-base');
    var customWrap = document.getElementById('custom-base-wrap');
    var bars = document.getElementById('l4-bars');

    function render() {
      var mode = controls.querySelector('input[name="zus"]:checked').value;
      customWrap.hidden = mode !== 'custom';
      qualified.disabled = !insured.checked;
      customBase.setCustomValidity(mode === 'custom' && !customBase.checkValidity() ? 'Wpisz podstawę od 1 441,80 do 5 652 zł.' : '');
      // Do not show a made-up benefit for an incomplete or out-of-range custom value.
      var baseValid = mode !== 'custom' || (Number(customBase.value) >= 1441.8 && Number(customBase.value) <= 5652);
      var result = calculateL4({ income: income.value, costs: costs.value, weeks: weeks.value,
        base: BASES_2026[mode] || Number(customBase.value), insured: insured.checked, qualified: qualified.checked });
      document.getElementById('income-output').textContent = currency(income.value);
      document.getElementById('costs-output').textContent = currency(costs.value);
      var weekCount = Number(weeks.value);
      var weekLabel = weekCount + (weekCount < 5 ? ' tygodnie' : ' tygodni');
      document.getElementById('weeks-output').textContent = weekLabel;
      document.getElementById('l4-gap').textContent = baseValid ? currency(result.gap) : 'Wpisz podstawę';
      document.getElementById('l4-benefit').textContent = baseValid ? currency(result.benefit) : '—';
      document.getElementById('l4-percent').textContent = baseValid ? money.format(result.replacement) + '%' : '—';
      document.getElementById('l4-total-costs').textContent = currency(result.costs);
      document.getElementById('l4-description').textContent = baseValid
        ? 'Przez ' + weekLabel + ' na L4 zwykły dochód to ' + currency(result.normalIncome) + '. Szacowany zasiłek: ' + currency(result.benefit) + ' brutto.'
        : 'Podaj średnią miesięczną podstawę składek chorobowych: od 1 441,80 do 5 652 zł.';
      var note = !insured.checked ? 'Bez dobrowolnego chorobowego ten model przyjmuje 0 zł zasiłku ZUS. Stałe koszty firmy nadal zostają.'
        : !qualified.checked ? 'Przy braku prawa do zasiłku model przyjmuje 0 zł. Warto sprawdzić okres wyczekiwania i ewentualne wyjątki.'
        : 'Zasiłek pokazujemy brutto, Twój dochód netto. Po podatku luka może być większa. Koszty firmy pokazujemy osobno.';
      document.getElementById('l4-note').textContent = note;
      document.getElementById('l4-chart').setAttribute('aria-label', baseValid
        ? 'Zasiłek ZUS ' + currency(result.benefit) + ' brutto, luka w dochodzie ' + currency(result.gap) + ', za ' + weekLabel + '.'
        : 'Wpisz poprawną podstawę, aby zobaczyć wykres.');
      document.querySelector('.chart-reference').textContent = baseValid && result.benefit > result.normalIncome
        ? 'Zasiłek brutto (wyższy niż dochód netto)' : 'Twój normalny dochód';
      bars.replaceChildren();
      var ratio = baseValid ? Math.min(100, Math.max(0, result.replacement)) : 0;
      for (var i = 0; i < Math.min(weekCount, 13); i += 1) {
        var bar = document.createElement('div');
        bar.className = 'chart-bar';
        bar.setAttribute('aria-hidden', 'true');
        var gapPart = document.createElement('span');
        gapPart.className = 'chart-bar-gap';
        gapPart.style.height = (100 - ratio) + '%';
        var benefitPart = document.createElement('span');
        benefitPart.className = 'chart-bar-zus';
        benefitPart.style.height = ratio + '%';
        bar.append(gapPart, benefitPart);
        bars.appendChild(bar);
      }
      [income, costs, weeks].forEach(function (range) {
        var progress = (Number(range.value) - Number(range.min)) / (Number(range.max) - Number(range.min)) * 100;
        range.style.setProperty('--progress', progress + '%');
        range.setAttribute('aria-valuetext', range === weeks ? weekLabel : currency(range.value));
      });
    }
    controls.addEventListener('submit', function (event) { event.preventDefault(); });
    controls.addEventListener('input', function () {
      customBase.setCustomValidity('');
      render();
    });
    controls.addEventListener('change', render);
    render();
  }

  function initOfferLanguage() {
    var buttons = Array.from(document.querySelectorAll('[data-language]'));
    var descriptions = Array.from(document.querySelectorAll('.offer-description'));
    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        var language = button.dataset.language;
        buttons.forEach(function (item) { item.setAttribute('aria-pressed', String(item === button)); });
        descriptions.forEach(function (description) { description.textContent = description.dataset[language]; });
        document.querySelectorAll('.offer-language').forEach(function (label) { label.textContent = language === 'plain' ? 'Po ludzku' : 'Język polisy'; });
      });
    });
  }

  function initReviews() {
    var track = document.getElementById('review-track');
    if (!track) return;
    var pagination = document.getElementById('reviews-pagination');
    var buttons = Array.from(pagination.querySelectorAll('[data-review-index]'));
    function cardStep() {
      return track.firstElementChild.getBoundingClientRect().width + parseFloat(getComputedStyle(track).gap || 0);
    }
    function update() {
      pagination.hidden = track.scrollWidth <= track.clientWidth + 2;
      var current = Math.min(buttons.length - 1, Math.round(track.scrollLeft / cardStep()));
      buttons.forEach(function (button, index) {
        if (index === current) button.setAttribute('aria-current', 'true');
        else button.removeAttribute('aria-current');
      });
    }
    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        track.scrollTo({ left: cardStep() * Number(button.dataset.reviewIndex), behavior: scrollBehavior() });
      });
    });
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  function initAppointment() {
    var form = document.getElementById('appointment-form');
    if (!form) return;
    var date = document.getElementById('appointment-date');
    var wrapper = document.getElementById('consultation-form');
    var today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    date.min = today;
    document.getElementById('show-consultation').addEventListener('click', function () {
      wrapper.open = true;
    });
    date.addEventListener('input', function () { date.setCustomValidity(''); });
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (date.value < today) {
        date.setCustomValidity('Wybierz dzisiejszy lub przyszły dzień.');
        date.reportValidity();
        return;
      }
      if (!form.reportValidity()) return;
      var data = new FormData(form);
      var message = ['Dzień dobry, chciałabym/chciałbym umówić konsultację.', '',
        'Imię i nazwisko: ' + data.get('name'), 'Telefon: ' + data.get('phone'), 'E-mail: ' + data.get('email'),
        'Temat: ' + data.get('topic'), 'Proponowany dzień: ' + data.get('date'), 'Pora: ' + data.get('time'), '',
        String(data.get('message') || '').trim()].join('\n');
      document.getElementById('appointment-draft-text').value = message;
      document.getElementById('appointment-mail-link').href = 'mailto:mimi017011@gmail.com?subject=' + encodeURIComponent('Konsultacja — ' + data.get('name')) + '&body=' + encodeURIComponent(message);
      document.getElementById('appointment-draft').hidden = false;
      document.getElementById('appointment-status').textContent = 'Wiadomość jest gotowa. Otwórz swoją pocztę lub skopiuj jej treść, a następnie wyślij. Termin potwierdzę po kontakcie.';
      document.getElementById('appointment-draft').scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
    });
    document.getElementById('copy-appointment').addEventListener('click', async function () {
      var draft = document.getElementById('appointment-draft-text');
      try {
        await navigator.clipboard.writeText(draft.value);
        document.getElementById('appointment-status').textContent = 'Skopiowano wiadomość. Wklej ją do e-maila na mimi017011@gmail.com i wyślij.';
      } catch (error) {
        draft.focus(); draft.select();
        document.getElementById('appointment-status').textContent = 'Zaznaczyłem treść wiadomości. Skopiuj ją skrótem Ctrl+C lub poleceniem Kopiuj.';
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initNavigation(); initCalculator(); initOfferLanguage(); initReviews(); initAppointment();
  });
})();
