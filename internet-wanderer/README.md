# Internet Wanderer

**Get lost on the Internet again.** 一个可以随手出发的互联网漫游器：遇见陌生网站、读一则远处的资讯，或打开过去留下的网页。

当前是 **0.3.0 UI Demo**：React + Vite + TypeScript，默认使用项目内的静态内容，无需真实 API 联调、数据库、账号或 API key。四个入口为 Surprise Me、Elsewhere、News Drift、Time Machine；已实现上一站／下一站、最多 20 条最近遇见，以及本机收藏和 JSON 备份导入／导出。

0.3.0 增加手机固定漫游操作栏、每页结果恢复和整组年份包返回，强化出发与到达反馈。Elsewhere 使用三种手工明信片，News Drift 使用报刊刊头与自适应长标题；年代配置同时控制字体、控件和入场节奏。

界面采用暖白纸面、橙色出发按钮与可以交互的浏览器窗口。Elsewhere、News Drift 和三个精选年份各有自己的视觉主题，设计依据见 [UI_DIRECTION.md](UI_DIRECTION.md)。

静态样本包含 **30 个精选网站、18 条历史内容（1999 / 2007 / 2012 各 6 条）、3 个来源的 32 条真实资讯记录**。新闻明确标为样本，保留原始发表时间；样本可供持续体验，不声称实时更新。外站只有在用户主动打开链接后才会访问。

本项目尚未公开部署。GitHub Pages 工作流保留在仓库中，但没有在远程仓库执行。

## 在本地运行和继续开发

**Windows 一键启动：**在本项目的上一级目录双击 `一键启动.cmd`。启动器通过项目内的普通 Node.js 脚本运行，自动检查 Node.js、首次安装依赖，并在依赖配置变化或依赖缺失时重新安装；随后运行当前源码并打开 `http://127.0.0.1:5173/`。重复双击会打开已运行的项目。首次安装或更新依赖需要联网，npm 缓存和临时文件保存在项目内的 `.launcher/`。

保持启动窗口打开；按 `Ctrl+C` 或关闭窗口结束服务。启动器固定地址，以便继续使用该地址下的本机收藏和足迹。若端口被其他应用占用，会显示具体原因；启动失败时窗口保留错误信息。

后续迭代保留上一级目录的 `AGENTS.md` 中的启动约定，依赖变动同步更新 `package-lock.json`，交付前运行 `npm run build` 和 `npm run test:launcher`。启动器直接使用 Vite 开发服务器和当前配置，源码更新可即时呈现，无需重新制作启动程序或手动构建 `dist/`。已运行时发现依赖变化，会自动重启本项目并准备新依赖。

安装 **Node.js 22.12 或以上版本**；云端开发环境使用 Node.js 24，建议本地也使用 Node.js 24。将完整的 `internet-wanderer` 文件夹下载或复制到本机，在项目根目录运行：

```sh
npm ci
npm run dev
```

打开终端输出的地址，通常是 `http://localhost:5173/`。按 `Ctrl+C` 结束开发服务器。首次安装依赖需要联网；安装后，Demo 的页面和内容不依赖第三方数据接口。

预览生产构建：

```sh
npm run build
npm run preview
```

打开预览命令输出的地址。构建会先校验内容并检查 TypeScript，然后生成 `dist/`。使用 HTTP 服务器预览，不要直接双击 `dist/index.html`。

迁移时保留源码、`data/`、`config/`、`scripts/`、`tests/`、`.github/`、文档、项目配置和 `package-lock.json`。使用一键启动时，还需保留上一级目录的 `一键启动.cmd` 和 `AGENTS.md`。`node_modules/`、`dist/` 与测试输出可重新生成。本机收藏需要在旧浏览器导出 JSON，再在新浏览器导入；最近遇见不会随源码迁移。

在本地 Codex 或 IDE 打开项目根目录，可用这段交接说明：

> 请先阅读 README.md、UI_DIRECTION.md、ROADMAP.md 和 docs 下的来源记录，继续 Internet Wanderer 0.3.0 UI Demo。先验证本地启动、测试和构建，保留默认静态 Demo、现有收藏及署名规则。按路线图完善体验，暂不开展真实 API、数据库、RSS 或 Archive 自动接入。

## Demo 与 Live 内容模式

默认 **Demo** 使用 `news.snapshot.json` 的 `generatedAt` 作为漫游参考时间，因此几个月后打开仍可体验同一批新闻样本。新闻真实发表时间、来源成功采集时间和收藏保存时间都不会被改写。页面会显示 Demo／样本说明。

只需默认运行即可。也可在自己的 `.env.local` 中写入以下内容；这是配置示例，项目交付不需要创建这个文件：

```dotenv
VITE_CONTENT_MODE=demo
```

只有精确设置为 `live` 才启用实时钟；未设置或未知值仍为 Demo。Bash 中的切换方式：

```sh
VITE_CONTENT_MODE=live npm run dev
```

构建 Live 静态产物时：

```sh
VITE_CONTENT_MODE=live npm run build
npm run preview
```

