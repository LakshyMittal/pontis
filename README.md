# Pontis — AI Routing for Real Work

**Project:** Chrome Extension + FastAPI Backend  
**Version:** 1.0.0  
**Live API:** [api.pontis.in](https://api.pontis.in) | **Website:** [pontis.in](https://pontis.in)

---

## What is Pontis?

> Most people open ChatGPT or Claude without a plan. They get generic answers and waste time figuring out the right prompts. **Pontis fixes that.**

Tell Pontis who you are and what you're trying to do — in plain English. It asks you two smart follow-up questions, then generates a **step-by-step AI workflow** with copy-paste-ready prompts, tailored exactly to your situation.

It is not just "use ChatGPT." It is *how* to use it, for *your* work, right now.

> **Pontis** (Latin: *bridge*) — a bridge between your real-world work and the AI tools that can accelerate it.

---

## Features

- **AI-Powered Workflow Engine** — Generates execution-ready, 2–4 step workflows using GPT-4.1-mini, grounded in your actual context.
- **Persona Understanding** — Asks two smart follow-up questions with chip-based or free-text answers before recommending anything.
- **Copy-Paste Ready Prompts** — Every workflow step includes an exact prompt you can use immediately in ChatGPT, Claude, or Perplexity.
- **Floating Trigger Button** — Injected directly into ChatGPT, Claude, and Perplexity pages so Pontis is always one click away.
- **Save & Revisit Workflows** — Save workflows for later and track your progress through each step.
- **History** — Browse your past recommendations without starting over.
- **Free Tier (5/day)** — 5 free recommendations per day, resets at midnight.
- **Also Try** — Discover alternative AI tools relevant to your specific task.

---

## How It Works

```
1. You describe your role and goal in plain English
         ↓
2. Pontis generates 2 smart follow-up questions
         ↓
3. You select chip answers or type your own
         ↓
4. Pontis recommends 1 precise AI workflow (2–4 steps)
   with tool, purpose, instruction, and a copy-paste prompt per step
         ↓
5. You execute step by step and mark your progress
```

---

## Project Structure

```
pontis/
├── extension/                    # Chrome Extension (Manifest V3)
│   ├── assets/
│   │   ├── icon16.png
│   │   ├── icon48.png
│   │   └── icon128.png
│   ├── background/
│   │   └── service_worker.js     # Handles popup open and badge fallback
│   ├── content/
│   │   └── injector.js           # Injects floating "Open Pontis" button
│   ├── popup/
│   │   ├── popup.html            # 4-step UI: Describe → Questions → Result → History
│   │   ├── popup.css             # Full custom design system
│   │   └── popup.js              # State machine, API calls, local storage
│   └── manifest.json             # Manifest V3 configuration
│
├── routers/
│   ├── understand.py             # POST /api/understand
│   └── recommend.py              # POST /api/recommend
│
├── models.py                     # Pydantic request/response schemas
├── main.py                       # FastAPI app entry point
├── requirements.txt
├── Procfile                      # For Railway / Render deployment
└── Dockerfile
```

---

## API Reference

### `POST /api/understand`

Accepts a plain-text description and returns a persona summary plus two follow-up questions with 4 chip options each.

**Request**
```json
{
  "description": "I am a freelance UX designer trying to get more clients."
}
```

**Response**
```json
{
  "persona_summary": "Freelance UX designer focused on client acquisition",
  "questions": [
    {
      "text": "What is your biggest bottleneck right now?",
      "chips": ["Finding leads", "Writing proposals", "Portfolio", "Pricing"]
    },
    {
      "text": "Which platform do you primarily use to find clients?",
      "chips": ["LinkedIn", "Upwork", "Referrals", "Cold outreach"]
    }
  ]
}
```

---

### `POST /api/recommend`

Accepts the user's description and their two answers, returns a complete execution-ready AI workflow.

**Request**
```json
{
  "description": "Freelance UX designer trying to get more clients",
  "answers": ["Writing proposals", "LinkedIn"]
}
```

**Response**
```json
{
  "workflow_title": "LinkedIn Proposal Machine",
  "workflow_tag": "Client Outreach",
  "reason": "Your bottleneck is proposals, not leads — this workflow makes them faster and more personalized.",
  "workflow_steps": [
    {
      "step": 1,
      "tool": "ChatGPT",
      "purpose": "Research the prospect",
      "instruction": "Paste the prospect's LinkedIn About section and ask for a pain point summary.",
      "prompt": "Here is a prospect's LinkedIn bio: [paste here]. Summarize their top 3 pain points as a UX buyer in under 3 sentences."
    }
  ],
  "also_try": ["Claude", "Notion AI", "Perplexity"]
}
```

---

### `GET /health`

```json
{
  "status": "ok",
  "service": "pontis-api",
  "openai_configured": true
}
```

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/pontis.git
cd pontis
```

### 2. Set Up the Backend

```bash
pip install -r requirements.txt
```

Create a `.env` file in the root directory:

```env
OPENAI_API_KEY=sk-...
```

Start the development server:

```bash
uvicorn main:app --reload
```

The API will be live at `http://localhost:8000`.

### 3. Load the Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** using the toggle in the top-right corner
3. Click **Load unpacked**
4. Select the `extension/` folder from this repository

The Pontis icon will appear in your Chrome toolbar immediately.

---

## Deployment

The backend deploys to any Python-compatible platform. Configs are already included:

| Platform | File |
|---|---|
| Railway / Render | `Procfile` |
| Docker | `Dockerfile` |

**Procfile**
```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

Set `OPENAI_API_KEY` as an environment variable on your platform. Then update `API_BASE_URL` in `extension/popup/popup.js` to your deployed backend URL before publishing the extension.

---

## Extension Permissions

| Permission | Reason |
|---|---|
| `activeTab` | Read page context when the user clicks "Use Page Context" |
| `scripting` | Inject the floating trigger button on AI platform pages |
| `storage` | Persist history, saved workflows, and daily usage count locally |

**Host permissions** cover ChatGPT, Claude, Perplexity, and the Pontis API.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Extension | Chrome Manifest V3, Vanilla JS, CSS |
| Backend | Python, FastAPI, Pydantic v2 |
| AI Model | OpenAI GPT-4.1-mini (JSON mode) |
| Deployment | Render / Railway / Docker |

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you want to change.

```bash
# 1. Fork the repo
# 2. Create your feature branch
git checkout -b feature/your-feature

# 3. Commit your changes
git commit -m "Add your feature"

# 4. Push and open a Pull Request
git push origin feature/your-feature
```

---

## License

[MIT](LICENSE)

---

*Built by [pontis.in](https://pontis.in)*
