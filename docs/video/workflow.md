# Mini Sites 视频制作规程 — 端到端流程

适用:Mini Sites 的演示与系列视频(YouTube "XXX on Confluence")。上游方案:
`docs/research/market-opportunity-2026-08/12_youtube_series_plan.md`(口径约束 §2、agent 分工 §4)。
本文件与 `safety.md` 一起,构成 hubspot-a0-review-video 流水线的 Mini Sites 适配版:保留
脚本先行、三道 Owner 门禁、Remotion 组装、机器校验;删去 HubSpot A0 表单、双 portal OAuth
生命周期取证、token disposition 等 HubSpot 专属门禁。

## 端到端序列

1. **接单** — 从 mini-sites-growth 收 episode brief(Artifact 交接):内容簇 id、受众、
   promise、必备证据、CTA、"What doesn't work" 条目。brief 缺口回给 growth,不自行补增长判断。
2. **口径核对** — 对照方案 §2:标题对齐簇的 primary_query;T01 上线验证前不出现 target
   promise;不承诺 version history / 共享分数 / 学习分析。
3. **脚本** — canonical Markdown 脚本 + 图文 HTML preview。每个场景五要素:旁白、画面动作、
   证据声明(该镜头证明什么)、录制环境、遮罩说明。
4. **门① 脚本审批** — 提交 Owner(Needs You)。批准前不生成正式旁白、不执行采集计划、不渲染
   成片。录制中实际行为与脚本断言不符时,改脚本、重新走审批。
5. **环境与 fixture** — 向 mini-sites-dev 请求可录制版本确认与 fixture 验证。fixture 必须
   真实、可复跑、可下载(入 `docs/fixtures/`),同一份文件供视频、pillar 页、discovery outreach 三用。
6. **采集** — 用 `promo/capture/` harness(合成光标、clap 对齐、beat 标记)。录制站点见
   `safety.md`。真实操作按顺序录全:上传 → publish → 页面渲染;不重构操作、不合成结果帧。
7. **组装** — Remotion(a0 模板,`node scripts/init-review-project.mjs` 起包)。cue 连续性
   规则(continuous / approved-flashback,源时间不倒退)由校验器强制。字幕沿用 promo 风格:
   Avenir Next Heavy,#2E1065 靛蓝底板(端卡无底板)。旁白 Kokoro-82M `af_heart` 1.0x,
   venv:`demo-pipeline/.venv`;时长一律 ffprobe 实测;改词后 timeline reflow,不加速不剪音。
8. **渲染阶梯** — `render:proof`(前 30s,验通路)→ `render:draft`(960×540 Fine Cut)→
   **门② Picture Lock**(Owner 批准 + Fine Cut SHA-256 + 内容修订号绑定;重渲即失效)→
   `render:final`(1080p QC candidate)。
9. **校验** — 机器:`verify-review-package.mjs`(编解码/分辨率/时长/旁白一致性/资产哈希/
   审批状态)。人工:contact sheet、场景边界帧、高风险帧全分辨率检查、全片常速完整观看。
   校验未过不得称 ready;渲染成功不等于遮罩与因果连续性合格。
10. **交付** — 成片 + 元数据包素材(chapters 时间码、transcript)交 growth;growth 出标题
    (= primary_query 变体)、描述、pillar 链接、thumbnail 文案。
11. **门③ 上传授权** — 公开上传由 Owner 执行或明示授权;Marketplace 媒体位变更是另一次独立
    授权。发布后:transcript 上 pillar 页(VideoObject schema)、度量登记进月度 readout。

## 每集证据矩阵

| 断言类型 | 必备证据 |
|---|---|
| 功能可用("folder 保持相对路径") | 真实 fixture 完整走一遍上传→publish→页面渲染,镜头连续 |
| 更新生效(update-in-place) | 同一实例二次 publish,页面内容变化入镜 |
| 边界诚实("What doesn't work") | 真实失败演示(如 Plotly CDN 模式空白帧)+ 指向替代品 |
| 安全边界(CSP / secret-scan) | 真实 header / 扫描输出,非示意图 |

旁白或字幕断言的每一项能力,必须能指向本表中的一条已录证据;指不出就改脚本。

## 缺陷处理

录制中发现产品缺陷:停当前镜头,整理有界证据(重现步骤、录屏帧、环境、期望 vs 实际)交
mini-sites-dev;不自行改产品,不用剪辑 workaround 把缺陷藏进成片。缺陷阻塞本集时报 growth
调整排期。
