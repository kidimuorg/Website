/* ═══════════════════════════════════════════════════════════════════════════
   kidimu.js — Shared JavaScript for kidimu.org
   Hosted on GitHub, served via jsDelivr CDN.
   Load with <script src="..." defer></script> in each Squarespace code block.

   This file only defines functions — it does not call anything automatically.
   Each page is responsible for calling kidimuTypewriter() after the DOM loads.

   Standard pattern for each page (at the bottom of the code block):

     <script>
       document.addEventListener('DOMContentLoaded', function() {
         kidimuTypewriter('.kidimu-eyebrow');
       });
     </script>

   If Squarespace injects the code block after DOMContentLoaded fires, add
   a setTimeout fallback:

     <script>
       function initPage() { kidimuTypewriter('.kidimu-eyebrow'); }
       if (document.readyState === 'loading') {
         document.addEventListener('DOMContentLoaded', initPage);
       } else {
         initPage();
       }
       setTimeout(initPage, 500); // Squarespace late-injection safety net
     </script>
   ═══════════════════════════════════════════════════════════════════════════ */


/**
 * kidimuTypewriter
 * Types in the eyebrow pill text on page load.
 *
 * Expects this HTML structure inside the eyebrow element:
 *   <span class="kidimu-eyebrow [prefix]-eyebrow">
 *     <span class="kidimu-eyebrow-emoji">🦕</span>
 *     <span class="kidimu-eyebrow-text" data-text="Your Text Here"></span>
 *   </span>
 *
 * The emoji renders immediately; the text types in character by character
 * after a short delay.
 *
 * Because all pages now use the shared class kidimu-eyebrow, the selector
 * can almost always just be '.kidimu-eyebrow'. Pass a more specific selector
 * only if a page has multiple eyebrow pills.
 *
 * @param {string} [selector='.kidimu-eyebrow']  CSS selector for the eyebrow pill
 * @param {number} [charDelay=100]               ms between each character
 * @param {number} [startDelay=200]              ms before typing starts
 */
function kidimuTypewriter(selector, charDelay, startDelay) {
  selector   = selector   !== undefined ? selector   : '.kidimu-type';
  charDelay  = charDelay  !== undefined ? charDelay  : 100;
  startDelay = startDelay !== undefined ? startDelay : 200;

  var el = document.querySelector(selector);
  if (!el) return;

  var textNode = el.querySelector('.kidimu-type-text');
  if (!textNode) return;

  var full = textNode.getAttribute('data-text') || '';
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

(function () {
  function autoInit() {
    document.querySelectorAll('.kidimu-type').forEach(function (pill) {
      kidimuTypewriter('#' + pill.closest('[id]').id + ' .kidimu-type');
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
  setTimeout(autoInit, 500);
})();

function khRunTypewriter() {
  var el = document.querySelector('#kidimu-hours .kidimu-type');
  if (!el) return;
  var emojiEl  = el.querySelector('.kidimu-type-emoji');
  var textNode = el.querySelector('.kidimu-type-text');
  if (!textNode) return;
  var bar = document.getElementById('kh-status-text');
  var statusText = bar ? bar.textContent : '';

  if (/closed/i.test(statusText)) {
    if (emojiEl) emojiEl.textContent = '\uD83D\uDD34';
  } else {
    if (emojiEl) emojiEl.textContent = '\uD83D\uDFE2';
  }

  textNode.textContent = '';
  if (window._khTypewriterTimer) clearTimeout(window._khTypewriterTimer);
  var i = 0;
  function tick() {
    if (i <= statusText.length) {
      textNode.textContent = statusText.slice(0, i);
      i++;
      window._khTypewriterTimer = setTimeout(tick, 55);
    }
  }
  setTimeout(tick, 150);
}


// ─ Load Google Calendar fresh or from cache ─────────────────────────────────────────────
function kidimuLoadCalendar() {
  var dates = kidimuWindowDates();
  var winEnd = new Date(dates[6]); winEnd.setDate(winEnd.getDate() + 1);
  var wLabel = document.getElementById('kidimu-week-label');
  if (wLabel) wLabel.textContent = kidimuFmtMonDay(dates[0]) + ' \u2013 ' + kidimuFmtMonDay(dates[6]);
  // ─ Check session cache and fetch ──────────────────────────────────────────────────────
  var cacheKey = 'kidimu-calendar-' + kidimuDateKey(dates[0]);
  try {
    var cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      kidimuRenderCalendar(JSON.parse(cached), dates);
      return;
    }
  } catch(e) {}
  // ─ Fetch fresh copy from Google Calendar ──────────────────────────────────────────────
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
