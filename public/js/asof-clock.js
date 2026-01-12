(function() {
  function getHongKongTime() {
    var now = new Date();
    var utcMillis = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utcMillis + 8 * 60 * 60000);
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  function formatAsOf(date) {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var seconds = date.getSeconds();
    var ampm = hours >= 12 ? 'PM' : 'AM';
    var hours12 = hours % 12;
    if (hours12 === 0) hours12 = 12;
    return hours12 + ':' + pad(minutes) + ':' + pad(seconds) + ' ' + ampm + ' (GMT+8 — Hong Kong)';
  }

  function updateAsOf() {
    var els = document.querySelectorAll('#as-of-time');
    if (!els || els.length === 0) return;
    var text = formatAsOf(getHongKongTime());
    els.forEach(function(el) {
      el.textContent = text;
      el.setAttribute('aria-label', 'As of ' + text);
    });
  }

  function start() {
    updateAsOf();
    // update every second
    setInterval(updateAsOf, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
