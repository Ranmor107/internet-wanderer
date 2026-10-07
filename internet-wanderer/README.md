# Internet Wanderer

**Get lost on the Internet again.** 一个可以随手出发的互联网漫游器：遇见陌生网站、读一则远处的资讯，或打开过去留下的网页。

当前是 **0.4.0（2026-10-07）**：React + Vite + TypeScript，默认读取项目内快照，可离线浏览已保存的多语言近期与历史新闻，无需账号、数据库服务或 API key。维护脚本在 Node.js 中采集官方接口；浏览器不会直接请求 RSS。四个入口为 Surprise Me、Elsewhere、News Drift、Time Machine；已实现上一站／下一站、最多 20 条最近遇见，以及本机收藏和 JSON 备份导入／导出。

0.3.0 增加手机固定漫游操作栏、每页结果恢复和整组年份包返回，强化出发与到达反馈。Elsewhere 使用三种手工明信片，News Drift 使用报刊刊头与自适应长标题；年代配置同时控制字体、控件和入场节奏。

界面采用暖白纸面、橙色出发按钮与可以交互的浏览器窗口。Elsewhere、News Drift 和三个精选年份各有自己的视觉主题，设计依据见 [UI_DIRECTION.md](UI_DIRECTION.md)。

内容包含 **36 个精选网站、18 条历史切片（1999 / 2007 / 2012 各 6 条）**，以及保存于本地的新闻库。新闻接入 Global Voices 的英语、中文、日语、法语、西班牙语接口，加上 NASA 和 European Central Bank，共 7 个接口、3 个发布主体；保留可靠的原始发表时间、作者、译者及必要许可。历史新闻可以进入 News Drift 与 Surprise Me，不会自动变成 Time Machine 的年份切片。

本轮实际保存 **2,243 条新闻记录**，发表时间覆盖 **2004～2026 年**：英语 724 条、简体中文 284 条、日语 393 条、法语 400 条、西班牙语 442 条。每年最多取 2 页，这是档案抽样而非全量数据库；各语言的起止日期与缺年情况见 [导入验收记录](docs/MULTILINGUAL_NEWS_ARCHIVES.md)。

0.3.1 新增的 6 个非英语网站覆盖文化、科普、地图与艺术；审核证据、语言切换和登录限制见 [非英语内容核验记录](docs/NON_ENGLISH_CONTENT_REVIEW.md)。默认页面展示已保存的内容，不声称实时更新；外站只有在用户主动打开链接后才会访问。

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

> 请先阅读 README.md、UI_DIRECTION.md、ROADMAP.md 和 docs 下的来源记录，继续 Internet Wanderer 0.4.0。先验证本地启动、测试和构建，保留默认本地快照、固定一键启动入口、现有收藏及原始日期与署名。新闻维护已有 data:refresh 和有界 data:backfill；新闻不限制发表年代，未来日期仍排除。按路线图完善体验，暂不增加浏览器运行时抓取、账号、数据库服务或 Wayback 自动接入。

## Demo 与 Live 内容模式

默认 **Demo** 使用 `news.snapshot.json` 的 `generatedAt` 作为漫游参考时间，因此以后打开仍可浏览同一份新闻库快照。新闻原始发表时间、来源成功采集时间和收藏保存时间分别记录，不会被改写。页面会说明新闻库的整理日期和静态展示边界。

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

**Live 只切换参考时钟，不会自动抓取新闻。** 它依然读取项目内快照；可靠且不在未来的新闻，无论发表年代，都可进入 News Drift 和 Surprise Me。来源超过 48 小时未成功更新只影响状态提示，不使已保存新闻退出漫游池。

Demo 使用相同的有效性规则，只把漫游与恢复的参考时间固定在快照生成时刻。7 天阈值仅用于标注历史新闻或收藏中的旧闻，标记使用真实时间，不表示条目不可选。导入收藏不会向新闻库添加内容，仅存在收藏里的快照不会进入漫游池。

## 本机收藏与备份

内容卡可收藏／取消收藏，导航中的收藏入口可重新打开、移除、导出与导入。收藏保留内容及必要来源快照；原数据更新后优先显示当前条目，已下架条目不会通过旧副本重新开放。不再位于当前目录的新闻，可作为个人保存的旧快照查看，并保留原始日期、语言、作者、译者和许可。

- 最多 **500 条**收藏；JSON 导入／导出均受 **1 MiB（UTF-8 字节数）**上限约束。
- 导入先校验再合并，按稳定 ID 去重；同 ID 保留已有收藏，不覆盖原数据。无效或超限文件不会清空当前收藏。
- 导入只接受合法 HTTP(S) 链接与规定的数据结构，不执行导入文件中的 HTML 或脚本。作者、译者、许可和档案来源字段仍按内容规则保留。
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
| `npm run data:refresh` | 从官方接口更新并积累本地新闻库；需要联网，打开应用不需要 |
| `npm run data:backfill -- --from=2004 --to=2026 --pages=2` | 按年有界补采历史新闻，每年最多 2 页；扩充已有库，不承诺全量 |

浏览器测试准备步骤：

```sh
npm run build
npx playwright install chromium
npm run test:browser
```

