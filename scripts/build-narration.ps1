# Synthesises the narration in docs/narration.json to one WAV per segment.
#
# Offline, using the speech synthesiser Windows ships with. The result is a *reference*
# track: correctly worded and correctly timed to the video's beats, so it can either be
# used as-is or read over by a person who wants their own voice on it.
#
#   pwsh -File scripts/build-narration.ps1

param(
    [string]$Json = "docs/narration.json",
    [string]$OutDir = ".narration"
)

Add-Type -AssemblyName System.Speech

$spec = Get-Content $Json -Raw | ConvertFrom-Json
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
try { $synth.SelectVoice($spec.voice) } catch { Write-Host "voice '$($spec.voice)' unavailable; using the default" }
$synth.Rate = $spec.rate

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
