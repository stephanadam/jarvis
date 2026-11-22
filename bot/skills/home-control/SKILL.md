---
name: home-control
description: "Control Steve's Home Assistant via Nabu Casa. Use when Steve asks to check or change lights, switches, scenes, climate, or other HA entities."
---

# Home control

1. Confirm the entity if ambiguous (ask briefly).
2. Read state with `ha_get_state` before changing when unsure.
3. Act with `ha_call_service` (`domain`, `service`, `entity_id`).
4. If tools return `missing_secrets`, tell Steve which names to bind —
   never ask for the raw values in chat.
5. Prefer MCP tools from the `home-assistant` connection when they appear;
   otherwise use the REST tools above.
