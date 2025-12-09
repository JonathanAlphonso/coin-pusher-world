# Long-Running Claude Agent – Setup Runbook

This is a practical checklist for using the **Autonomous Coding** quickstart with
Coin Pusher World as the target project.

## 1. One-time Setup

- Clone the quickstart repo somewhere outside this project:
  - `git clone https://github.com/anthropics/claude-quickstarts.git`
  - `cd claude-quickstarts/autonomous-coding`
- Install prerequisites (see the quickstart README for details):
  - `npm install -g @anthropic-ai/claude-code`
  - `pip install -r requirements.txt`
  - Set `ANTHROPIC_API_KEY` in your shell environment.

## 2. Connect This Game as the Target Project

- Decide where the agent will work:
  - EITHER point it at a **copy** of this repo (recommended for safety), or
  - Use a dedicated branch in this repo.
- Note the absolute path to the project directory, e.g.:
  - `C:\Users\Jonathan\Projects\JS\coin-pusher-world`

## 3. Configure Prompts and Spec

In the quickstart repo (`autonomous-coding/`):

1. Open `prompts/app_spec.txt` and replace its contents with
   `docs/autonomous-agent/app_spec.txt` from this repo.
2. (Optional but recommended) In `prompts/initializer_prompt.md`:
   - Change the `"200 detailed end-to-end test cases"` requirement to a lower number
     (e.g., 40–80) if you want a lighter long-running workload.
   - Do **not** change the JSON format of `feature_list.json`.
3. Leave `prompts/coding_prompt.md` as-is (the default workflow is good), or add a short
   note that for this project the agent should read:
   - `docs/design-spec.md`
   - `docs/autonomous-agent/agent-rules.md`
   - `plan.md`

## 4. First Run (Initializer Agent)

From `claude-quickstarts/autonomous-coding`:

```bash
python autonomous_agent_demo.py --project-dir "C:\Users\Jonathan\Projects\JS\coin-pusher-world" --max-iterations 1
```

This session should:

- Copy `prompts/app_spec.txt` into the project as `app_spec.txt`.
- Create `feature_list.json` with all planned tests/features.
- Create `init.sh` and `claude-progress.txt`.
- Optionally make an initial commit (see quickstart README).

Verify in the project directory that:

- `app_spec.txt` matches your expectations.
- `feature_list.json` is reasonable in size and scope.
- `claude-progress.txt` describes what was done.

## 5. Ongoing Coding Sessions

To continue work (coding agent sessions), run:

```bash
python autonomous_agent_demo.py --project-dir "C:\Users\Jonathan\Projects\JS\coin-pusher-world"
```

The harness will:

- Start new sessions with a fresh context.
- Re-use `feature_list.json` and git history to track progress.
- Auto-continue until you stop it (Ctrl+C) or `--max-iterations` is reached.

## 6. How to Supervise and Adjust

- Periodically:
  - Read `claude-progress.txt` for a summary of changes.
  - Skim recent commits and diffs.
  - Play the game locally (`npm install`, `npm start`) to feel changes.
- If you want to steer the agent:
  - Edit `docs/design-spec.md` to update game design or priorities.
  - Add notes or TODOs into `claude-progress.txt`.
  - Adjust `feature_list.json` **only by hand and very carefully** (respecting the
    quickstart’s rules about not deleting or editing tests unless you deliberately
    accept that risk).

## 7. When to Pause or Reset

- Pause sessions when:
  - The agent starts exploring directions you don’t like.
  - You want to do manual refactors or large design changes.
- After manual work:
  - Update `docs/design-spec.md` and `docs/autonomous-agent/agent-rules.md` as needed.
  - Optionally adjust or regenerate `feature_list.json` (e.g., via a new initializer run).

With these three files (`app_spec.txt`, `agent-rules.md`, and this runbook), you have
the core pieces needed for a long-running Claude agent focused on this game.

