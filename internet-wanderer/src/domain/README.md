# Domain

这一层定义内容是否合法，以及给定状态下下一站应怎样选择。不依赖 React、浏览器存储或网络请求。

- `item-schema.ts`：Zod 模型与共享类型。`WanderItem` 按 website / news / archive / event 区分约束；新闻必须有带时区的发表时间，事件必须有历史关联和证据，档案必须有原网址与真实捕获时间。来源与新闻快照使用相同边界校验。`author`、`licenseUrl` 用于署名，来源的 `publisherType` 区分媒体与机构。
- `modes.ts`：模式名称及统一参数，包括最近 20 条、新闻 7 天有效期、来源 48 小时新鲜度与三卡年份包。
- `select-next.ts`：`selectNext` 接收候选内容、模式、可选年份、近期 ID、上一条 ID 与来源状态，返回条目、实际模式和重复／空状态说明。`selectYearPack` 返回最多三条历史内容。

选择器可以注入 `now` 与 `rng`，测试无需依赖系统时间或真实随机。无效／禁用内容、未来或过期新闻、年份范围属于硬约束；候选不足时只放宽最旧的近期记录和同域名偏好。Surprise Me 先在可用模式中选择；新闻进一步按来源分组，随机历史内容按年份分组。年份包优先考虑事件、去处、档案，缺项时用合格内容补充，不生成虚构条目。

`src/content/provider.ts` 定义统一内容边界，`providers/bundled.ts` 负责当前静态适配；`repository-factory.ts` 为每个提供层建立索引并应用来源与模式启用规则；`src/storage/recent.ts` 负责浏览器足迹。不要在选择器内加入 fetch、localStorage 或 UI 逻辑。

新增可选字段需检查模型和 renderer；改变字段语义或新增必填字段时应评估提升 `schemaVersion`。稳定 ID 不随内容排序、每次采集或标题小改动重建。
