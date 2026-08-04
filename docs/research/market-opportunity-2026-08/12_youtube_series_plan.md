# "XXX on Confluence" YouTube 系列 — 推进方案

制定:2026-08-04。上游依据:`00_executive_readout.md`(reposition and test)、`03_seo_content_map.csv`(20 内容簇)、`06_positioning_recommendation.md`(口径约束)、`docs/specs/2026-08-03-t01-single-root-index-bundle-handoff.md`(T01 已批准、未实现)。
执行结构:CodexLoom 现有 agent 三角(mini-sites-growth ⇄ demo-video-producer ⇄ mini-sites-dev,team-links 已于 2026-08-04 声明)。

## 1. 目标与定级

研究结论是 **reposition and test,不要放量**。因此本系列的首要目标不是获客冲量,按权重排:

1. **支撑 wave-1 discovery**:每集的 fixture 与成片是接触 27 个 discovery 候选人的实物材料(0 人已接触,P0)。
2. **占据低竞争 SERP/GEO 词位**:每集标题对齐一个内容簇的 `primary_query`;transcript + chapters 落到 zenuml.com 对应 pillar 页(VideoObject schema),供 AI 搜索引用。样本中已有 2 条 YouTube 证据,渠道有真实需求表达。
3. **降低错装率**:chooser(P01/S12)与 security(S14)两集把不适配用户在安装前劝走 —— 研究判定这类内容"required to reduce wrong-fit installs"。

安装量是滞后指标,不是本季 KPI。季度评审看 `00_executive_readout.md` 的 decision gates(5 位 creator 提供真实工件、4 位无源码手术发布等)。

## 2. 口径约束(每集必须遵守)

- 类目词:**Confluence-native interactive work-artifact publisher**。标题与开场不用 "mini-site"、不用 "HTML macro" 作主语;XXX 一律是工件结果(Allure Report / Client Report / Prototype…),outcome-first。
- T01(单文件)shipped 且线上验证之前,只用 truthful promise:"Publish a built HTML/CSS/JS folder…"。AI-artifact 相关承诺(target promise)在解锁前不出现在任何已发布视频里。
- 每集固定含 **"What doesn't work" 段**(≥15 秒):live dashboards、外网请求、host-page DOM、共享持久化,明说不支持并指向正确替代品(native iframe / 专用集成)。这是差异化,不是免责声明。
- 不承诺 version history / rollback / diff / 学习分析 / 共享分数;republish 只说 stable republish。
- honesty rules 沿用 `promo/README.md`:真实采集、不伪造成功帧、真实评论走 API 预写、遮罩清单沿用 `PRIVACY_CSS`。

## 3. 剧集清单

### Wave 0 — 现在可拍(无产品前置,folder 口径诚实)

| # | 标题(工作稿) | 簇 | primary_query | fixture | 备注 |
|---|---|---|---|---|---|
| W0-1 | Publish an HTML Folder on Confluence | S04/P04 | upload HTML folder to Confluence | promo/site(Feature Prioritisation,已验证可交互) | 系列开台集,当前 truthful promise 的完整演示 |
| W0-2 | Allure Reports on Confluence | S06 | Allure report Confluence | 离线 Allure export(真实测试跑出) | QA wedge;明确拒绝 live TestRail/Testomat 口径 |
| W0-3 | Interactive Client Reports on Confluence | P03/S10 | publish interactive HTML report to Confluence | 脱敏月度服务报告模板 | 必拍 update-in-place(stable republish)镜头 |
| W0-4 | Clickable Prototypes on Confluence | S08 | embed HTML prototype in Confluence | 导出型 checkout-widget 原型 | 排除 live Figma/Axure 意图,只做 tool-independent export |
| W0-5 | Four Ways to Put HTML on Confluence | P01/S12 | embed HTML in Confluence Cloud | 四路对照 demo(snippet/URL/file/folder) | chooser 集;该推荐 iframe/竞品时明说;嵌入现有 pillar 页 |
| W0-6 | Plotly Charts on Confluence | S07 | embed Plotly HTML in Confluence | `write_html` directory 模式 fixture | 当前多文件契约可用;CDN 模式现场演示失败并解释 |
| W0-7 | Is HTML Safe on Confluence? | S14 | is it safe to run HTML in Confluence Cloud | CSP header + secret-scan 演示 | 面向 admin(审批门角色);trust 页配套 |
| W0-8(备选) | Training Simulators on Confluence | S09 | interactive simulator Confluence | 文件夹型 quiz/决策树 | 声明 local-state only、无共享分数 |

### Wave 1 — T01 shipped + 线上验证后解锁

