/**
 * A judge's first-ever visit: no stored session, no cache warmed by earlier runs.
 * Everything a first load must get right, checked in the state a first load is in.
 */
const before = { keys: Object.keys(localStorage), errors: [] }
localStorage.clear()
sessionStorage.clear()
return { cleared: before.keys, note: 'reload now' }
