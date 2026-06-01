# DEMO_MODE Fixtures

Generate a fixture for a real GitHub issue by computing its key:

```bash
node -e "console.log(require('crypto').createHash('sha256').update('YOUR ISSUE TITLE HERE').digest('hex').slice(0, 16))"
```

Save the result as `<key>.json` in this directory with the canned LLMVerdict:

```json
{
  "score": 8,
  "rationale": "Bug report with clear repro and version info.",
  "missing": []
}
```

For Phase 5 screencast: pre-bake 3–5 fixtures matching the demo issues used in the recording.
For DEMO-05 resilience smoke test: no fixture needed — `FALLBACK_VERDICT` is the expected behavior.
