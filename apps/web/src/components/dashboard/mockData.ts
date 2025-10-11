import { makeId } from "./utils";
import { Conversation, Template, Folder } from "./types";

export const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: "c1",
    title: "Product Demo Video - Veo3",
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    messageCount: 12,
    preview:
      "Creating a product demo video using Veo3 model with custom prompts...",
    pinned: true,
    folder: "Video Projects",
    messages: [
      {
        id: makeId("m"),
        role: "user",
        content: "Generate a product demo video for our new app launch.",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: makeId("m"),
        role: "assistant",
        content:
          "Sure — I'll create a professional demo video using Veo3. Starting generation now...",
        createdAt: new Date(
          Date.now() - 2 * 60 * 60 * 1000 + 60000
        ).toISOString(),
      },
    ],
  },
  {
    id: "c2",
    title: "Background Music - Ambient",
    updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    messageCount: 22,
    preview: "Generating ambient background music for meditation app...",
    pinned: false,
    folder: "Audio Projects",
    messages: [],
  },
  {
    id: "c3",
    title: "Tutorial Video - AI Basics",
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    messageCount: 9,
    preview: "Educational video explaining AI concepts with visual examples...",
    pinned: false,
    folder: "Educational Content",
    messages: [],
  },
  {
    id: "c4",
    title: "Social Media Video - Instagram",
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    messageCount: 17,
    preview:
      "Creating short-form video content for Instagram stories and reels...",
    pinned: true,
    folder: "Video Projects",
    messages: [],
  },
  {
    id: "c5",
    title: "Podcast Intro Music",
    updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    messageCount: 6,
    preview: "Generating energetic intro music for tech podcast series...",
    pinned: false,
    folder: "Audio Projects",
    messages: [],
  },
  {
    id: "c6",
    title: "AI Model Comparison Video",
    updatedAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    messageCount: 31,
    preview: "Video comparing different AI models for content generation...",
    pinned: false,
    folder: "Educational Content",
    messages: [],
  },
  {
    id: "c7",
    title: "Weekly review – personal goals",
    updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    messageCount: 8,
    preview: "Sleep routine, gym cadence, reading list, dopamine detox...",
    pinned: false,
    folder: "Personal",
    messages: [],
  },
  {
    id: "c8",
    title: "Code review: message composer",
    updatedAt: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    messageCount: 14,
    preview: "Edge cases: IME input, paste images, drag-n-drop, retries...",
    pinned: false,
    folder: "Code Reviews",
    messages: [],
  },
  {
    id: "c9",
    title: "LLM evals – rubric + dataset",
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    messageCount: 40,
    preview: "BLEU vs human eval, task matrix, hallucination checks...",
    pinned: false,
    folder: "Work Projects",
    messages: [],
  },
  {
    id: "c10",
    title: "Prompt library – onboarding",
    updatedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    messageCount: 11,
    preview: "Create intro prompts for HR, IT, and support with guardrails...",
    pinned: false,
    folder: "Work Projects",
    messages: [],
  },
  {
    id: "c11",
    title: "Grocery budgeting – monthly",
    updatedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    messageCount: 5,
    preview: "Track cost per meal, reduce waste, and plan bulk buys...",
    pinned: false,
    folder: "Personal",
    messages: [],
  },
];

export const INITIAL_TEMPLATES: Template[] = [
  {
    id: "t1",
    name: "Video Generation Prompt",
    content: `**Video Generation Request**

**Type:** [Product Demo / Tutorial / Marketing / Social Media]

**Duration:** [15s / 30s / 60s / 2min]

**Style:** [Professional / Casual / Artistic / Minimalist]

**Content Description:**
Detailed description of what should be shown in the video

**Target Audience:**
Who is this video for?

**Key Messages:**
- Main point 1
- Main point 2
- Main point 3

**Visual Requirements:**
- Color scheme
- Logo/branding elements
- Text overlays needed`,
    snippet: "Structured video generation prompt template...",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "t2",
    name: "Audio Generation Prompt",
    content: `**Audio Generation Request**

**Type:** [Background Music / Voice Over / Sound Effects / Podcast Intro]

**Duration:** [10s / 30s / 60s / 3min / 10min]

**Genre:** [Ambient / Electronic / Classical / Rock / Jazz / Hip-Hop]

**Mood:** [Energetic / Calm / Dramatic / Upbeat / Melancholic]

**Use Case:**
What will this audio be used for?

**Technical Requirements:**
- Sample rate: [44.1kHz / 48kHz]
- Bit depth: [16-bit / 24-bit]
- Format: [MP3 / WAV / FLAC]

**Reference Tracks:**
Links or descriptions of similar audio you want`,
    snippet: "Structured audio generation prompt template...",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "t3",
    name: "Code Review",
    content: `**Code Review Checklist**

**Scope:**
What changes are being reviewed

**Key Areas to Focus:**
- Logic correctness
- Performance implications
- Security considerations
- Test coverage

**Questions:**
- Any specific concerns?
- Performance impact?
- Breaking changes?

**Testing:**
- Unit tests added/updated?
- Manual testing completed?`,
    snippet: "Comprehensive code review checklist and questions...",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "t4",
    name: "Meeting Notes",
    content: `**Meeting Notes - [Meeting Title]**

**Date:** [Date]
**Attendees:** [List attendees]

**Agenda:**
1. Topic 1
2. Topic 2
3. Topic 3

**Key Decisions:**
- Decision 1
- Decision 2

**Action Items:**
- [ ] Task 1 - @person - Due: [date]
- [ ] Task 2 - @person - Due: [date]

**Next Steps:**
What happens next

**Notes:**
Additional context and discussion points`,
    snippet:
      "Meeting notes template with agenda, decisions, and action items...",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const INITIAL_FOLDERS: Folder[] = [
  { id: "f1", name: "Video Projects" },
  { id: "f2", name: "Audio Projects" },
  { id: "f3", name: "Educational Content" },
];
