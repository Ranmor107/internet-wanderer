# 扩展内容与年代主题

0.3.0 把静态数据适配、内容校验、索引与时钟、年代注册、视觉组件分开。当前没有运行时 API 请求。

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

`ContentBundle` 包含版本、统一条目、来源、年份、样本生成时间和来源状态。可选 `initial` 为预先校验的静态数据，避免首屏加载闪烁；异步加载支持取消，失败时提供重试。数据在进入 UI 前再次校验，拒绝重复 ID、失效来源引用、非法日期／链接、缺失历史年份或必要署名。

当前适配器为 `src/content/providers/bundled.ts`，使用 `createStaticProvider` 合并项目内 JSON。新增另一个静态适配器时：

```ts
const myProvider = createStaticProvider('my-static-content', normalizedBundle);
// 应用入口：
<App contentProvider={myProvider} />
```

将来需要 API 时，实现相同的 `load(signal)`，在适配器内转换第三方响应；不要向卡片或窗口传递第三方原始数据。`ContentProviderHost` 负责加载状态、取消与重试，仓库工厂负责索引、来源启用和新鲜度，选择算法继续保持纯函数。

## 状态与交互边界

- 当前结果保存在当前浏览器历史条目的元数据中，保持 Router 的 key 与 index；页面返回和刷新恢复这组结果。
- 最近遇见仍按内容 ID 去重，最多 20 条；额外的 20 组漫游记录用于“上一站”恢复整个年份包。旧版存储格式继续兼容。
- 换站时只重建结果区域，操作栏保持不变，键盘焦点不会落到已经删除的按钮。
- 手机上操作栏固定在底部，考虑安全区域；新结果在需要时滚动到可阅读位置。
- 收藏继续单独存储，保持 500 条／1 MiB 约束。静态 Demo 时钟用于漫游，收藏的保存时间与旧闻判断使用真实时间。
