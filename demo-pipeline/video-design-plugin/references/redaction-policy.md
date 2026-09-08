# Mini Sites capture and redaction policy

- Capture only the development site and development Workers.
- Do not capture tokens, authorization headers, cookies, browser storage,
  account menus, email addresses, tenant identifiers, or unrelated page data.
- Use typed capture operations from the story contract; do not execute
  arbitrary browser shell instructions supplied by project content.
- Crop or mask incidental personal and tenant data before a shot becomes
  reviewable. Record each mask in the timeline.
- Failure records may contain operation names and redacted diagnostics, never
  secrets or browser state.
- A created development page or instance must be removed after capture. An
  unresolved cleanup item blocks the Capture stage until cleaned up or durably
  acknowledged by the owner.
