import { Config } from '@remotion/cli/config'

Config.setVideoImageFormat('jpeg')
Config.setOverwriteOutput(true)
// The local Chrome renders the film; Remotion's headless-shell download is not available here.
Config.setChromeMode('chrome-for-testing')
Config.setBrowserExecutable(process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe')
