# FileCodeBoxFronted

FileCodeBox 的**前端仓库**（Vue 3 + Vite + TypeScript）。后端在另一个仓库
[FileCodeBox](https://github.com/onlypeng/FileCodeBox)；两个仓库相互独立，没有统一的父仓库。

> 后端会直接 serve `FileCodeBox/frontend_dist` 里的构建产物。
> **本仓库的 `dist` 不是最终交付物**——构建完必须同步回后端仓库并入库，
> 否则 Docker 镜像里会是旧界面。详见下方「构建与同步」。

---

## 技术栈

| 层 | 选型 |
|----|------|
| 框架 | Vue 3（`<script setup>` + Composition API）、Vite 7 |
| 类型 | TypeScript、`vue-tsc` |
| 状态 | Pinia |
| 国际化 | vue-i18n（简体中文 / 繁体中文 / English） |
| 样式 | Tailwind CSS |
| 图标 | lucide-vue-next |
| HTTP | axios（统一封装在 `src/services/client.ts`） |
| 实时 | WebSocket、WebRTC（P2P + TURN） |

分层边界与导入规则见 [ARCHITECTURE.md](./ARCHITECTURE.md)（**改动前请先读**）。

---

## 本地开发

环境要求：Node.js 20+，可用的包管理器（仓库同时提供 `package-lock.json` 与 `pnpm-lock.yaml`，
下文以 npm 为例）。

```bash
npm install
npm run dev
```

开发服务器默认 `http://localhost:5173`，绑定 `0.0.0.0` 以便局域网设备访问。
`vite.config.ts` 里配置了代理，把以下前缀转发到后端 `http://localhost:12345`：

`/admin`、`/share`、`/chunk`、`/presign`、`/collection`、`/delivery`、`/room`、`/ws`，
以及 `POST /`（公共配置接口）。

因此**必须先启动后端**，否则页面拿不到配置。

```bash
# 另一个终端，在后端仓库根目录执行
cd ../FileCodeBox
.venv/Scripts/python.exe main.py        # Windows
# python main.py                        # Linux/macOS
```

---

## 常用命令

| 命令 | 作用 |
|------|------|
| `npm run dev` | 启动开发服务器（5173） |
| `npm run type-check` | `vue-tsc --build --force`，只做类型检查 |
| `npm run check:architecture` | 校验分层边界与导入规则 |
| `npm run build` | `clean-dist` → `check:architecture` → `type-check` → `vite build` |
| `npm run preview` | 本地预览构建产物 |
| `npm run lint` | ESLint 自动修复 |
| `npm run format` | Prettier 格式化 `src/` |

> **`typecheck 通过 ≠ 能构建。**`vue-tsc` 与 `@vue/compiler-sfc` 检查的规则集不同：
> 在 `<script setup>` 里写 `export interface` / `export const` 时类型检查完全不报错，
> 但 `vite build` 会直接失败。凡是要被别的文件 import 的常量/类型/接口，
> 一律放到独立的 `.ts` 文件，组件内只留 `import`。

---

## 构建与同步（必读）

```bash
npm run build
```

构建前置步骤 `scripts/clean-dist.mjs` 会先清理 `dist`：项目配置了
`emptyOutDir: false`，不清理的话带 hash 的旧 chunk 会不断累积。
清理失败时脚本会 **rename 隔离**而不是中断构建（这个环境里批量删除大目录常被拦截）。

构建完成后，把产物同步到后端仓库：

```bash
# 在两仓库的共同父目录执行
python .workbuddy/sync_dist.py          # 覆盖式复制 dist → FileCodeBox/frontend_dist
cd FileCodeBox
git add frontend_dist
```

同步后务必确认**入口 chunk 已入库**（`frontend_dist/assets/index-*.js`）——
Dockerfile 直接 `COPY . .`，产物缺失会打出没有前端的镜像。
若 `git ls-files frontend_dist` 里残留了上一次构建的 hash 文件，用
`git rm --pathspec-from-file=<清单>` 清掉，保持索引与磁盘精确一致。

---

## 目录速览

```
src/
├── views/          页面编排（布局、组件组合、事件绑定）
├── components/     可复用 UI 组件（只收 props、发 emits）
├── composables/    业务流程与页面状态
├── services/       API 访问层（统一 HTTP 客户端 + 上传策略）
├── stores/         Pinia 跨页面共享状态
├── types/          领域类型定义
├── utils/          纯工具、存储 helper、URL 构造、文件处理
├── i18n/           三语言文案
├── workers/        Web Worker（下载后 SHA-256 校验）
├── router/         路由与鉴权守卫
└── constants/      常量（请注明约束与取值理由）
```

---

## 新增前端配置项

后台配置项需要**同时**改 `ConfigState` 和 `PublicConfig` 两个类型
（见 `src/types/config.ts`），只改一个会让 `vue-tsc` 报 TS2353。
后端还要同步 `UpdateConfigRequest` 白名单，否则后台改了值不生效。

---

## 代码注解规范

统一规范见后端仓库的 [docs/contributing.md](https://github.com/onlypeng/FileCodeBox/blob/master/docs/contributing.md)。
核心一条：**注解写「为什么」，不写「做了什么」**。每个文件顶部要有模块说明，
说明它解决什么问题、关键设计取舍、刻意不做什么。

---

## 许可证

LGPL-3.0（与后端仓库一致）。
