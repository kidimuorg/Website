/* ═════════════════════════════════════════════════════════════════════════════════════════
   kidimu.js — Shared JavaScript for kidimu.org
   Hosted on GitHub, served via jsDelivr CDN.
   <script src="https://cdn.jsdelivr.net/gh/kidimuorg/website@main/kidimu.js" defer></script>
═════════════════════════════════════════════════════════════════════════════════════════ */
/* ═ Calendar HTML in <script> ═════════════════════════════════════════════════════════════
  var KIDIMU_CAL_ID  = 'svc-kidimu@kidimu.org';
  var KIDIMU_API_KEY = 'AIzaSyAcWpCl34TJCmc3AMgqZNYjKxScf524maE';

  function hoursInit() {
    if (typeof kidimuLoadCalendar !== 'function') { setTimeout(hoursInit, 50); return; }
    kidimuLoadCalendar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hoursInit);
  } else {
    hoursInit();
  }
═════════════════════════════════════════════════════════════════════════════════════════ */
/* ─ Calendar helpers ─────────────────────────────────────────────────────────────────── */
/* ─ Converts the JS data into Pacific time ───────────────────────────────────────────── */
function kidimuPacific(date) {
  var parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year:'numeric', month:'2-digit', day:'2-digit',
    hour:'numeric', minute:'2-digit', hour12:true, weekday:'short'
  }).formatToParts(date);
  var m = {}; parts.forEach(function(p){ m[p.type] = p.value; }); return m;
}
/* ─ Converts the time to readable like 10AM ──────────────────────────────────────────── */
function kidimuFmtTime(dateStr) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone:'America/Los_Angeles', hour:'numeric', minute:'2-digit', hour12:true
  }).format(new Date(dateStr)).replace(':00','');
}
/* ─ Returns today's date at midnight Pacific time ────────────────────────────────────── */
function kidimuTodayPacific() {
  var p = kidimuPacific(new Date());
  return new Date(p.year + '-' + p.month + '-' + p.day + 'T00:00:00');
}
/* ─ Builds the 7-day array starting 2 days back ──────────────────────────────────────── */
function kidimuWindowDates() {
  var today = kidimuTodayPacific(), dates = [];
  for (var i = -2; i <= 4; i++) {
    var d = new Date(today); d.setDate(today.getDate() + i); dates.push(d);
  }
  return dates;
}
/* ─ Converts date to string to group events ──────────────────────────────────────────── */
function kidimuDateKey(date) {
  var parts = new Intl.DateTimeFormat('en-US', {
    timeZone:'America/Los_Angeles', year:'numeric', month:'2-digit', day:'2-digit'
  }).formatToParts(date);
  var m = {}; parts.forEach(function(p){ m[p.type] = p.value; });
  return m.year + '-' + m.month + '-' + m.day;
}
/* ─ Creates the date week label ──────────────────────────────────────────────────────── */
function kidimuFmtMonDay(date) {
  return date.toLocaleDateString('en-US', { month:'short', day:'numeric', timeZone:'America/Los_Angeles' });
}
/* ─ Converts time to minutes for time slot comparisons ───────────────────────────────── */
function kidimuTimeToMins(dateStr) {
  var parts = new Intl.DateTimeFormat('en-US', {
    timeZone:'America/Los_Angeles', hour:'numeric', minute:'numeric', hour12:false
  }).format(new Date(dateStr)).split(':');
  return parseInt(parts[0],10)*60 + parseInt(parts[1],10);
}
/* ─ Creates the HTML string for the time pill ────────────────────────────────────────── */
function kidimuTagHTML(cls, text) {
  return '<span class="hours-tag ' + cls + '">' + text + '</span>';
}
/* ─ Calendar render ──────────────────────────────────────────────────────────────────── */
/* ─ Sets all variables ───────────────────────────────────────────────────────────────── */
var KIDIMU_CANCELLED_RE = /^CANCELLED:\s*/i;
var KIDIMU_PUBLIC_RE    = /KiDiMu\s*Open/i;
var KIDIMU_MINIMU_RE    = /MiniMu/i;
var KIDIMU_ARTWALK_RE   = /Art\s*Walk/i;
var KIDIMU_NIGHT_RE     = /Night\s*at\s*the\s*Mini\s*Museum/i;
/* ─ Load Google Calendar fresh or from cache ─────────────────────────────────────────── */
function kidimuLoadCalendar() {
  var dates = kidimuWindowDates();
  var winEnd = new Date(dates[6]); winEnd.setDate(winEnd.getDate() + 1);
  var wLabel = document.getElementById('kidimu-week-label');
  if (wLabel) wLabel.textContent = kidimuFmtMonDay(dates[0]) + ' \u2013 ' + kidimuFmtMonDay(dates[6]);
  /* ─ Check session cache and fetch ──────────────────────────────────────────────────── */
  var cacheKey = 'kidimu-calendar-' + kidimuDateKey(dates[0]);
  try {
    var cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      kidimuRenderCalendar(JSON.parse(cached), dates);
      return;
    }
  } catch(e) {}
  /* ─ Fetch fresh copy from Google Calendar ──────────────────────────────────────────── */
  var url = 'https://www.googleapis.com/calendar/v3/calendars/'
          + encodeURIComponent(KIDIMU_CAL_ID)
          + '/events?key=' + KIDIMU_API_KEY
          + '&timeMin=' + encodeURIComponent(dates[0].toISOString())
          + '&timeMax=' + encodeURIComponent(winEnd.toISOString())
          + '&singleEvents=true&orderBy=startTime&maxResults=100';
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.onload = function() {
    if (xhr.status === 200) {
      var items = JSON.parse(xhr.responseText).items || [];
      try { sessionStorage.setItem(cacheKey, JSON.stringify(items)); } catch(e) {}
      kidimuRenderCalendar(items, dates);
    } else {
      kidimuCalendarError('Could not load calendar. Please call us or check our social media for current hours.');
    }
  };
  xhr.onerror = function() {
    kidimuCalendarError('Could not reach the calendar. Please call us for current hours.');
  };
  xhr.send();
}
/* ─ Sorts and creates all the visuals ────────────────────────────────────────────────── */
function kidimuRenderCalendar(events, dates) {
  var byDay = {}, hasSpecial = { minimu:false, artwalk:false, night:false };
  dates.forEach(function(d){ byDay[kidimuDateKey(d)] = []; });
  events.forEach(function(ev) {
    var rawTitle  = ev.summary || '';
    var cancelled = KIDIMU_CANCELLED_RE.test(rawTitle);
    var title     = rawTitle.replace(KIDIMU_CANCELLED_RE, '');
    var start     = ev.start.dateTime || ev.start.date;
    var dk        = kidimuDateKey(new Date(start));
    if (!byDay[dk]) return;
    var type = 'public';
    if (KIDIMU_MINIMU_RE.test(title))       { type = 'minimu';  hasSpecial.minimu  = true; }
    else if (KIDIMU_ARTWALK_RE.test(title)) { type = 'artwalk'; hasSpecial.artwalk = true; }
    else if (KIDIMU_NIGHT_RE.test(title))   { type = 'night';   hasSpecial.night   = true; }
    else if (!KIDIMU_PUBLIC_RE.test(title)) return;
    byDay[dk].push({ type:type, cancelled:cancelled, start:start, end:ev.end.dateTime||ev.end.date, allDay:!ev.start.dateTime });
  });
  var todayKey = kidimuDateKey(kidimuTodayPacific());
  var nowMins  = (function() {
    var t = new Intl.DateTimeFormat('en-US', {
      timeZone:'America/Los_Angeles', hour:'numeric', minute:'numeric', hour12:false
    }).format(new Date()).split(':');
    return parseInt(t[0],10)*60 + parseInt(t[1],10);
  })();
  var rowsHTML = '', hasAnyEvents = false, openNow = false, cancelledEntries = [];
  dates.forEach(function(dateObj) {
    var dk        = kidimuDateKey(dateObj);
    var isToday   = (dk === todayKey);
    var isPast    = (dk < todayKey);
    var dayEvents = byDay[dk] || [];
    var active    = dayEvents.filter(function(e){ return !e.cancelled; });
    var cancelled = dayEvents.filter(function(e){ return e.cancelled; });
    var rowClass  = isToday ? 'hours-row hours-today-row' : (isPast ? 'hours-row hours-past-row' : 'hours-row');
    var dayName   = dateObj.toLocaleDateString('en-US', { timeZone:'America/Los_Angeles', weekday:'long' });
    var shortDate = dateObj.toLocaleDateString('en-US', { timeZone:'America/Los_Angeles', month:'short', day:'numeric' });
    var todayBadge = isToday ? '<span class="hours-today-badge">Today</span>' : '';
    rowsHTML += '<div class="' + rowClass + '">';
    rowsHTML += '<span class="hours-day">' + dayName + '<span class="hours-day-date">' + shortDate + '</span>' + todayBadge + '</span>';
    rowsHTML += '<div class="hours-right">';
    if (active.length === 0 && cancelled.length === 0) {
      rowsHTML += '<span class="hours-closed">Closed</span>';
    } else {
      active.forEach(function(ev) {
        hasAnyEvents = true;
        var timeStr = '';
        if (!ev.allDay) {
          timeStr = kidimuFmtTime(ev.start) + ' \u2013 ' + kidimuFmtTime(ev.end);
          if (isToday && ev.type === 'public') {
            var s = kidimuTimeToMins(ev.start), e = kidimuTimeToMins(ev.end);
            if (nowMins >= s && nowMins < e) openNow = true;
          }
        }
        var cls = ev.type === 'minimu' ? 'hours-tag-minimu'
                : ev.type === 'artwalk' ? 'hours-tag-artwalk'
                : ev.type === 'night'   ? 'hours-tag-night'
                : 'hours-tag-public';
        rowsHTML += kidimuTagHTML(cls, timeStr || 'See calendar');
      });
      cancelled.forEach(function(ev) {
        var timeStr = !ev.allDay ? kidimuFmtTime(ev.start) + ' \u2013 ' + kidimuFmtTime(ev.end) : '';
        rowsHTML += kidimuTagHTML('hours-tag-cancelled', timeStr || 'Cancelled');
        if (!isPast) {
          var name = ev.type === 'minimu' ? 'MiniMu' : ev.type === 'artwalk' ? 'Art Walk' : ev.type === 'night' ? 'Night at the Mini Museum' : 'KiDiMu Open';
          cancelledEntries.push({ name:name, dayName:dayName, shortDate:shortDate, isToday:isToday });
        }
      });
      if (active.length === 0) rowsHTML += '<span class="hours-closed" style="margin-left:4px;">Closed</span>';
    }
    rowsHTML += '</div></div>';
  });
  if (!hasAnyEvents && cancelledEntries.length === 0) {
    rowsHTML = '<div class="hours-cal-error">No hours found for this period. Please call us or check our social media for current hours.</div>';
  }
  var body = document.getElementById('hours-body');
  if (body) body.innerHTML = rowsHTML;
  var legend = document.getElementById('hours-legend');
  if (legend) {
    legend.style.display = '';
    if (hasSpecial.minimu)  { var el = legend.querySelector('.hours-legend-minimu');  if(el) el.style.display=''; }
    if (hasSpecial.artwalk) { var el = legend.querySelector('.hours-legend-artwalk'); if(el) el.style.display=''; }
    if (hasSpecial.night)   { var el = legend.querySelector('.hours-legend-night');   if(el) el.style.display=''; }
  }
  var ribbonEl = document.getElementById('hours-cancel-ribbons');
  if (ribbonEl) {
    ribbonEl.innerHTML = cancelledEntries.map(function(c) {
      var when = c.isToday ? 'today (' + c.shortDate + ')' : c.dayName + ' ' + c.shortDate;
      return '<div class="hours-cancel-alert"><span>&#9888;&#65039;</span><div><strong>' + c.name + ' \u2014 ' + when + ' is cancelled</strong></div></div>';
    }).join('');
  }
  kidimuUpdateHours(openNow, byDay, todayKey, nowMins, dates);
}
/* ─ Determines the Hours page typewriter text ────────────────────────────────────────── */
function kidimuUpdateHours(openNow, byDay, todayKey, nowMins, dates) {
  var statusText = '';
  var emoji = '';
  if (openNow) {
    emoji = '\uD83D\uDFE2'; // 🟢
    var session = null;
    (byDay[todayKey] || []).filter(function(e){ return e.type==='public' && !e.cancelled && !e.allDay; }).forEach(function(ev){
      var s = kidimuTimeToMins(ev.start), e = kidimuTimeToMins(ev.end);
      if (nowMins >= s && nowMins < e) session = ev;
    });
    statusText = session ? 'Open now until ' + kidimuFmtTime(session.end) : 'Open now';
  } else {
    emoji = '\uD83D\uDD34'; // 🔴
    var nextEv = null;
    var today = kidimuTodayPacific();
    var tomorrow = new Date(today.getTime() + 86400000);
    dates.filter(function(d){ return d >= today; }).forEach(function(d) {
      if (nextEv) return;
      var dk = kidimuDateKey(d), isToday = (dk === todayKey);
      (byDay[dk] || []).filter(function(e){ return e.type==='public' && !e.allDay && !e.cancelled; }).forEach(function(ev){
        if (nextEv) return;
        if (isToday && kidimuTimeToMins(ev.start) <= nowMins) return;
        nextEv = { ev:ev, dk:dk, d:d };
      });
    });
    if (nextEv) {
      var todayDk    = kidimuDateKey(today);
      var tomorrowDk = kidimuDateKey(tomorrow);
      var label = nextEv.dk === todayDk    ? kidimuFmtTime(nextEv.ev.start) + ' today'
                : nextEv.dk === tomorrowDk ? kidimuFmtTime(nextEv.ev.start) + ' tomorrow'
                : nextEv.d.toLocaleDateString('en-US',{timeZone:'America/Los_Angeles',weekday:'long'}) + ' at ' + kidimuFmtTime(nextEv.ev.start);
      statusText = 'Currently closed \u2014 opens ' + label;
    } else {
      statusText = 'Currently closed';
    }
  }
  kidimuRunTypewriter('#hours .kidimu-type', emoji, statusText);
}
/* ─ Creates error message if needed ──────────────────────────────────────────────────── */
function kidimuCalendarError(msg) {
  var body = document.getElementById('hours-body');
  if (body) body.innerHTML = '<div class="hours-cal-error">' + msg + '</div>';
  kidimuRunTypewriter('#hours .kidimu-type', '\uD83D\uDD34', 'We are sorry there was an error. Please call us for today\u2019s hours');
}

