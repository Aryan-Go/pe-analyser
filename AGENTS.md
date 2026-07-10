<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:ui -->
- Use Tailwind CSS and shadcn/ui components to build the UI. If a shadcn component is needed, ask before adding it.
- Maintain a clear component hierarchy. Keep all components reusable and avoid duplication.
<!-- END:ui -->

<!-- BEGIN:backend -->
- Use ElysiaJS for backend routes. Refer to the Elysia skill (`/elysiajs`) when you need guidance.
<!-- END:backend -->

<!-- BEGIN:client -->
- Use Eden client to consume the Elysia API.
<!-- END:client -->

<!-- BEGIN:lib-structure -->
- All business logic stays in the `lib/` folder. Each feature or functionality gets its own subfolder inside `lib/`.
<!-- END:lib-structure -->
