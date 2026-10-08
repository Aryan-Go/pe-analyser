# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# ui
- Use Tailwind CSS and shadcn components to build the UI; ask the user before adding any new shadcn component. Confidence: 0.85
- Maintain a component hierarchy and keep all components reusable. Confidence: 0.85

# backend
- Use Elysia for backend routes; consult skills when required to learn more about Elysia. Confidence: 0.85
- Use Eden client for consuming Elysia APIs. Confidence: 0.85

# architecture
- Place all business logic in the lib/ folder, with each functionality in its own subfolder inside lib/. Confidence: 0.85
- When adding support for a new variant/provider, keep behavior parity with the existing implementation and abstract behind a shared interface so downstream code stays unchanged. Confidence: 0.7

# workflow
- Expects the agent to make the code changes directly across all files/folders rather than just proposing them. Confidence: 0.75

# communication
- Wants an explicit list/summary of all changes made after completing the work. Confidence: 0.75
- Prioritizes speed and low token usage; keep work fast and concise unless more depth is required. Confidence: 0.8

ce: 0.6

# communication
- Wants an explicit list/summary of all changes made after completing the work. Confidence: 0.75

