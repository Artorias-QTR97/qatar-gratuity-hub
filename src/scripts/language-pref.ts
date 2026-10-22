// Remembers the chosen language. This is the only thing the site stores on the device.
export const LANG_KEY = 'qsh:lang';

export function savedLanguage(): string | null {
  try {
    return localStorage.getItem(LANG_KEY);
  } catch {
    return null;
  }
}

function saveLanguage(code: string) {
  try {
    localStorage.setItem(LANG_KEY, code);
  } catch {
    /* storage unavailable: nothing to do */
  }
}

document.addEventListener('click', (event) => {
  const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('[data-set-lang]');
  if (link?.dataset.setLang) saveLanguage(link.dataset.setLang);
});

// Close the language menu when clicking outside it.
document.addEventListener('click', (event) => {
  for (const menu of document.querySelectorAll<HTMLDetailsElement>('header details[open]')) {
    if (!menu.contains(event.target as Node)) menu.open = false;
  }
});
