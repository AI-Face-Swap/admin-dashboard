# docs/prompts — feature prompts awaiting approval

Every feature request starts here. When the user asks to build something (e.g. "create the admin dashboard"), write `<feature-slug>.md` in this folder **before writing any code**, then stop and wait for the user's approval.

A prompt file contains:

- **Goal**: what the user wants, in one or two sentences
- **Requirements**: bullet list of what will be built
- **Affected files**: where the changes will land
- **Acceptance criteria**: how we know it works
- **Open questions**: anything unclear, asked before coding

Once approved, build it, check/test it, and only when everything passes write the final doc in `docs/features/`.