也可以把 `.env.local` 中的值改为 `live`，然后重启开发服务器或重新构建。PowerShell 可先执行 `$env:VITE_CONTENT_MODE="live"`，再运行对应 npm 命令。构建完成后，仅在 `preview` 命令前改变量不会改变已生成的模式。

**Live 只切换时效判断，不会自动接入 API 或抓取新闻。** 它依然读取项目内快照：新闻超过 7 天就退出漫游池，来源超过 48 小时未成功更新就退出 Surprise Me 的新闻候选。全部新闻到期时显示空状态，其他模式仍可玩。

Demo 使用同样的时效规则，只把漫游与恢复的参考时间固定在样本生成时刻。收藏中的旧闻标记继续使用真实时间；收藏快照不会让过期新闻重新进入漫游池。

## 本机收藏与备份

内容卡可收藏／取消收藏，导航中的收藏入口可重新打开、移除、导出与导入。收藏保留内容及必要来源快照；原数据更新后优先显示当前条目，已下架条目不会通过旧副本重新开放。已到期或不再位于当前目录的新闻，可作为个人保存的旧快照查看，并保留原始日期和署名。

- 最多 **500 条**收藏；JSON 导入／导出均受 **1 MiB（UTF-8 字节数）**上限约束。
- 导入先校验再合并，按稳定 ID 去重；同 ID 保留已有收藏，不覆盖原数据。无效或超限文件不会清空当前收藏。
- 导入只接受合法 HTTP(S) 链接与规定的数据结构，不执行导入文件中的 HTML 或脚本。作者、许可和档案来源字段仍按内容规则保留。
- 浏览器存储不可用时仅暂存本次页面，并提示及时导出；检测到已损坏的旧收藏数据时不会自动覆写它。
- 收藏存在当前浏览器，没有云端同步。迁移浏览器、清理站点数据或更换设备前，可先导出备份。

## 常用命令与验证

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 启动默认静态 Demo 开发服务器 |
| `npm test` | 运行离线逻辑测试，包括选择、存储、收藏、内容时钟与 RSS |
| `npm run data:validate` | 检查 JSON 模型、重复 ID、来源引用和年份 |
| `npm run build` | 校验数据、检查 TypeScript，生成 `dist/` |
| `npm run preview` | 在本机预览已构建页面 |
| `npm run test:browser` | 对已构建页面运行 Playwright 浏览器测试 |
| `npm run test:launcher` | Windows 双击入口、重复启动和依赖变化重启检查；测试前先关闭项目启动窗口 |
| `npm run data:refresh` | 保留的 RSS 维护脚本；需要联网，运行 Demo 不需要 |

浏览器测试准备步骤：

```sh
npm run build
npx playwright install chromium
npm run test:browser
```

