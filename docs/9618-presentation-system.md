# Cambridge 9618 presentation system — source-backed rollout

Status: active implementation branch `feature/hodder-presentation-system-20260921`

## Goal

Every Cambridge 9618 lesson must expose three aligned surfaces:

1. **Study** — source-backed electronic lesson content.
2. **Presentation** — classroom/projector presentation using the same Hodder-backed lesson model.
3. **Past Papers** — approved Cambridge question leaves and mark-scheme evidence mapped to the current syllabus target.

The visual quality benchmark is the supplied Chapter 3 Hardware presentation. The web implementation remains HTML/CSS/React so presentation content is searchable, responsive, source-traceable and deploys with the application.

## Authoritative sources

- Hodder Education 9618 coursebook in the project Google Drive source folder.
- Current Cambridge 9618 syllabus/learning-objective mapping already represented by the lesson checkpoint layer.
- Approved Cambridge 9618 question/source corpus and mark-scheme evidence in the application database/source pipeline.
- Repository source-fidelity and presentation tests.

Do not silently replace a Hodder detail with general knowledge. If source wording and modern terminology differ, preserve the source-backed teaching point and add an explicit accuracy note rather than rewriting the source history.

## Storage decision

| Artifact | Canonical location |
| --- | --- |
| Hodder/Cambridge original source documents | Google Drive / guarded source storage |
| Past papers and mark schemes | Existing source corpus + database |
| Presentation structure and content model | Repository |
| HTML/CSS/React presentation renderer | Repository |
| SVG/CSS diagrams and animations | Repository |
| Question-to-learning-objective mapping | Existing backend/database model |
| Source page evidence | Lesson source metadata |

Runtime presentations must not depend on a public Drive iframe.

## Presentation acceptance contract

A chapter is **benchmark-complete** only when all of the following are true:

- Hodder syllabus-relevant sections are represented in the Study route.
- The presentation route covers the same teaching sequence without dropping source-critical concepts.
- Classroom scenes are divided into meaningful lessons rather than one unbounded chapter scroll.
- Definitions, comparisons, processes and worked examples use purpose-built visuals where a visual improves teaching.
- The deck remains usable at 16:9 projector size and on a normal laptop viewport.
- Presentation wording is learner-facing; source-audit terminology stays outside the projector surface.
- Current Cambridge checkpoints query the approved past-paper corpus through learning-objective mappings.
- Past-paper questions remain linked to mark-scheme evidence; presentation code does not duplicate a second uncontrolled question bank.
- Chapter-specific tests protect important source details and the course-wide `npm run verify` gate passes.
- Source fidelity is checked against the Hodder source, not inferred from slide appearance.

## Current implementation matrix

Legend:

- **Route** — source-backed chapter is present in the lesson catalog.
- **Visual** — at least one dedicated presentation visual route is wired into the shared projector facade.
- **Benchmark audit** — chapter has been reviewed against the Chapter 3 presentation standard in this rollout.
- **Lesson framing** — long source sequences are divided into classroom-sized presentation lessons.

| Chapter | Route | Visual | Lesson framing | Benchmark audit | Rollout note |
| ---: | :---: | :---: | :---: | :---: | --- |
| 1 | ✓ | ✓ | Pending audit | Pending | Source-backed presentation route exists. |
| 2 | ✓ | ✓ | **2.1: 4 lessons · 2.2: 4 lessons** | **Pilot in progress** | Hodder pp.27–64; custom networking/internet/addressing/DNS/device visuals already exist. |
| 3 | ✓ | ✓ | Existing | **Visual benchmark** | User-supplied Hardware deck defines the target clarity/design standard. |
| 4 | ✓ | ✓ | Pending audit | Pending | Dedicated processor/instruction/assembly visuals exist. |
| 5 | ✓ | ✓ | Pending audit | Pending | Dedicated system-software/OS visuals exist. |
| 6 | ✓ | ✓ | Pending audit | Pending | Dedicated security visuals exist. |
| 7 | ✓ | ✓ | Pending audit | Pending | 9618 Ethics and ownership route is separate from legacy 0478 Chapter 7. |
| 8 | ✓ | ✓ | Pending audit | Pending | Dedicated database visuals exist. |
| 9 | ✓ | ✓ | Pending audit | Pending | Dedicated algorithm visuals exist. |
| 10 | ✓ | ✓ | Pending audit | Pending | Dedicated data-structure visuals exist. |
| 11 | ✓ | ✓ | Pending audit | Pending | Dedicated programming visuals exist. |
| 12 | ✓ | ✓ | Pending audit | Pending | Dedicated software-development visuals exist. |
| 13 | ✓ | ✓ | Existing specialist route | Pending | Source-backed Chapter 13 presentation system exists. |
| 14 | ✓ | ✓ | Existing storyboard | Mature reference | Chapter 14 has the strongest authored storyboard/runtime presentation layer. |
| 15 | ✓ | ✓ | Pending audit | Pending | Dedicated hardware visuals exist. |
| 16 | ✓ | ✓ | Pending audit | Pending | Dedicated system-software visuals exist. |
| 17 | ✓ | ✓ | Pending audit | Pending | Dedicated security visuals exist. |
| 18 | ✓ | ✓ | Pending audit | Pending | Dedicated AI visuals exist. |
| 19 | ✓ | ✓ | Pending audit | Pending | Dedicated algorithm visuals exist. |
| 20 | ✓ | ✓ | Pending audit | Pending | Dedicated further-programming visuals exist. |

A check mark under **Visual** is not a claim that the whole chapter already meets the benchmark. It only confirms that the shared presentation facade has a chapter-specific visual route. Benchmark status requires a chapter-by-chapter source and classroom audit.

## Chapter 2 pilot

### 2.1 Networking

Existing four-lesson frame:

1. Why build a network?
2. Cloud, wired and wireless choices.
3. Network devices and packet path.
4. Ethernet, collision handling and bit streaming.

### 2.2 The internet

This rollout adds a four-lesson frame grounded in Hodder pp.54–64:

1. Internet, World Wide Web, hardware path, PSTN/VoIP and satellites.
2. IPv4, address classes, CIDR, IPv6 and zero compression.
3. Subnetting, AND masks, private/public IP addresses and NAT.
4. URLs, the five-step DNS process, HTML, client-side JavaScript and server-side PHP.

The framing does not replace source-backed beats. It inserts lesson cover, objectives, starter and retrieval recap screens around the existing Hodder sequence.

### Chapter 2 Cambridge practice

The current Chapter 2 checkpoint layer maps:

- 2.1 learning objectives to the approved 2021–2026 Cambridge corpus.
- 2.2 learning objectives to the approved 2021–2026 Cambridge corpus.

Hodder end-of-chapter practice remains separately identified from live Cambridge past-paper questions.

## Rollout order

1. Finish Chapter 2 pilot acceptance and CI.
2. Audit Chapter 3 web route against the supplied Chapter 3 visual benchmark; preserve the benchmark rather than recreating it blindly.
3. Use Chapter 14 authored storyboard patterns where they improve classroom pacing.
4. Audit AS Level chapters in course order.
5. Audit A Level chapters in course order.
6. For every chapter: source coverage → presentation pacing → custom visuals → past-paper checkpoint validation → regression tests.
7. Run full `npm run verify` before merge.
8. Keep deployment/preview verification as a separate release gate.

## Non-negotiable quality rule

A chapter is not complete because it has attractive slides. It is complete only when **source fidelity + teaching clarity + exam alignment + runtime verification** all pass.
