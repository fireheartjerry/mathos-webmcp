const kicker = document.querySelector('.kicker')?.textContent?.trim()
const platformRows = [...document.querySelectorAll('.platform-detail')].slice(0, 2).map(e => e.textContent?.trim())
const header = document.querySelector('.agent-console')?.previousElementSibling?.textContent?.trim()
return { kicker, platformRows, toolsHeader: document.body.textContent?.match(/\d+ page tools available/)?.[0] }
