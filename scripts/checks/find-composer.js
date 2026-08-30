const inputs = [...document.querySelectorAll('input, textarea, [contenteditable], math-field')]
return inputs.map(el => ({
  tag: el.tagName.toLowerCase(),
  type: el.getAttribute('type'),
  cls: (el.className || '').toString().slice(0, 40),
  placeholder: el.getAttribute('placeholder'),
  disabled: el.disabled ?? null,
}))