28 项产品回归读取实际 `dist/` 文件，通过请求拦截提供页面；2 项数据提供层集成测试自动启动并关闭本机 Vite 测试夹具，验证失败重试、取消旧加载和临时收藏保留。测试不访问外站，无需另外启动服务器。修改源码后重新构建，再运行浏览器测试。若已有 Chromium，可在 Bash 中指定其实际可执行文件路径：

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chromium npm run test:browser
```

本轮构建通过，**55 项逻辑测试与 30 项浏览器测试全部通过**。验证范围包括连续漫游、刷新恢复、直接 hash 导航、浏览器前进／后退、整组年份包恢复、年份切换、足迹、收藏备份与异常输入、新闻署名、内容时钟和响应式界面。外站的音频、完整交互、Wayback 的所有图片／子链接，以及尚未部署的公开网址不属于离线验证范围。实际结果与截图见 [UI_DEMO_REVIEW.md](docs/UI_DEMO_REVIEW.md)。

## 项目结构与修改入口

| 文件／目录 | 职责 |
| --- | --- |
| `src/components/JourneyControls.tsx`、`experiences/` | 持续可操作的漫游按钮与模式视觉片段 |
| `src/components/BrowserFrame.tsx` | 可复用的浏览器窗口、地址栏和年代外框，不负责内容选择 |
| `config/era-themes.json`、`src/ui/era-registry.ts`、`themes.ts` | 年代配置、引用校验与语义主题；主题复用不依赖年份分支 |
| `src/content/clock.ts` | 独立的 Demo／Live 参考时钟；`runtime.ts` 保留测试兼容入口 |
| `src/content/provider.ts`、`providers/bundled.ts` | 统一内容接口、模型校验与当前静态适配器 |
| `src/app/content-context.tsx` | 提供层注入、加载、取消、错误重试；失败时保留收藏状态 |
| `src/content/repository-factory.ts` | 为每个提供层建立索引，应用来源与恢复规则 |
| `src/domain/select-next.ts` | 不依赖 UI 的随机选择、去重、空池和年份包逻辑 |
| `src/app/use-wander.ts` | 路由、选择、上一站与恢复流程的共享 hook |
| `src/app/bookmarks-context.tsx` | 收藏状态与操作反馈；数据约束在 domain，存储读写在 storage |
| `src/styles/motion.css` | 入场、换站与按钮反馈，支持减少动画偏好 |
| `src/styles/home.css`、`wander.css`、`dialogs.css`、`about.css`、`bookmarks.css` | 按页面／组件拆分的局部样式；公共基础在 `base.css` |
| `data/`、`config/` | 静态内容、来源、年份配置 |
| `scripts/adapters/` | 保留的采集适配器；与当前视觉组件分离 |

视觉修改先查看 [UI_DIRECTION.md](UI_DIRECTION.md)，增加年代或替换数据提供层，请阅读 [EXTENDING_THE_DEMO.md](docs/EXTENDING_THE_DEMO.md)。将来的 API 或数据提供层应继续输出统一条目，不把第三方原始响应、网络请求或采集规则塞进窗口和卡片组件。

## 内容、出处与真实边界

`data/sites.json` 保存网站及原创中文介绍；`data/history.json` 保存事件、代表性去处和具体快照；`data/news.snapshot.json` 保存之前采集的真实新闻记录及来源状态。人工来源配置位于 `config/curated-sources.json`，RSS 配置位于 `config/rss-sources.json`，年份位于 `config/years.json`。

三个新闻样本来源是 **Global Voices、NASA、European Central Bank**。Global Voices 是注册在荷兰的全球作者网络，NASA 和 ECB 属于机构资讯。样本主要为英语，来源所在地不等于报道发生地，也不代表全球新闻全貌。

只展示标题、原文链接、发表时间与必要署名，不转载全文、摘要或新闻图片。Global Voices 条目保留作者及 CC BY 3.0 链接。详见 [NEWS_SOURCES.md](docs/NEWS_SOURCES.md)和[CONTENT_AUDIT.md](docs/CONTENT_AUDIT.md)。记录中的核验日期不保证网站持续可用，也不构成对全部第三方素材的授权。

增加人工内容时保留稳定 `id` 和合法 `sourceId`，运行 `npm run data:validate`。历史事件必须有 `history` 与 `evidenceUrls`；档案必须有经过核实的原网址及真实捕获时间。不能猜测 Wayback 时间戳，也不能把当前网页的年份关联冒充当年的页面快照。可选 `author`／`licenseUrl` 承载署名；Global Voices 必须保留这两个字段。来源的 `publisherType` 区分新闻媒体和机构资讯。

## 保留的采集与部署能力

本轮优先完成可持续运行的 UI Demo。真实 API、数据库、RSS 联调和 Archive 自动接入留待后续，现有脚本及工作流保留，不是本地运行的前置条件。

以后需要更新静态新闻样本时，可手动执行：

```sh
npm run data:refresh
npm run build
```

采集按来源处理，最多每来源 15 条近 7 天新闻；单源失败保留上次成功批次与时间，有效空 feed 清空该源旧批次。浏览器从不直接请求 RSS。Node.js 24 环境确实使用系统代理时，才使用 `NODE_USE_ENV_PROXY=1 npm run data:refresh`；不使用代理的本机直接运行普通命令，并保留正常 TLS 校验。

应用使用 HashRouter，路由类似 `/#/wander?mode=time&year=2007`。一般静态托管可发布整个 `dist/`。仓库子路径构建示例（Bash）：

```sh
VITE_BASE_PATH=/internet-wanderer/ npm run build
```

PowerShell 可先设置 `$env:VITE_BASE_PATH="/internet-wanderer/"` 再构建。域名根路径使用默认 `/`。要发布 Live 版本，还需在构建时同时设置 `VITE_CONTENT_MODE=live`。

保留的 [.github/workflows/publish.yml](.github/workflows/publish.yml) 在 `main` 推送或手动执行时校验、测试、构建并发布。默认构建 Demo，不请求外部新闻接口，也不定时采集。手动执行时可选择 `content_mode=live`，并按需勾选 `refresh_news` 为这次构建更新快照；该快照不会自动提交回仓库。

以后启用该工作流时，在 **Settings → Pages → Source** 选择 **GitHub Actions**，允许工作流声明的 `contents: read`、`pages: write`、`id-token: write` 权限。构建或部署失败会停止本轮发布，不删除已有成功站点。当前尚未执行远程工作流或公开部署；本地 Demo 不需要启用发布。

## 后续文档

- [ROADMAP.md](ROADMAP.md)：当前收尾与后续候选，收藏已完成。
- [CHANGELOG.md](CHANGELOG.md)：版本变化。
- [PROJECT_PLAN.md](PROJECT_PLAN.md)：早期产品规划；其中「仅规划」和「收藏推迟」属于当时阶段，以当前 README／路线图为准。
- [DATA_SOURCES.md](DATA_SOURCES.md)：原始来源比较；实际核验记录以 `docs/` 为准。
- [src/domain/README.md](src/domain/README.md)、[scripts/adapters/README.md](scripts/adapters/README.md)：领域与适配器边界。

保留统一模型、稳定 ID、真实日期和可追溯署名；先验证体验，再决定是否扩大数据与服务范围。
