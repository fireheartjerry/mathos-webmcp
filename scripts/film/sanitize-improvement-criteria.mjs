import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = resolve('docs/criteria/webmcp-film-criteria.md')
const target = resolve('docs/criteria/webmcp-film-criteria-for-scorer.md')
let text = readFileSync(source, 'utf8')
text = text.replace(/\s+\*\*Baseline score:\*\*[^\n]*/, '')
text = text.replace(/\n## Score log[\s\S]*$/, '\n')
writeFileSync(target, text)
console.log(target)
