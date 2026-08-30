// Sets window.__CALLS__ then runs run-calls.js, so a proposed call list can be
// executed verbatim without editing a script each time.
import { readFileSync, writeFileSync } from 'node:fs'
const calls = readFileSync(process.argv[2], 'utf8')
const body = readFileSync('scripts/checks/run-calls.js', 'utf8')
writeFileSync('scripts/checks/_calls.js', `window.__CALLS__ = ${JSON.stringify(calls)};\n${body}`)
