# Security Policy

This kit ships security tooling — a secret scanner (`check-secrets.cjs`) and dangerous-command / high-risk-edit guards. So we hold its own security to a higher bar, and ask you to disclose responsibly.

[English] · *(中文见每节末)*

## Reporting a vulnerability

**Please do not open a public issue for security problems.** Instead:

- Use **GitHub Security Advisories**: [Report a vulnerability](https://github.com/huangjing0526/founder-saas-kit/security/advisories/new) (private), or
- Email the maintainer via the address on the [GitHub profile](https://github.com/huangjing0526).

Include: what you found, how to reproduce it, and the impact you expect.

*(中文)* 安全问题请走 GitHub Security Advisory 私下报告，或邮件联系维护者，**别开公开 issue**。附：发现了什么、怎么复现、影响范围。

## In scope

Because of what this kit is, these count as security issues:

- A **guard bypass** — a dangerous command (`rm -rf`, secret-file edit, CI-file edit) that the guards in `engineering/enforcement/hooks/` fail to block.
- A **secret-scanner miss** — a real credential pattern that `check-secrets.cjs` fails to catch or mask.
- Any way a copied script could **execute** attacker-controlled input (the demo only feeds commands to guards, never executes them — a path that actually executes is a bug).

Out of scope: vulnerabilities in *your own* project after you copy the templates in and modify them — that's yours to own, though we're happy to advise.

*(中文)* 范围内：守卫绕过、密钥扫描漏报、脚本被诱导执行外部输入。范围外：你抄进自己项目后改出来的问题。

## Response

- Acknowledgement target: within **5 business days**.
- We'll confirm the issue, agree on a fix timeline, and credit you in the [CHANGELOG](CHANGELOG.md) unless you prefer to stay anonymous.

*(中文)* 5 个工作日内回应；修复后在 CHANGELOG 致谢（除非你想匿名）。
