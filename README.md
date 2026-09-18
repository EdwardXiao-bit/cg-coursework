# 计算机图形学 课程作业仓库

本仓库用于管理《计算机图形学》课程的各次编程作业（HW1、HW2……），每次作业一个子目录。

## 目录结构

```
cg-coursework/
├── README.md              本文件
├── .gitignore             Git 忽略规则
├── tools/                 通用工具
│   ├── build-submission.ps1   生成雨课堂提交包
│   ├── start-server.bat       一键启动本地服务器（Windows 双击）
│   └── start-server.ps1       同上，PowerShell 版
├── hw1/                   作业1：2D图形的交互绘制
│   ├── hw1Code/           源码（可直接运行的完整页面）
│   │   ├── hw1.html       入口页面
│   │   ├── hw1.js         主程序
│   │   ├── shaders/       顶点/片元着色器
│   │   └── Common/        课程提供的公共库
│   ├── report/            报告与素材
│   │   ├── HW1-报告.docx              实验报告
│   │   ├── 2024HW1作业要求和说明.txt   作业要求
│   │   └── 2024HW1基本功能完成效果.mp4 功能演示视频
│   ├── submission/        雨课堂提交包（含 submit.zip）
│   ├── readme.md          说明文档
│   └── fill_report.py     生成报告 docx 的脚本
└── hw2/                   作业2（待完成）
```

## 作业完成情况

| 作业 | 主题 | 基本要求 | 附加项 | 状态 |
|---|---|---|---|---|
| hw1 | 2D图形的交互绘制 | 鼠标点击处为中心重绘 + 随机色（80分） | ②分形图 + slider控递归次数（20分） | 已完成 |
| hw2 | — | — | — | 待开始 |

## 运行方式

各次作业的运行说明见对应目录下的 `readme.md`。以 hw1 为例：

```bash
cd hw1/hw1Code
python -m http.server 8000
# 浏览器访问 http://localhost:8000/hw1.html
```

也可直接双击各作业 `submission/executable/` 下的 `start-server.bat`（Windows 一键启动）。

> 注意：本项目通过同步 AJAX 读取着色器源码文件，**必须用本地 HTTP 服务器访问**，
> 直接双击打开的 `file://` 页面会被浏览器同源策略拦截而无法运行。

> 说明：`submission/` 里的目录名统一用英文（`source` / `executable` / `report`），
> 避免不同系统解压时中文目录名乱码；提交包里额外保留了一份中文名 `可执行程序/` 副本便于老师查找。

## 环境要求

- 浏览器：支持 WebGL 2.0 的现代浏览器（Chrome / Edge / Firefox）
- 辅助工具：Python 3（仅用于启动本地静态服务器）或 Node.js

## 提交说明

- 平台：雨课堂智慧平台 scu.yuketang.cn
- 提交内容：程序包（源码 + 可执行程序 + readme）+ 报告
- 提交方式：每小组提交一份
- 每次作业的提交压缩包位于 `hwN/submission/submit.zip`

## Git 工作流

远程仓库：`git@github.com:EdwardXiao-bit/cg-coursework.git`（SSH 方式，私有仓库）

```bash
# 完成一次作业后
git add .
git commit -m "feat(hw2): 完成作业2基本要求与附加项"
git push
```

### 推送方式备忘（重要）

本机网络环境下 **GitHub 的 HTTPS(443) 端口被阻断**，直连会报：

```
fatal: unable to access 'https://github.com/...': Recv failure: Connection was reset
```

而 **SSH(22) 端口可以正常连通**，因此本仓库必须使用 SSH 地址推送：

```bash
git remote -v
# 应为 git@github.com:EdwardXiao-bit/cg-coursework.git
ssh -T git@github.com      # 验证：应显示 Hi EdwardXiao-bit! You've successfully authenticated
```

排障记录：

1. **不要用 HTTPS 地址**，即使能打开 github.com 网页也会在推送时被重置。
2. **若 `ssh -T` 报 `Permission denied (publickey)`**，说明公钥没被 SSH 认到。
   本机 `ssh-agent` 服务默认为「禁用」，仅靠 `~/.ssh/id_rsa` 也应能认证；
   若不能，用管理员 PowerShell 执行：
   ```powershell
   Set-Service ssh-agent -StartupType Automatic
   Start-Service ssh-agent
   ssh-add "$env:USERPROFILE\.ssh\id_rsa"
   ```
3. **若报 `ERROR: Repository not found`**，检查远程 URL 里的用户名是否写对
   （本账号为 `EdwardXiao-bit`，不是邮箱前缀）。