/* ═ Typewriter HTML layout called by the calendar ═════════════════════════════════════════
    <span class="kidimu-type">
      <span class="kidimu-type-emoji">🕐</span>
      <span class="kidimu-type-text" data-text="Type your text here"></span>
    </span>
═════════════════════════════════════════════════════════════════════════════════════════ */
/* ─ Generic typewriter reads data-text from the span ─────────────────────────────────── */
function kidimuTypewriter(selector, charDelay, startDelay) {
  selector   = selector   !== undefined ? selector   : '.kidimu-type';
  charDelay  = charDelay  !== undefined ? charDelay  : 100;
  startDelay = startDelay !== undefined ? startDelay : 200;

  var el = document.querySelector(selector);
  if (!el) return;

  var textNode = el.querySelector('.kidimu-type-text');
  if (!textNode) return;

  var full = textNode.getAttribute('data-text') || '';
  if (!full) return;

  textNode.textContent = '';
  var i = 0;

  function tick() {
    if (i <= full.length) {
      textNode.textContent = full.slice(0, i);
      i++;
      setTimeout(tick, charDelay);
    }
  }
  setTimeout(tick, startDelay);
}
/* ─ Runs typewriter with one off information  ────────────────────────────────────────── */
function kidimuRunTypewriter(selector, emoji, statusText) {
  var el = document.querySelector(selector);
  if (!el) return;
  var emojiEl  = el.querySelector('.kidimu-type-emoji');
  var textNode = el.querySelector('.kidimu-type-text');
  if (!textNode) return;
  if (emojiEl && emoji) emojiEl.textContent = emoji;
  textNode.setAttribute('data-text', statusText);
  if (window._kidimuTypewriterTimer) clearTimeout(window._kidimuTypewriterTimer);
  if (window._kidimuTypewriterStart) clearTimeout(window._kidimuTypewriterStart);
  textNode.textContent = '';
  var i = 0;
  function tick() {
    if (i <= statusText.length) {
      textNode.textContent = statusText.slice(0, i);
      i++;
      window._kidimuTypewriterTimer = setTimeout(tick, 55);
    }
  }
  window._kidimuTypewriterStart = setTimeout(tick, 150);
}
/* ─ Auto-init: runs kidimuTypewriter on every static pill on page load ───────────────── */
(function () {
  function autoInit() {
    document.querySelectorAll('.kidimu-type').forEach(function (pill) {
      var textNode = pill.querySelector('.kidimu-type-text');
      if (!textNode || !textNode.getAttribute('data-text')) return;
      var parent = pill.closest('[id]');
      if (!parent) return;
      kidimuTypewriter('#' + parent.id + ' .kidimu-type');
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
})();
