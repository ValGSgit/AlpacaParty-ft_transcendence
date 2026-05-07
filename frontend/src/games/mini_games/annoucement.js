export function makeAnnouncement(text, time) {
  const el = document.createElement('div');
  el.className = 'announcement';
  el.innerText = text

  document.body.appendChild(el);

  setTimeout(() => {
    if (el.parentNode) {
      el.remove();
    }
  }, time);
}