// Run a bash script from `npm run` on any terminal.
// On Windows `npm run` uses cmd.exe, where plain `bash` may resolve to WSL
// instead of Git Bash. This finds Git for Windows' bash.exe next to git.
//
// Usage (package.json): "node scripts/run-bash.mjs scripts/deploy-fe.sh --rollback"
import { spawnSync, execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

function findBash() {
  if (process.platform !== 'win32') return 'bash'
  const candidates = []
  try {
    // e.g. C:/Program Files/Git/mingw64/libexec/git-core -> C:/Program Files/Git
    const gitRoot = path.resolve(execSync('git --exec-path', { encoding: 'utf8' }).trim(), '..', '..', '..')
    candidates.push(path.join(gitRoot, 'bin', 'bash.exe'), path.join(gitRoot, 'usr', 'bin', 'bash.exe'))
  } catch { /* git not on PATH */ }
  for (const base of [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs')]) {
    if (base) candidates.push(path.join(base, 'Git', 'bin', 'bash.exe'))
  }
  const found = candidates.find(existsSync)
  if (!found) {
    console.error('Git Bash not found. Install Git for Windows: https://git-scm.com/download/win')
    process.exit(1)
  }
  return found
}

const [script, ...args] = process.argv.slice(2)
if (!script) {
  console.error('Usage: node scripts/run-bash.mjs <script.sh> [args...]')
  process.exit(1)
}
const res = spawnSync(findBash(), [script, ...args], { stdio: 'inherit' })
process.exit(res.status ?? 1)
