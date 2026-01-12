// dashboard_common.js
// Contains chart rendering and UI toggle logic moved from dashboard_recreated.js

function initRecreatedMap(){
  // center from incireport table: 14.2735 N, 121.0471 E
  const center = { lat: 14.27835, lng: 121.05366 };
  const map = new google.maps.Map(document.getElementById('map'), {
    zoom: 13,
    center,
    mapTypeId: 'roadmap'
  });

  // sample heat points near center
  const heatPoints = [
    new google.maps.LatLng(14.27835,121.05366)
  ];

  const heatmap = new google.maps.visualization.HeatmapLayer({
    data: heatPoints,
    radius: 40,
    dissipating: true,
    map: map
  });

  // simple marker for the center
  new google.maps.Marker({ position: center, map, title: 'Center' });
}

// Chart.js trends
(function renderChart(){
  const canvas = document.getElementById('trendsChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const labels = ['Item 1','Item 2','Item 3','Item 4','Item 5','Item 6','Item 7','Item 8','Item 9','Item 10','Item 11','Item 12'];
  const data = {
    labels,
    datasets: [
      {
        label: 'Series 1',
        data: [0,10,20,30,25,15,20,35,40,45,30,10],
        fill: true,
        backgroundColor: 'rgba(97, 199, 230, 0.25)',
        borderColor: 'rgba(97,199,230,0.9)',
        tension: 0.4
      },
      {
        label: 'Series 2',
        data: [0,5,12,22,30,28,15,10,18,25,22,8],
        fill: true,
        backgroundColor: 'rgba(101,194,149,0.22)',
        borderColor: 'rgba(101,194,149,0.95)',
        tension: 0.4
      }
    ]
  };

  new Chart(ctx, {
    type: 'line',
    data: data,
    options: {
      responsive: true,
      plugins: { legend: { position: 'top' } },
      scales: { y: { beginAtZero: true } }
    }
  });
})();

// Simulation toggle UI
document.addEventListener('DOMContentLoaded', function () {
  const btn = document.getElementById('simToggle');
  if (!btn) return;

  // helper for persisted preference (default true)
  function getPersistedPref() {
    try {
      const v = localStorage.getItem('simEnabled');
      return v === null ? true : (v === 'true');
    } catch (e) {
      return true;
    }
  }

  function setPersistedPref(enabled) {
    try { localStorage.setItem('simEnabled', enabled ? 'true' : 'false'); } catch (e) {}
  }

  function updateButton() {
    const running = (typeof window.isSimulationRunning === 'function') ? window.isSimulationRunning() : false;
    // If simulation isn't running but persisted pref is true, show On (will start when map init happens)
    const pref = getPersistedPref();
    const labelOn = running || pref;
    btn.textContent = labelOn ? 'Simulation: On' : 'Simulation: Off';
    btn.setAttribute('aria-pressed', labelOn ? 'true' : 'false');
  }

  btn.addEventListener('click', function () {
    const running = (typeof window.isSimulationRunning === 'function') ? window.isSimulationRunning() : false;
    const pref = getPersistedPref();
    // toggle persisted preference
    const newPref = !pref;
    setPersistedPref(newPref);
    if (running && !newPref) {
      if (typeof window.stopSimulation === 'function') window.stopSimulation();
    } else if (!running && newPref) {
      if (typeof window.startSimulation === 'function') window.startSimulation();
    }
    setTimeout(updateButton, 250);
  });

  // initial state: ensure simulator matches persisted pref
  setTimeout(function () {
    const pref = getPersistedPref();
    const running = (typeof window.isSimulationRunning === 'function') ? window.isSimulationRunning() : false;
    if (pref && !running) {
      if (typeof window.startSimulation === 'function') window.startSimulation();
    }
    if (!pref && running) {
      if (typeof window.stopSimulation === 'function') window.stopSimulation();
    }
    updateButton();
  }, 300);
});
