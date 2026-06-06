# collaboration/ — 人 ↔ AI 的协作机制

把「一个人带着 AI 持续交付」这件事的协作规则固化下来:谁干什么、跨会话怎么交接、新会话怎么上手、上下文怎么不丢。

| 文件 / 目录 | 装了什么 | 何时看 |
|---|---|---|
| [`ai-agent-roles.md`](ai-agent-roles.md) | 主 agent 与各只读 reviewer subagent 的分工边界 | 想清楚「哪件事该谁做」时 |
| [`unattended-handoff.md`](unattended-handoff.md) | 无人值守 / 异步场景(如 GitHub Action)下的交接约束 | 让 AI 跑长任务、你不在旁边盯时 |
| [`onboarding.md`](onboarding.md) | 新成员 / 新会话的上手清单(读哪些上下文、第一件事做什么) | 新人或新环境第一次接入时 |
| [`session-commands/`](session-commands/) | 会话记忆三件套:存档 / 恢复 / 清理(见子目录 README) | 每天收工存档、次日 resume 时 |

> 这一层主要解决「上下文会断」——人会换会话、AI 会清上下文。把状态写进文件,下一个会话才能无缝接上。
