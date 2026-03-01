const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const electronBinary = require('electron')
const env = { ...process.env }

// This env var makes Electron behave like plain Node and breaks app startup.
delete env.ELECTRON_RUN_AS_NODE

const args = ['.', '--development-mode']

if (process.platform === 'linux' && env.OURO_ENABLE_SANDBOX !== '1') {
  let shouldDisableSandbox = false

  try {
    const helperPath = path.join(path.dirname(electronBinary), 'chrome-sandbox')
    const helperStat = fs.statSync(helperPath)
    const hasSetuidBit = (helperStat.mode & 0o4000) !== 0
    const ownedByRoot = helperStat.uid === 0

    shouldDisableSandbox = !(hasSetuidBit && ownedByRoot)
  } catch (error) {
    shouldDisableSandbox = true
  }

  if (shouldDisableSandbox) {
    args.push('--no-sandbox')
    console.warn('[dev] Launching with --no-sandbox because chrome-sandbox is not configured.')
    console.warn('[dev] Set OURO_ENABLE_SANDBOX=1 to force sandbox mode once the helper is fixed.')
  }
}

const child = spawn(electronBinary, args, {
  stdio: 'inherit',
  env
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code || 0)
})
