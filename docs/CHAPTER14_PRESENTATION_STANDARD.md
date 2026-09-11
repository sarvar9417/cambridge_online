# Chapter 14 Presentation Standard

This document is the presentation contract for Lesson Studio. Chapter 14 is the reference implementation and must not be rewritten by the non-Chapter-14 rebuild.

## Evidence studied

The standard is derived from the complete Chapter 14 coursebook route (Communication and internet technologies, pp. 328–345), the hand-authored Chapter 14 storyboard, the Chapter 14 runtime/reveal model, and the Chapter 14 projector CSS/renderers.

The book itself moves from prior knowledge and key terms into the need for protocols; the TCP/IP stack; application, transport, internet and link-layer behaviour; HTTP/FTP/email/TCP/Ethernet/wireless/BitTorrent; then circuit and packet switching, route behaviour, packet control, packet headers, routing tables, worked examples, activity and end-of-chapter questions. The presentation preserves that conceptual dependency rather than flattening the chapter into page summaries.

## Non-negotiable rules

1. **Source first, never source-lite.** Every teaching claim must be supported by the approved chapter source. Definitions, process steps, comparison rows, values, bit lengths, worked examples, activities, figures and important second-level details must survive the presentation rebuild when they are instructionally relevant.
2. **One semantic teaching purpose per scene.** A scene is a hook, objective, concept, process, visual model, comparison, challenge, exam check or retrieval scene. Do not create a projector page merely because a source atom exists.
3. **Preserve the chapter's conceptual order.** Build prerequisite understanding before dependent ideas. A visual or worked example appears at the point where the book uses it to deepen the concept, not in a detached appendix.
4. **Use a deliberate lesson arc.** A topic normally begins with a short retrieval/hook and clear objectives, develops concepts through explanation + visual/process/comparison scenes, includes application/checking, and ends with retrieval or Cambridge-style transfer.
5. **Project the real content.** Important tables, comparisons, sequences, formulae, packet/bit fields, code, examples and diagrams must be visible on-screen. Do not replace them with a decorative icon or a thin summary.
6. **Split complex source material deliberately.** When the source has a large process/table/figure, teach the core model first and move secondary source detail to a following scene. This is the Chapter 14 pattern used for Ethernet frame anatomy/detail, packet-header core/extended fields, and routing decision/table fields.
7. **Reveal is emphasis, not absence.** The complete explanatory structure is present from first paint. Future items remain readable in a subdued state; Space/Arrow reveal progressively emphasises them. This lets students keep the whole model while the teacher controls attention.
8. **Answers stay genuinely hidden.** Worked-example final answers, model answers and activity reveals are not shown as dimmed future content. They appear only after the corresponding reveal step.
9. **Figures must teach relationships.** Use sequences for journeys/processes, bitfields for packet/frame/data structures, comparisons for contrasts, tables for exact multi-attribute source data, and dedicated diagrams when topology/routing/structure is itself the concept.
10. **No teacher/audit/source-internal chrome on the projector.** Teacher notes, audit labels, implementation IDs and source-completeness machinery remain internal. Learners see subject-facing labels such as STARTER, NEW CONCEPT, STEP BY STEP, VISUAL MODEL, COMPARE, CAMBRIDGE CHECK and RETRIEVAL.
11. **Projector readability is a hard requirement.** Use a strong title hierarchy, bounded line length, large text, compact but readable tables, and layouts that work at common classroom heights. Dense content is acceptable when it is structured; tiny appendix text is not.
12. **Chapter-specific visuals are semantic, not decorative.** A special renderer is justified only when it makes the exact source relationship easier to understand. Generic decorative cards are not a substitute for source content.
13. **Examples preserve the reasoning chain.** Keep the source's values, operations and sequence. Reveal steps in order; only the final answer is gated.
14. **Activities preserve productive struggle.** The task/prompt is visible before the answer. Retrieval and exam-transfer scenes should require explanation, comparison, tracing or calculation rather than passive reading.
15. **Overview mode is a coherent whole-chapter deck.** It must concatenate the chapter's topic storyboards in coursebook order without turning the deck into one page per source atom.
16. **Source completeness and presentation curation are separate concerns.** Study mode may expose audit/source evidence. Presentation mode must curate that evidence into teachable scenes while retaining the actual examinable/detail-bearing content.
17. **Do not invent missing source.** If an exact approved chapter source is unresolved, the presentation stays inactive rather than being filled from another syllabus/book or general knowledge.

## Scene grammar

- **Hook:** one question/problem that activates prerequisite knowledge.
- **Objective:** usually 2–4 learner-facing outcomes.
- **Concept:** definition + explanation + a small number of tightly related ideas.
- **Process:** ordered steps or a visual sequence; reveal in teaching order.
- **Visual:** a source-grounded model/diagram/bitfield/table where the visual is the explanation.
- **Compare:** two or more source-grounded alternatives/features side by side.
- **Challenge:** predict, trace, calculate or explain before reveal.
- **Exam:** Cambridge-style transfer/check; model response is gated.
- **Recap:** retrieval prompts that reconstruct the topic/chapter from memory.

## Rebuild rule for Chapters 1, 2, 3, 4, 7 and 13

The previous non-Chapter-14 presentation curation/visual routing is not the basis of the new decks. Each active chapter is rebuilt from its approved source content into the scene grammar above. Existing Study mode/source registries remain source evidence; presentation-specific scene selection, grouping, reveal behaviour and visual treatment are rebuilt against this contract.

Chapter 14 remains the benchmark and must continue to use its dedicated hand-authored storyboard/runtime.
