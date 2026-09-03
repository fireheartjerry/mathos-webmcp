/**
 * Audits the film by its SETTLED frames, not arbitrary samples.
 *
 * Jerry's idea, and it is the right one: every shot has a begin state and an end
 * state, and those are where defects are actually visible. Mid-transition and
 * mid-animation frames lie in both directions -- earlier in this build a sweep of
 * mid-reveal frames reported thirty clipped elements that did not exist at rest.
 *
 * For each shot it grabs the frame just after the shot settles and the frame just
 * before its transition starts, then measures two things by pixel difference:
 *
 *   within  -- how much the picture changed across the shot. Near zero means the
 *              shot is dead air: several seconds where nothing happens.
 *   across  -- how different a shot's end is from the next shot's begin. Near zero
 *              means the transition joins two near-identical pictures, so whatever
 *              effect is applied there is decoration over a non-event.
 *
 * Difference is the mean absolute pixel delta, 0..255, via ffmpeg's blend filter.
 *
 *   node scripts/film/frame-audit.mjs
 */
import { execFileSync, execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve('.')
const FILM = resolve(ROOT, 'video/out/mathburst-final.mp4')
const OUT = resolve(ROOT, '.film/audit')
if (!existsSync(FILM)) throw new Error(`missing ${FILM}`)
mkdirSync(OUT, { recursive: true })

const cutlist = JSON.parse(readFileSync(resolve(ROOT, 'video/public/film/cutlist.json'), 'utf8'))

/** Long enough for the arrival settle to finish, short enough to stay inside the shot. */
const SETTLE_IN = 0.75
/** Clear of the dip so the frame is the shot's own picture, not a veiled one. */
const CLEAR_OF_DIP = 0.35

const grab = (seconds, name) => {
  const file = resolve(OUT, `${name}.jpg`)
  execFileSync('ffmpeg', ['-v', 'error', '-ss', String(Math.max(0, seconds)), '-i', FILM, '-frames:v', '1', '-q:v', '2', '-y', file])
  return file
}

/** Mean absolute pixel difference between two stills, 0..255. */
const difference = (left, right) => {
  // signalstats prints its metadata on stderr, so the pipeline has to merge streams;
  // reading stdout alone returns nothing and every difference comes back NaN.
  const command = `ffmpeg -v info -i "${left}" -i "${right}" -filter_complex "[0:v][1:v]blend=all_mode=difference,format=gray,signalstats,metadata=print:key=lavfi.signalstats.YAVG" -f null - 2>&1`
  const output = execSync(command, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 })
  const match = /YAVG=([\d.]+)/.exec(output)
  return match ? Number(match[1]) : NaN
}

const rows = []
for (const shot of cutlist.shots) {
  const beginAt = shot.filmStart + SETTLE_IN
  const endAt = shot.filmEnd - (shot.transitionSeconds ?? 0) - CLEAR_OF_DIP
  if (endAt <= beginAt) {
    rows.push({ id: shot.id, seconds: shot.seconds, note: 'too short to sample two settled states' })
    continue
  }
  const begin = grab(beginAt, `${shot.id}_begin`)
  const end = grab(endAt, `${shot.id}_end`)
  rows.push({ id: shot.id, seconds: shot.seconds, kind: shot.kind, beginAt: +beginAt.toFixed(2), endAt: +endAt.toFixed(2), begin, end, within: +difference(begin, end).toFixed(2) })
}

for (let index = 0; index < rows.length - 1; index += 1) {
  const here = rows[index]
  const next = rows[index + 1]
  if (here.end && next.begin) here.across = +difference(here.end, next.begin).toFixed(2)
}

const DEAD_WITHIN = 1.0
const SAME_ACROSS = 2.0

console.log('shot                  secs  within  across  note')
for (const row of rows) {
  const notes = []
  if (row.note) notes.push(row.note)
  if (row.within !== undefined && row.within < DEAD_WITHIN) notes.push(`DEAD: nothing changes across ${row.seconds}s`)
  if (row.across !== undefined && row.across < SAME_ACROSS) notes.push('JOIN JOINS IDENTICAL PICTURES')
  console.log(
    row.id.padEnd(21) +
    String(row.seconds ?? '').padStart(5) +
    String(row.within ?? '-').padStart(8) +
    String(row.across ?? '-').padStart(8) +
    '  ' + notes.join('; '),
  )
}

writeFileSync(resolve(OUT, 'audit.json'), JSON.stringify(rows.map(({ begin, end, ...rest }) => rest), null, 2))
const dead = rows.filter((row) => row.within !== undefined && row.within < DEAD_WITHIN)
const same = rows.filter((row) => row.across !== undefined && row.across < SAME_ACROSS)
console.log(`\n${rows.length} shots | ${dead.length} dead | ${same.length} joins between identical pictures`)
console.log(`frames in ${OUT}`)
