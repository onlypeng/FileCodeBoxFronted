#!/usr/bin/env node
/**
 * 构建期 i18n 一致性校验：源码里 t('...') 引用的字面量 key，三个语言包必须都存在。
 *
 * ## 为什么只校验「源码引用」而不是「三语言全量 key 相等」
 * 历史上 admin.settings / manage.settings / manage.systemSettings 三段近似重复，
 * 还有若干备用段只在个别语言存在，全量相等会一次性报出几十个无意义差异，
 * 既拦不住真正会伤到用户的缺口（key 放错段 → 英文界面回退中文，vue-tsc / vite
 * build 都不报错），又逼人做无收益的对齐。页面真正会用到的 key 是源码里
 * t('字面量') 引用的那些，保证它们三语言齐全即可拦住 C2 这类缺陷。
 *
 * ## 边界
 * - 动态拼接的 key（t('a.' + x)、模板字符串）静态扫不到，属既有限制，不阻断。
 * - ALLOWLIST 里每条都要写明原因，禁止用通配批量放行；缺一条就修语言包，不放行。
 *
 * 用法：node scripts/check-i18n.mjs            严格模式，有缺口 exit 1
 *       node scripts/check-i18n.mjs --report   只打印，不阻断（用于诊断）
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const LOCALES = path.join(SRC, 'i18n', 'locales')
const LANGS = ['zh-CN', 'zh-TW', 'en-US']
const REPORT_ONLY = process.argv.includes('--report')

// 历史差异豁免：这些 key 源码确有引用，但只在部分语言包定义。
// 每加一条都要写明原因，禁止用通配批量放行。
const ALLOWLIST = new Set([
  // （首次 --report 后按实际缺口逐条评估，能补语言包就补，不轻易放行）
])

/** locale 是纯对象字面量（无 import / 类型注解），可直接用 Function 求值。 */
function evalLocale(file) {
  let text = fs.readFileSync(file, 'utf8')
  text = text.replace(/^\s*export\s+default\s*/m, '')
  text = text.trim().replace(/\bas\s+const\b/g, '').replace(/;\s*$/, '')
  try {
    return Function(`"use strict"; return (${text});`)()
  } catch (e) {
    throw new Error(`无法解析语言包 ${path.basename(file)}: ${e.message}`)
  }
}

/** 递归展平成 a.b.c 形式的 key 集合；叶子（字符串/数字/数组）记为 key。 */
function flatten(obj, prefix, out) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      flatten(v, key, out)
    } else {
      out.add(key)
    }
  }
}

function walk(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (p === LOCALES) continue // 语言包是定义，不是引用
      walk(p, acc)
    } else if (/\.(ts|vue|js)$/.test(e.name) && !/\.d\.ts$/.test(e.name)) {
      acc.push(p)
    }
  }
  return acc
}

// 负向后顾避免把 alert('x') / submit('x') 里的 t(' 误当翻译调用。
// 覆盖 t / $t / tc / $tc / te / $te / tm / $tm 的「第一个字符串参数」。
const RE_TCALL = /(?<![\w$])(?:\$?t|\$?tc|\$?te|\$?tm)\s*\(\s*(['"])([A-Za-z0-9_.\-]+)\1/g

function collectRefs() {
  const refs = new Map() // key -> Set<相对路径>
  for (const f of walk(SRC, [])) {
    const text = fs.readFileSync(f, 'utf8')
    let m
    RE_TCALL.lastIndex = 0
    while ((m = RE_TCALL.exec(text))) {
      const key = m[2]
      // 残缺/参数化/动态片段跳过
      if (key.startsWith('.') || key.endsWith('.') || key.includes('{')) continue
      if (!refs.has(key)) refs.set(key, new Set())
      refs.get(key).add(path.relative(ROOT, f).replace(/\\/g, '/'))
    }
  }
  return refs
}

const keysets = {}
for (const lang of LANGS) {
  const s = new Set()
  flatten(evalLocale(path.join(LOCALES, `${lang}.ts`)), '', s)
  keysets[lang] = s
}
const refs = collectRefs()

const missing = []
for (const [key, files] of refs) {
  if (ALLOWLIST.has(key)) continue
  for (const lang of LANGS) {
    if (!keysets[lang].has(key)) {
      missing.push({ lang, key, files: [...files].slice(0, 3) })
    }
  }
}

console.log(`[i18n] 源码引用字面量 key: ${refs.size}`)
for (const lang of LANGS) {
  console.log(`[i18n] ${lang} 定义 key: ${keysets[lang].size}`)
}

// 全量跨语言差异（仅提示，不阻断）：用于观察历史重复段规模
const allKeys = new Set()
for (const lang of LANGS) for (const k of keysets[lang]) allKeys.add(k)
let crossDiff = 0
for (const k of allKeys) {
  for (const lang of LANGS) if (!keysets[lang].has(k)) { crossDiff++; break }
}
console.log(`[i18n] 跨语言全量差异 key（仅提示）: ${crossDiff}`)

if (missing.length === 0) {
  console.log('[i18n] OK：源码引用的 key 三语言齐全')
  process.exit(0)
}

// 按语言分组打印
for (const lang of LANGS) {
  const rows = missing.filter(r => r.lang === lang)
  if (!rows.length) continue
  console.log(`\n[i18n] ${lang} 缺失 ${rows.length} 个源码引用 key：`)
  for (const r of rows) console.log(`  - ${r.key}  <- ${r.files.join(', ')}`)
}
console.log(`[i18n] 合计缺失 ${missing.length} 项`)
if (!REPORT_ONLY) {
  console.error('[i18n] FAIL：请把缺失 key 补进对应语言包（或按原因加入 ALLOWLIST）')
  process.exit(1)
}
