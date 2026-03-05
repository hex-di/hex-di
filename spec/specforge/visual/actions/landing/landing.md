# Landing Actions

**IDs:** ACT-028 through ACT-029
**Context:** Call-to-action buttons and navigation links on the SpecForge landing page.

---

## Action Flow Diagrams

### ACT-028 Landing CTA

```
  User clicks primary CTA button
         |
         v
  ELM-074-hero-cta-primary (click)     ELM-085-cta-button (click)
         |                                     |
         +-------------+--------------+--------+
                        |
                        v
              ACT-028-landing-cta
                        |
                        +---> Internal navigation to signup / getting-started
                        +---> Analytics event: cta_click { source, variant }
```

### ACT-029 Landing Navigate

```
  User clicks secondary CTA / footer link
         |
         v
  ELM-075-hero-cta-secondary (click)    ELM-086-footer-link (click)
         |                                      |
         +-------------+---------------+--------+
                        |
                        v
              ACT-029-landing-navigate
                        |
                        +---> Opens external URL in new tab
                        +---> (e.g., docs site, GitHub repo, etc.)
```

## Action Summary

| ID      | Name             | Type              | Trigger                 | Events Dispatched | Side Effects                    |
| ------- | ---------------- | ----------------- | ----------------------- | ----------------- | ------------------------------- |
| ACT-028 | Landing CTA      | navigate          | ELM-074 / ELM-085 click | --                | Internal navigation + analytics |
| ACT-029 | Landing Navigate | navigate-external | ELM-075 / ELM-086 click | --                | External URL in new tab         |

## Cross-References

- **Element:** ELM-074-hero-cta-primary (ACT-028 trigger)
- **Element:** ELM-075-hero-cta-secondary (ACT-029 trigger)
- **Element:** ELM-085-cta-button (ACT-028 trigger)
- **Element:** ELM-086-footer-link (ACT-029 trigger)
- **Component:** CMP-023-hero-section (contains ELM-074, ELM-075)