| # | 标题(工作稿) | 簇 | 门禁 |
|---|---|---|---|
| W1-1 | Claude Artifacts on Confluence | S01/P02 | T01 上线验证;系列旗舰集,最高近期需求 |
| W1-2 | A Single HTML File on Confluence | S03 | 同上;transactional 意图 |
| W1-3 | ChatGPT Mini-Tools on Confluence | S02 | 先判断与 W1-1 SERP/语言是否真有区分,无则并集 |
| W1-4 | Full-Height Embeds on Confluence | S16 | 360px 高度修复 shipped 后才拍 |

### Wave 2 — 证据解锁后再议

dbt docs(S05,需真实 bundle 测试)、CI/API 自动发布(S11,只做 roadmap 内容、无 transactional CTA)、legacy 迁移(S15)。

节奏:**双周一集**;频道上线前先囤 3 集成片(W0-1/2/5),此后按双周节拍消化 wave 0。demo-video-producer 与 Passetta A0 共用,产能冲突时 Owner 裁决优先级。

## 4. 生产流水线(CodexLoom 机制映射)

每集走同一条链,三道 Needs You 门:

```
mini-sites-growth                demo-video-producer               mini-sites-dev
  episode brief ──Artifact──▶  脚本+分镜草案
  (簇id/受众/promise/           │
   proof/CTA/limits段)          ├─▶ 口径核对 ──▶ 【Needs You ①脚本审批】
                                │
                                ├──Message──▶ 请求可录制版本/fixture 验证
                                │◀──────────  录制环境确认;录制中缺陷以
                                │             有界证据回传 dev(不自行改产品)
                                ├─ 采集(promo/capture harness)
                                ├─ 组装(Remotion 流水线,见 §6)
                                ├─ Fine Cut + QC 包 ──▶ 【Needs You ②Picture Lock】
                                └─ 1080p + 元数据包 ──▶ 【Needs You ③上传授权】
  metadata 包(标题=primary_query 变体、
  chapters、描述、pillar 链接、thumbnail 文案)
  ← growth 拥有;上传动作 = Owner(频道凭据个人持有)
  发布后:transcript 上 pillar 页、Marketplace 媒体位评估、
  月度 metrics readout(Schedule)
```

职责红线沿用已声明的 team-links:growth 出 brief 与增长判断;video 只制作;dev 只供可录制版本并接收缺陷;上传/对外提交永远走 Owner 授权。

## 5. 前置任务(拍第一集之前)

- **P-1 录制站点**:公开视频不能出现 `Mini-Site (Development)` 标签与 lite-dev 租户痕迹(promo/README "Known gaps" 已记录)。在 minisites-prod org(support@zenuml.com 为 org admin)下备一个租户名中性的干净站点,装 **production** 版应用,建演示 space。所有 wave 0 剧集共用。
- **P-2 fixture 库**:每集 fixture 是真实、可下载、可复跑的工件,入库 `docs/fixtures/`(或独立目录),同一份文件三用:视频素材、pillar 页下载、discovery outreach 样品。
- **P-3 流水线适配**:按《pitch-demo-video》提案完成 a0 流水线的 Mini Sites 适配 —— 补写 workflow/safety 两份 reference(R1 阻塞项)、门禁裁剪(删 HubSpot 合规项,保留脚本审批/Picture Lock/上传授权三道)、字幕沿用 promo 的 Avenir + 靛蓝底板风格。
- **P-4 CodexLoom 整备**:① 建 Topic "youtube-series-xxx-on-confluence"(成员:growth/video/dev);② 三个 agent 的 Profile 目前为空,补写(video 的 Profile 内嵌本方案 §2 口径约束与 §4 门禁);③ 建两个 Schedule:双周制作 tick、月度 metrics readout。

## 6. 度量

- 每集:YouTube impressions / CTR / 平均观看时长;pillar 页 GSC 展示与点击;listing 访问(Marketplace partner analytics);安装(forge-installs 快照)。
- 系列级(月度 readout,growth 汇报):discovery 候选人回复数与工件到手数 —— 对齐 decision gates,这是唯一决定"是否放量/是否续拍 wave 1"的指标。
- 产品端归因:macro_viewed 等事件已带 product_type 与 environment_type,新装租户的首周行为可与剧集上线时间对照(信号,不当结论)。

## 7. 决策记录(2026-08-04,Owner 批准)

1. 频道:新建品牌频道(名称待定;hero 片留在 @braveostrich 不动,listing 引用不变)。
2. 节奏:双周一集,先囤 3 集(W0-1/2/5)再开台。
3. W0-8(simulator):留作 wave 1 缓冲,不进本季主排期。
4. 本方案随 stg/verify 分支提交。
