const panel = document.querySelector('.agent-console')
if (!panel) return { error: 'no .agent-console' }
const groups = [...document.querySelectorAll('.console-group-head')].map(b => {
  const r = b.getBoundingClientRect()
  return {
    label: b.querySelector('.console-group-label')?.textContent,
    count: b.querySelector('.console-group-count')?.textContent,
    inViewport: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth,
    h: Math.round(r.height),
  }
})
const scroller = [...document.querySelectorAll('*')].filter(e => {
  const st = getComputedStyle(e)
  return /auto|scroll/.test(st.overflowY) && e.scrollHeight > e.clientHeight + 1
}).map(e => e.className?.toString?.().slice(0, 40))
return {
  viewport: [innerWidth, innerHeight],
  groups,
  allInViewport: groups.every(g => g.inViewport),
  pageScrolls: document.documentElement.scrollHeight > innerHeight + 1,
  scrollers: scroller,
}
