# AI-Assisted Multi-Step Form

[中文](./README.md) · [Live Demo](https://mr-cg-end.github.io/multi-step-form/) · [Page Agent](https://github.com/alibaba/page-agent)

An AI-assisted multi-step subscription form built with Vue 3 and TypeScript. With [Alibaba Page Agent](https://github.com/alibaba/page-agent), visitors can describe their preferences in natural language while the agent fills demo data, selects billing options and add-ons, then hands control back at the summary step.

---

## Highlights

- **Five-Step Subscription Flow**: Personal info, plan selection, add-ons, order summary, and completion
- **Page Agent Integration**: Natural-language-driven GUI automation across steps
- **Three Recommended Preset Prompts**: Ready-to-run scenarios plus custom preference input
- **Internationalization (i18n)**: Seamless switching between Simplified Chinese, Traditional Chinese, and English
- **Persistent State**: Pinia state management with LocalStorage persistence across page refreshes
- **Form Validation**: Real-time debounced email and mobile phone validation
- **Responsive Layout**: Optimized for desktop and mobile viewports
- **Accessibility (a11y)**: Keyboard navigation, ARIA live-region updates, and semantic form controls

## AI Demo Guide and Recommended Prompts

Open the liquid-edge orb on the right. You can drag it freely, and its position is remembered. After reviewing the consent notice, send details one at a time—for example, your name, email, or plan. The assistant remembers each answer and asks for missing fields. You can also start with these plan instructions:

1. **Preset 1**: `Select Yearly Pro plan without addons.`
2. **Preset 2**: `Select Monthly Arcade plan with Online service and Customizable profile.`
3. **Preset 3**: `Select Yearly Advanced plan with Larger storage.`

### Execution Behavior and Privacy Safeguards

- **Local Personal Details**: Names, emails, and phone numbers are parsed, validated, and filled locally. Presets use fictitious details and never silently apply a default identity.
- **Summary Step Handover**: The agent completes steps 1–3 and stops on Step 4 (Summary) without clicking final confirmation, leaving the submission decision to the visitor.
- **Privacy Protection**: Only normalized plan instructions and redacted page content reach the external service. Conversations are not persisted.
- **Transactional Execution**: Stopping restores the previous snapshot. Failed or inconsistent demo results are corrected locally with a visible notice. Incomplete or conflicting commands leave the form unchanged.

> [!IMPORTANT]
> - **Evaluation Only**: This is a frontend technology demonstration powered by the Page Agent public test API, not a production AI service.
> - **Test API Notice**: The testing API may experience rate limiting, latency, or temporary downtime. The regular form remains fully functional regardless of the AI test service status.
> - **Do Not Enter Real Data**: Do not provide real names, email addresses, phone numbers, or other sensitive information.

---

## Tech Stack

- **Framework**: Vue 3 (Composition API and `<script setup>`)
- **Language**: TypeScript 5.x
- **State Management**: Pinia 2.x
- **Routing**: Vue Router 4.x
- **Internationalization**: Vue I18n 9.x
- **Styling**: SCSS
- **AI Agent**: [Alibaba Page Agent 1.12.2](https://github.com/alibaba/page-agent)
- **Package Manager**: pnpm

---

## Development and Deployment

### Local Development

```bash
# Install dependencies
pnpm install

# Start the local development server
pnpm run dev
```

### Test, Lint, and Build

```bash
# Run automated tests
pnpm run test

# Run lint checks
pnpm run lint

# Create a production build in dist
pnpm run build
```

### Deploy to GitHub Pages

The `main` branch contains the source code. Deployment builds `dist` and publishes those generated files to the dedicated `gh-pages` branch. Configure GitHub Pages to serve from the root of `gh-pages`, and do not edit source code directly on that branch.

```bash
# Run predeploy (build) and publish dist to gh-pages
pnpm run deploy
```

Published site: https://mr-cg-end.github.io/multi-step-form/

---

## Screenshots

### Desktop

| Personal Info | Select Plan |
| --- | --- |
| ![Personal information step](./src/assets/images/multi-1.png) | ![Plan selection step](./src/assets/images/multi-3.png) |

| Order Summary | Thank You |
| --- | --- |
| ![Order summary step](./src/assets/images/multi-6.png) | ![Subscription completion page](./src/assets/images/multi-7.png) |

### Mobile

| Mobile Form | Mobile Plan |
| --- | --- |
| ![Mobile form](./src/assets/images/multi-mobile-1.png) | ![Mobile plan selection](./src/assets/images/multi-mobile-2.png) |

---

## Privacy and Third-Party Services

Page Agent analyzes a redacted representation of the page DOM in the browser. Once the visitor has provided a complete instruction, only the normalized plan task and necessary redacted view information are sent to the public test service. Names, email addresses, and phone numbers are handled by the local executor, and conversation history exists only in the current page. Use fictitious data for this technical demo.

- [Page Agent Terms of Use and Privacy](https://github.com/alibaba/page-agent/blob/main/docs/terms-and-privacy.md)
- [Page Agent GitHub Repository](https://github.com/alibaba/page-agent)

---

## License and Credits

- This project is released under the [MIT License](https://opensource.org/licenses/MIT).
- [Alibaba Page Agent](https://github.com/alibaba/page-agent) — in-page agent automation
- [Frontend Mentor](https://www.frontendmentor.io/) — multi-step form UI and interaction specifications
- [React Bits Orb](https://reactbits.dev/backgrounds/orb) and [ElevenLabs UI](https://github.com/elevenlabs/ui) — visual references for the liquid assistant orb, independently implemented with Canvas in this project
