#!/usr/bin/env python3
"""PreToolUse hook: impide que el agente emita aprobaciones en Slack.

Bloquea (exit 2) cualquier tool call de Slack que:
  - agregue una reacción de aprobación (✅ / white_check_mark / heavy_check_mark)
  - publique texto con "APROBADO <ID>"
"""
import json
import re
import sys

APPROVAL_REACTIONS = {"white_check_mark", "heavy_check_mark", "✅", "✔️"}
APPROVAL_TEXT = re.compile(r"\bAPROBADO\s+[A-Z]+-\d{4}-\d{2}-\d{2}-\d+", re.IGNORECASE)

try:
    data = json.load(sys.stdin)
except json.JSONDecodeError:
    sys.exit(0)  # input inesperado: no bloquear por error de parseo

tool_name = data.get("tool_name", "").lower()
tool_input = data.get("tool_input", {}) or {}
blob = json.dumps(tool_input, ensure_ascii=False)

is_reaction = "reaction" in tool_name
reaction_hit = any(r in blob for r in APPROVAL_REACTIONS)

if (is_reaction and reaction_hit) or APPROVAL_TEXT.search(blob):
    print(
        "Bloqueado por protocolo cc-relay: los agentes no pueden emitir aprobaciones. "
        "Solo humanos del allowlist aprueban.",
        file=sys.stderr,
    )
    sys.exit(2)

sys.exit(0)
