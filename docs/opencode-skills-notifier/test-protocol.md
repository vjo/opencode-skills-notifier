Testing Protocol: opencode-skills-notifier

Prerequisites

# Verify you have these installed

node --version # 18+  
 bun --version # 1.0+  
 git --version

---

Step 1 — Install opencode

npm install -g opencode-ai
opencode --version

---

Step 2 — Build the plugin

cd /Users/victor/codespace/opencode-skills-notifier
npm install
npm run build

# Verify dist/index.js exists

ls dist/

---

Step 3 — Create a test skills repository

mkdir -p /tmp/test-skills-repo
cd /tmp/test-skills-repo  
 git init  
 git checkout -b main

# Create two fake skills (top-level directories)

mkdir -p my-first-skill my-second-skill

# Add minimal content so they're not empty

echo "# My First Skill" > my-first-skill/README.md  
 echo "# My Second Skill" > my-second-skill/README.md

git add .  
 git commit -m "feat: add two test skills"

# Expose as a local git remote (simulates a real URL)

# Option A: file:// URL (works without network)

echo "Your local repo URL is: file:///tmp/test-skills-repo"

---

Step 4 — Create a test project

mkdir -p /tmp/test-opencode-project
cd /tmp/test-opencode-project  
 git init

---

Step 5 — Configure opencode to use the plugin

The plugin config lives at ~/.config/opencode/opencode.json. Edit or
create it:

mkdir -p ~/.config/opencode

cat > ~/.config/opencode/opencode.json << 'EOF'  
 {  
 "plugins": [
"/Users/victor/codespace/opencode-skills-notifier/dist/index.js"
],  
 "opencode-skills-notifier": {
"enabled": true,  
 "checkIntervalMinutes": 0,
"repositories": ["file:///tmp/test-skills-repo"],  
 "skillsScope": "both"  
 }
}  
 EOF

▎ checkIntervalMinutes: 0 forces every session to trigger a check  
 ▎ (bypasses the rate limit on first run).

---

Step 6 — Reset the plugin cache (clean state)

rm -f ~/.config/opencode/skills-notifier-cache.json

---

Step 7 — Run opencode and observe the notification

cd /tmp/test-opencode-project
opencode

Expected behavior: On session start, the plugin fires spawnCheck. Since:

- The cache is empty (last_checked_at = epoch)
- The repo has 2 skill directories (my-first-skill, my-second-skill)
- Neither skill is locally installed  


You should see a toast notification:

New skills available  
 Skills: my-first-skill, my-second-skill — npx skills add  
 file:///tmp/test-skills-repo

---

Step 8 — Verify deduplication (no double-notify)

Exit opencode and reopen it:

opencode

Expected: No toast. The skills are already in notified_skills in the  
 cache.

Verify:

cat ~/.config/opencode/skills-notifier-cache.json

# Should show my-first-skill and my-second-skill in notified_skills

---

Step 9 — Test new skill detection

Add a third skill to the repo and re-trigger:

cd /tmp/test-skills-repo
mkdir my-third-skill  
 echo "# Third" > my-third-skill/README.md
git add .  
 git commit -m "feat: add third skill"

# Clear last_checked_at to bypass interval check

cat > ~/.config/opencode/skills-notifier-cache.json << 'EOF'  
 {  
 "last_checked_at": "1970-01-01T00:00:00.000Z",
"repos": {},  
 "notified_skills": ["my-first-skill", "my-second-skill"]
}  
 EOF

Reopen opencode — Expected: toast for my-third-skill only.

---

Step 10 — Test enabled: false

# Edit ~/.config/opencode/opencode.json, set "enabled": false

# Reopen opencode — no toast should appear

---

Step 11 — Test local skill discovery (auto-discovery)

The plugin also discovers repos from skills installed under
.agents/skills/ in the project directory. To test:

mkdir -p /tmp/test-opencode-project/.agents/skills  
 cd /tmp/test-opencode-project/.agents/skills
git clone file:///tmp/test-skills-repo my-installed-skill

Now clear the config repositories array (set to []) and reset the cache.  
 Reopen opencode — the plugin should still discover  
 file:///tmp/test-skills-repo from the .git/config of the cloned skill.

---

Checklist

┌─────┬──────────────────────────────────┬────────────────────────────┐
│ # │ Scenario │ Expected │
├─────┼──────────────────────────────────┼────────────────────────────┤
│ 7 │ First session start │ Toast with 2 skills │
├─────┼──────────────────────────────────┼────────────────────────────┤
│ 8 │ Second session (no change) │ No toast │  
 ├─────┼──────────────────────────────────┼────────────────────────────┤  
 │ 9 │ New skill committed │ Toast for new skill only │  
 ├─────┼──────────────────────────────────┼────────────────────────────┤  
 │ 10 │ enabled: false │ No toast │
├─────┼──────────────────────────────────┼────────────────────────────┤  
 │ 11 │ Auto-discovery from │ Toast without explicit │
│ │ .agents/skills/ │ config │  
 └─────┴──────────────────────────────────┴────────────────────────────┘