产品回归读取实际 `dist/` 文件，通过请求拦截提供页面，包括非英语卡片的语言、链接及收藏恢复；2 项数据提供层集成测试自动启动并关闭本机 Vite 测试夹具，验证失败重试、取消旧加载和临时收藏保留。测试不访问外站，无需另外启动服务器；截图保存在项目内 `test-results/`。修改源码后重新构建，再运行浏览器测试。若已有 Chromium，可在 Bash 中指定其实际可执行文件路径：

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chromium npm run test:browser
```

每轮交付须重新运行构建、离线逻辑测试、浏览器回归与一键启动生命周期验证。验证范围包括连续漫游、刷新恢复、历史新闻入池与未来日期排除、多语言署名和收藏备份、来源采集状态、内容时钟及响应式界面。外站的音频、完整交互、Wayback 的所有图片／子链接，以及尚未部署的公开网址不属于离线验证范围。早期 UI 验收结果与截图见 [UI_DEMO_REVIEW.md](docs/UI_DEMO_REVIEW.md)，不能代替当前版本的回归。

0.4.0 本轮已通过数据校验、TypeScript 与生产构建、77 项逻辑测试、43 项浏览器测试及一键启动回归；启动器重复调用和依赖变化重启正常，测试结束后固定端口已释放。完整导入范围及验证边界见 [验收记录](docs/MULTILINGUAL_NEWS_ARCHIVES.md)。

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
| `scripts/adapters/` | Node.js 新闻采集、规范化与历史库合并；与浏览器及视觉组件分离 |

视觉修改先查看 [UI_DIRECTION.md](UI_DIRECTION.md)，增加年代或替换数据提供层，请阅读 [EXTENDING_THE_DEMO.md](docs/EXTENDING_THE_DEMO.md)。将来的 API 或数据提供层应继续输出统一条目，不把第三方原始响应、网络请求或采集规则塞进窗口和卡片组件。

## 内容、出处与真实边界

`data/sites.json` 保存网站及原创中文介绍；`data/history.json` 保存事件、代表性去处和具体快照；`data/news.snapshot.json` 是积累近期及历史新闻记录的本地库，包含来源采集状态。人工来源配置位于 `config/curated-sources.json`，新闻接口配置位于 `config/rss-sources.json`，年份位于 `config/years.json`。

新闻发布主体为 **Global Voices、NASA、European Central Bank**。Global Voices 是注册在荷兰的全球作者网络，覆盖英语、中文、日语、法语和西班牙语；NASA 和 ECB 属于英语机构资讯。来源所在地不等于报道发生地，也不代表全球新闻全貌。

只展示标题、原文链接、发表时间与必要署名，不转载全文、摘要或新闻图片。Global Voices 条目保留作者、明确标注的译者及 CC BY 3.0 链接；有已核实的原版链接时一并记录。未来日期、缺失可靠发表时间或必需署名的条目不会进入新闻库。详见 [NEWS_SOURCES.md](docs/NEWS_SOURCES.md)和[CONTENT_AUDIT.md](docs/CONTENT_AUDIT.md)。记录中的核验日期不保证网站持续可用，也不构成对全部第三方素材的授权。

增加人工内容时保留稳定 `id` 和合法 `sourceId`，运行 `npm run data:validate`。Time Machine 的事件必须有 `history` 与 `evidenceUrls`；档案必须有经过核实的原网址及真实捕获时间。历史新闻保持 `kind=news` 和真实 `publishedAt`，不因年份较早就附加 `history`。不能猜测 Wayback 时间戳，也不能把当前网页的年份关联冒充当年的页面快照。`author`／`translator`／`licenseUrl` 承载署名；Global Voices 必须保留作者、必要译者与许可。来源的 `publisherType` 区分新闻媒体和机构资讯。

## 新闻库维护与部署

官方新闻接口已通过维护脚本接入本地快照；日常浏览和一键启动不依赖实时接口。浏览器运行时抓取、账号与数据库服务、Wayback 自动接入仍留待后续。公开部署也不是本地运行的前置条件。

需要更新近期内容时，可手动执行：

```sh
npm run data:refresh
npm run build
```

采集按来源处理，合并新条目与旧库，按稳定 ID 和规范化 URL 去重；刷新不会因旧新闻年代较早而删除它。合法空源保留已有内容，单源失败也保留已有记录与上次成功时间，同时记录本次采集状态。浏览器从不直接请求 RSS。

需要扩充历史报道时，可执行按年有界补采：

```sh
npm run data:backfill -- --from=2004 --to=2026 --pages=2
npm run data:validate
npm run build
```

`--pages=2` 表示每个请求年份最多采集 2 页，不承诺覆盖该年份的全部报道。可用 `--source=global-voices-fr` 只重采一个来源，例如：

```sh
npm run data:backfill -- --from=2004 --to=2026 --pages=2 --source=global-voices-fr
```

补采继续合并到同一新闻库，不清空现有数据；只保留可靠且不在未来的发表日期和必需署名。原始发表时间、库生成时间、来源成功采集时间各有独立含义。Node.js 24 使用环境代理时，须先配置现有的 `HTTPS_PROXY`／`HTTP_PROXY`，再启用 `NODE_USE_ENV_PROXY=1`；具体示例见 [来源说明](docs/NEWS_SOURCES.md)。不使用代理的本机直接运行普通命令，并保留正常 TLS 校验。

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
