if(navigator.serviceWorker) {
  navigator.serviceWorker.register('/sw.js')
    .then((reg) => console.log('sw registered', reg))
    .catch((err) => console.error('sw not registered', err))
}