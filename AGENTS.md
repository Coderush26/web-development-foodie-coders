# AGENTS RULES (PROJECT-WIDE)

Always follow `/docs/AI-INSTRUCTIONS.md` for ALL code changes.

These rules override default framework behavior.

Before writing any code:

1. Read `/docs/AI-INSTRUCTIONS.md`
2. Read `docs/project-tree.md`
3. Follow strict reuse + file-size rules

Never:

- duplicate components
- ignore project-tree
- create large files (>250 lines)

Always:

- reuse existing components
- split large files
- keep code beginner-friendly

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->
