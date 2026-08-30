// Press the probe control, wait for the seven verdicts, and bring them into frame.
const button = [...document.querySelectorAll('button')].find(b => /probe this browser/i.test(b.textContent || ''))
if (!button) return { error: 'probe control not found' }
button.click()
await new Promise(r => setTimeout(r, 3000))
const rows = [...document.querySelectorAll('.console-platform li')]
const panel = document.querySelector('.console-platform')
panel?.scrollIntoView({ block: 'start' })
await new Promise(r => setTimeout(r, 400))
return {
  rows: rows.length,
  verdicts: rows.map(li => ({
    label: li.querySelector('.platform-label')?.textContent?.trim(),
    status: li.querySelector('.platform-status')?.textContent?.trim(),
  })),
}
