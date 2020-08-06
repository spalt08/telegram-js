// The default promise rejection handler prints '[object Object]' instead of error objects for API errors in Safari
window.addEventListener('unhandledrejection', (event) => {
  event.preventDefault();
  // eslint-disable-next-line no-console
  console.error('Uncaught (in promise)', event.reason);
});
