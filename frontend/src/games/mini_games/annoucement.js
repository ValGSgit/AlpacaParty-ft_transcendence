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

export function playCountDown(seconds = 3) {
  makeAnnouncement('Get Ready!', 1000);
  for (let i = 0; i < seconds; i++) {
    setTimeout(() => {
      makeAnnouncement(seconds - i, 1000);
    }, 1000 * i + 1000);
  }
  setTimeout(() => {
    makeAnnouncement('Start!', 1000);
  }, 1000 * seconds + 1000);
}