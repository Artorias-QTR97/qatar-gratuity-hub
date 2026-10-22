// "Copy link" buttons: copy the page URL and briefly confirm.
document.addEventListener('click', async (event) => {
  const button = (event.target as Element | null)?.closest<HTMLButtonElement>('[data-copy-link]');
  if (!button) return;
  const url = button.dataset.copyLink ?? location.href;
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    window.prompt('', url);
    return;
  }
  button.textContent = button.dataset.copiedText ?? '';
  window.setTimeout(() => {
    button.textContent = button.dataset.copyText ?? '';
  }, 2000);
});
