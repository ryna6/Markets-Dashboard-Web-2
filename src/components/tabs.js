// components/tabs.js
export function initTabs() {
  const tabs = document.querySelectorAll('#tab-bar .tab');
  const views = document.querySelectorAll('.tab-view');

  function activate(name) {
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    views.forEach(v => v.classList.toggle('active', v.id.startsWith(name)));
  }

  tabs.forEach(t => {
    t.addEventListener('click', () => {
      activate(t.dataset.tab);
    });
  });

  // Default: S&P 500
  activate('sp500');
}
