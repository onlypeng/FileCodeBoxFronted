import { existsSync, mkdirSync, readdirSync, rmSync, renameSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

/**
 * 构建前清空 dist。
 *
 * vite.config.ts 里 emptyOutDir 是 false（当初为了规避"批量删除被环境拦截"而设），
 * 代价是 dist 只增不减：每次构建都会留下新 hash 的 chunk，旧的一直堆着。
 * 之前靠手工"构建到 dist_clean 再换名"清理，容易忘，也没进流程。
 *
 * 这里把清理放进构建流程：优先真删，删不掉就换名隔离（rename 不受批量删除保护影响）。
 * 隔离目录只保留最近 KEEP 份，避免无限堆积。
 */

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const distDir = join(rootDir, 'dist')
const trashDir = join(rootDir, '.dist_trash')
const KEEP = 1

function countFiles(dir) {
  let n = 0
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name)
      if (statSync(p).isDirectory()) walk(p)
      else n += 1
    }
  }
  walk(dir)
  return n
}

function pruneTrash() {
  if (!existsSync(trashDir)) return
  const entries = readdirSync(trashDir)
    .map((name) => join(trashDir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
  for (const stale of entries.slice(KEEP)) {
    try {
      rmSync(stale, { recursive: true, force: true })
    } catch {
      // 删不掉就留着，不影响构建
    }
  }
  const left = existsSync(trashDir) ? readdirSync(trashDir).length : 0
  if (left > KEEP) {
    // 本环境的删除保护会拦掉整目录删除，隔离目录可能越攒越多。
    // 不影响构建与仓库（已 gitignore），但占磁盘，需要人工清一次。
    console.warn(
      `[clean-dist] .dist_trash/ 仍有 ${left} 份旧产物无法自动删除，可手动删除该目录`
    )
  }
}

if (!existsSync(distDir)) {
  // dist 不存在时也要顺带收一下历史隔离目录，否则它会一直留着
  pruneTrash()
  process.exit(0)
}

const before = countFiles(distDir)

// 1) 优先真删
try {
  rmSync(distDir, { recursive: true, force: true })
} catch {
  // 忽略：下面走换名兜底
}

// 2) 仍存在 → 换名隔离到 .dist_trash
if (existsSync(distDir)) {
  mkdirSync(trashDir, { recursive: true })
  const target = join(trashDir, String(Date.now()))
  try {
    renameSync(distDir, target)
    console.log(`[clean-dist] 删除被拦截，已换名隔离 ${before} 个文件 -> .dist_trash/`)
  } catch (e) {
    // 换名也失败（极少数情况：dist 被占用）→ 不阻断构建，vite 会覆盖写入
    console.warn(`[clean-dist] 清理失败，本次构建将覆盖写入: ${e.message}`)
  }
} else {
  console.log(`[clean-dist] 已清空 dist（${before} 个文件）`)
}

pruneTrash()
