# 扩展内容与年代主题

当前版本为 0.4.0（2026-10-07）。静态数据适配、内容校验、索引与时钟、年代注册、视觉组件保持分离。官方新闻接口通过 Node.js 维护脚本接入本地快照；浏览器没有运行时 RSS 请求。

## 扩充近期与历史新闻库

当前新闻来源包括 Global Voices 的英语、中文、日语、法语、西班牙语接口，以及 NASA 和 European Central Bank，共 7 个接口、3 个发布主体。新闻保存于 `data/news.snapshot.json`；网页、新闻和 Time Machine 的历史切片继续使用统一条目模型。

- 新闻保持 `kind=news` 和带时区的可靠 `publishedAt`；原始发表日期不能替换为采集时间。年代较早的新闻无需注册年份，也不要自动添加 `history`。
- 可靠且不在未来的历史新闻可进入 News Drift 与 Surprise Me。7 天仅用于历史新闻／旧闻标记，48 小时仅用于采集状态提示，都不是入池或恢复条件。
- 保留来源、语言、作者、明确的译者和必要许可；缺少必需署名的条目不入库。已有原版链接时保留 `evidenceUrls`。
- 新来源先核验官方接口与显示条款，再配置到 `config/rss-sources.json`，由采集适配器规范化为统一条目。不要把浏览器跨域抓取加进卡片或页面。

近期维护执行 `npm run data:refresh`。历史补采可执行：

```sh
npm run data:backfill -- --from=2004 --to=2026 --pages=2
```

每个年份最多请求 2 页，属于有界扩充，不是全量归档。添加 `--source=global-voices-fr` 可只重采一个来源。刷新和补采合并旧库、保留稳定 ID 并按规范化 URL 去重；合法空源或采集失败不清库，失败不会伪造上次成功采集时间。完成维护后运行 `npm run data:validate` 与 `npm run build`，确认新闻池和现有收藏仍可恢复。

## 新增一个年份

1. 在 `config/years.json` 增加年份、标题、说明与 `theme`。例如把 2003 指向已有 `classic`；不是把 2003 写成代码条件。
2. 在 `data/history.json` 添加对应年份的条目，保留稳定 ID、合法来源、事件依据与真实存档时间。
3. 在来源配置中注册条目使用的 `sourceId`。
4. 运行 `npm run data:validate` 和 `npm run build`。

同一主题可以被多个年份复用。只有有可用历史内容的年份才会显示在导航中。

## 新增年代主题

在 `config/era-themes.json` 注册一个新 `id`，然后让年份的 `theme` 引用它。配置包括：

| 字段 | 用途 |
| --- | --- |
| `skin` | `bevel` 立体边框、`glass` 玻璃渐变、`flat` 平面控件 |
| `font` | `mono`、`sans`、`serif`；使用本地字体 |
| `motion` | `snap` 短淡入、`float` 轻浮入、`slide` 短滑入 |
| `colors` | 背景、文字、边框、强调色与浏览器栏的语义颜色 |
| `caption` / `connection` / `note` | 年代展览的标签与短文案 |
| `windowLabel` | 浏览器窗口的无障碍描述 |

复用皮肤、更换颜色、字体、文案及入场反馈，只需修改 JSON。新增一种皮肤行为时，在注册模型中增加类型并添加对应 CSS；页面与内容选择器不需要年份分支。注册表会拒绝重复主题和不存在的引用。

`src/ui/themes.ts` 将配置映射为语义样式。`BrowserFrame` 接收可选 `theme`，不读取内容上下文或数据文件。CSS 根据 `data-skin` 工作，减少动态效果设置始终覆盖年代动效。

## 更换内容提供层

`src/content/provider.ts` 定义统一接口：

```ts
interface ContentProvider {
  readonly id: string;
  readonly initial?: ContentBundle;
  load(signal?: AbortSignal): Promise<ContentBundle>;
}
```

`ContentBundle` 包含版本、统一条目、来源、年份、快照生成时间和来源状态。可选 `initial` 为预先校验的静态数据，避免首屏加载闪烁；异步加载支持取消，失败时提供重试。数据在进入 UI 前再次校验，拒绝重复 ID、失效来源引用、非法日期／链接、缺失历史年份或必要署名。

当前适配器为 `src/content/providers/bundled.ts`，使用 `createStaticProvider` 合并项目内 JSON。新增另一个静态适配器时：

```ts
const myProvider = createStaticProvider('my-static-content', normalizedBundle);
// 应用入口：
<App contentProvider={myProvider} />
```

将来需要运行时 API 提供层时，实现相同的 `load(signal)`，在适配器内转换第三方响应；不要向卡片或窗口传递第三方原始数据。`ContentProviderHost` 负责加载状态、取消与重试，仓库工厂负责索引、来源启用、恢复条件和采集状态，选择算法继续保持纯函数。当前本地快照和 Node.js 维护命令不需要账号或数据库服务；Wayback 自动接入仍未实现。

## 状态与交互边界

- 当前结果保存在当前浏览器历史条目的元数据中，保持 Router 的 key 与 index；页面返回和刷新恢复这组结果。
- 最近遇见仍按内容 ID 去重，最多 20 条；额外的 20 组漫游记录用于“上一站”恢复整个年份包。旧版存储格式继续兼容。
- 换站时只重建结果区域，操作栏保持不变，键盘焦点不会落到已经删除的按钮。
- 手机上操作栏固定在底部，考虑安全区域；新结果在需要时滚动到可阅读位置。
- 收藏继续单独存储，保持 500 条／1 MiB 约束。静态 Demo 时钟用于漫游，收藏的保存时间与旧闻判断使用真实时间。
- 只有新闻库里的有效条目参与漫游；导入收藏不会向库添加记录，停用条目或来源也不会通过旧收藏重新开放。
- 保留上一级目录的 `一键启动.cmd` 与启动约定；内容和采集逻辑迭代后仍须通过构建与 `npm run test:launcher`。
