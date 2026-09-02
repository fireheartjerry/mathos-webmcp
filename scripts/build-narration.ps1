# Synthesises the seven Mathburst narration beats to one WAV per segment.
#
# Offline, using the speech synthesiser Windows ships with. No account or API key.
#
#   pwsh -File scripts/build-narration.ps1 -Json docs/narration.json -OutDir video/public

param(
    [string]$Json = "docs/narration.json",
    [string]$OutDir = "video/public"
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech

$spec = Get-Content -LiteralPath $Json -Raw | ConvertFrom-Json
if (@($spec.segments).Count -ne 7) { throw 'Mathburst narration must contain exactly seven segments.' }
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
try { $synth.SelectVoice([string]$spec.voice) } catch { Write-Host "voice '$($spec.voice)' unavailable; using the system default" }
$synth.Rate = [int]$spec.rate

$i = 0
foreach ($seg in $spec.segments) {
    $path = Join-Path $OutDir ("seg{0:d2}.wav" -f $i)
    $full = (Resolve-Path -LiteralPath (Split-Path $path -Parent)).Path
    $target = Join-Path $full (Split-Path $path -Leaf)
    $synth.SetOutputToWaveFile($target)
    $synth.Speak($seg.text)
    $words = ($seg.text -split '\s+').Count
    Write-Host ("{0,-12} start {1,6:N1}s  budget {2,5:N1}s  {3,3} words" -f $seg.beat, $seg.startSeconds, $seg.durationSeconds, $words)
    $i++
}
$synth.SetOutputToNull()
$synth.Dispose()
Write-Host "wrote $i segments to $OutDir"
