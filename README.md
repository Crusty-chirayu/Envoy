<div align="center">

<br/>

# ⚡ E N V O Y

### *The Career Story You Deserve, Written by an Agent That Actually Reads the Room.*

<br/>

[![License](https://img.shields.io/badge/LICENSE-MIT-FFD60A?style=for-the-badge&labelColor=0D1117)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-WELCOME-06D6A0?style=for-the-badge&labelColor=0D1117)](CONTRIBUTING.md)
[![Status](https://img.shields.io/badge/STATUS-ACTIVE_BUILD-FF6B6B?style=for-the-badge&labelColor=0D1117)](#-roadmap)
[![Cost](https://img.shields.io/badge/COST-%240_FOREVER-06D6A0?style=for-the-badge&labelColor=0D1117)](#)
[![Team](https://img.shields.io/badge/TEAM-3_BUILDERS-4CC9F0?style=for-the-badge&labelColor=0D1117)](#-the-builders)
[![Agent](https://img.shields.io/badge/CORE-AGENTIC_PIPELINE-7A5CFA?style=for-the-badge&labelColor=0D1117)](#-how-envoy-thinks)

<br/>

**[Why Envoy](#-why-envoy-exists)** · **[Features](#-what-envoy-actually-does)** · **[How It Thinks](#-how-envoy-thinks)** · **[Architecture](#-system-architecture)** · **[Quick Start](#-quick-start)** · **[Roadmap](#-roadmap)** · **[Team](#-the-builders)**

<br/>

</div>

---

<br/>

## 🧭 Why Envoy Exists

Every serious job seeker hits the same wall, over and over:

- Rewrite the same resume for the fortieth time because a new role needs different keywords.
- Have zero idea what an ATS is actually scoring you on.
- Watch every genuinely good resume tool sit behind a $12/month paywall.
- End up with a portfolio site that looks like a 2014 template because building one from scratch takes a weekend you don't have.

None of that is a *skill* problem. It's a *tooling* problem. Envoy exists to close it — permanently, and for free.

> **Envoy is not a form that spits out a PDF.** It's an agent that reads your background the way a sharp recruiter would, cross-references it against the role and sector you're chasing, and writes the version of your story that gets past the filter and into a human's hands.

<br/>

## 🎯 What Envoy Actually Does

<table>
<tr>
<td width="33%" valign="top">

### 🧠 Understand
Parses your raw background or an existing resume (PDF/DOCX) into a structured profile — skills, roles, impact, gaps and all.

</td>
<td width="33%" valign="top">

### 🎯 Target
Cross-references that profile against the job description, sector norms, and current market signal to figure out what actually needs to be said.

</td>
<td width="33%" valign="top">

### ✍️ Deliver
Renders the result into an ATS-ready resume, an academic CV, or a live, deployable portfolio — your choice, your template.

</td>
</tr>
</table>

**Feature-by-feature:**

- 🤖 **Autonomous Career Agent** — doesn't just fill a template, it *decides* what to keep, cut, reframe, or quantify based on the target role.
- 📄 **Legacy Resume Enhancer** — upload what you already have; Envoy fixes structure, rewrites weak bullets into measurable ones, and closes ATS gaps.
- 🎯 **Sector-Aware Tailoring** — tech, finance, healthcare, academia, design — each has different keyword weight and tone, and Envoy knows the difference.
- 🎨 **Open Template Library** — every template is free, versioned, and community-extendable. No "Pro" tier hiding the good fonts.
- 🌐 **One-Command Portfolio** — structured profile data becomes a deployable personal site instantly, no frontend work required.
- 🔓 **Radically Free** — this isn't a freemium funnel. Envoy ships fully open-source, every feature, forever.

<br/>

## 🔮 How Envoy Thinks

Envoy's core is a four-stage agentic loop — not a single prompt-and-pray call, but a pipeline where each stage checks and enriches the one before it.

```
  STAGE 1              STAGE 2                STAGE 3               STAGE 4
  ────────             ────────                ────────              ────────
  INGEST      ──────▶  UNDERSTAND    ──────▶   STRATEGIZE   ──────▶  COMPOSE
  
  Parse raw input       Build a structured      Compare profile        Render final
  — resume file,        profile: roles,         against target role    output — PDF,
  free-text bio,        skills, impact,         + sector, decide       CV, or live
  or manual form         timeline, gaps          what to emphasize      web portfolio
```

Each stage hands a structured artifact to the next — never raw text — so nothing gets lost in translation and every output stays traceable back to real input.

<br/>

## 🏗️ System Architecture

```
                                    ┌───────────────────────────┐
                                    │          USER               │
                                    │  Resume / Bio / Job Target  │
                                    └──────────────┬──────────────┘
                                                   │
                                                   ▼
        ┌─────────────────────────────────────────────────────────────────────┐
        │                          INGESTION LAYER                            │
        │                                                                     │
        │   ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐│
        │   │  PDF / DOCX Parse│   │  OCR (scanned)   │   │ Manual Input UI  ││
        │   └──────────────────┘   └──────────────────┘   └──────────────────┘│
        └──────────────────────────────────┬──────────────────────────────────┘
                                            │  →  Structured Profile (JSON)
                                            ▼
        ┌──────────────────────────────────────────────────────────────────────┐
        │                          AGENT LAYER (CORE)                          │
        │                                                                      │
        │   ┌────────────────────────┐        ┌────────────────────────────┐   │
        │   │  Market & Sector Engine│  ───▶ │  Agentic Optimizer (LLM)   │    │
        │   │  keyword & ATS signal  │        │  rewrite · rank · quantify │   │
        │   └────────────────────────┘        └───────────────┬────────────┘   │
        └──────────────────────────────────────────────────────┼───────────────┘
                                                                │  →  Optimized Profile
                                                                ▼
        ┌────────────────────────────────────────────────────────────────────-┐
        │                        RENDERING LAYER                              │
        │                                                                     │
        │   ┌────────────────┐   ┌──────────────────┐   ┌──────────────────┐  │
        │   │  LaTeX → PDF   │   │  Markdown → CV   │   │ React → Portfolio│  │
        │   └────────────────┘   └──────────────────┘   └──────────────────┘  │
        └──────────────────────────────────┬──────────────────────────────────┘
                                            │
                                            ▼
                                    ┌───────────────────────────┐
                                    │         OUTPUTS           │
                                    │  ATS PDF · CV · Live Site │
                                    └───────────────────────────┘
```

<br/>

## 📂 Project Structure

```text
envoy/
├── .github/                 # CI/CD workflows, issue & PR templates
├── apps/
│   ├── agent/                # LLM prompts, agent orchestration, optimization logic
│   ├── parser/                # PDF/DOCX/OCR extraction → structured JSON
│   └── web/                    # Dashboard, template studio, portfolio host
├── packages/
│   ├── templates/              # Open-source LaTeX / HTML / Markdown templates
│   └── ui/                      # Shared component library across apps
├── docs/                     # Architecture decision records, setup guides
├── .gitignore
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

<br/>

## 🛠️ Quick Start

### Prerequisites

- Node.js `>= 18.x` or Python `>= 3.10`
- Git

### Setup

```bash
# 1. Clone it
git clone https://github.com/Crusty-chirayu/envoy.git
cd envoy

# 2. Install dependencies
npm install               # or: pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env       # add your API keys / config

# 4. Run it
npm run dev
```

Once the stack is finalized, this section gets swapped for exact, tested commands — no placeholders left behind.

<br/>

## 🌿 Branching Strategy

Three builders, one repo, zero stepping on each other's work:

```
main   ────────────────────────────────────────────────────────●   (Release)
        \                                                    /
dev      └──────●─────────────────●─────────────────●───────●    (Integration)
                  \               /                 /
feature/*            [Chirayu] ──┘                 /
feature/*              [Sagar] ────────────────────┘
feature/*            [Prakash] ────────────────────|
```

- **`main`** — production-ready, protected, no direct pushes.
- **`dev`** — integration branch; every finished feature lands here before release.
- **`feature/<name>`** — one branch per feature, per person.

```bash
git checkout -b feature/your-feature-name
git commit -m "feat: add resume parser module"
git push origin feature/your-feature-name
# open a PR into dev
```

<br/>

## 🗺️ Roadmap

- [x] Repository scaffolding & team workflow
- [ ] Document parser (PDF/DOCX → structured JSON)
- [ ] Sector & keyword intelligence engine
- [ ] Agentic rewrite/optimization pipeline
- [ ] Open template library (v1: 5 resume + 2 CV templates)
- [ ] One-command portfolio deployment
- [ ] Public beta

<br/>

## 🤝 Contributing

1. Fork the repo
2. Branch off `dev`: `git checkout -b feature/AmazingFeature`
3. Commit: `git commit -m "feat: add AmazingFeature"`
4. Push: `git push origin feature/AmazingFeature`
5. Open a Pull Request into `dev`

Full guidelines live in [`CONTRIBUTING.md`](CONTRIBUTING.md).

<br/>

## 👥 The Builders

<div align="center">

| | Name | GitHub | Focus |
|---|---|---|---|
| 🧠 | **Chirayu** | [@Crusty-chirayu](https://github.com/Crusty-chirayu) | Core Architecture |
| 🎯 | **Sagar Khanal Sharma** | [@Sagar-Khanal](https://github.com/Sagar-Khanal) | Core Architecture |
| ⚙️ | **Prakash Bohara** | [@Prakash0788](https://github.com/Prakash0788) | Core Architecture |

</div>

<br/>

## 📜 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) — free to use, modify, and distribute, no strings attached.

<br/>

<div align="center">

**Built because career tools that actually work shouldn't cost a subscription.**

⭐ **Star this repo** if you want to watch Envoy grow from scratch.

</div>
