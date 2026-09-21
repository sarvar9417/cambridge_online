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

## Canonical Hodder source map

The connected Hodder coursebook contents define the canonical chapter order and printed-page boundaries used for presentation audits.

| Chapter | Level | Hodder title | Printed source range | Major sections |
| ---: | --- | --- | --- | --- |
| 1 | AS | Information representation and multimedia | pp.1–26 | 1.1 Data representation · 1.2 Multimedia · 1.3 File compression |
| 2 | AS | Communication | pp.27–67 | 2.1 Networking · 2.2 The internet |
| 3 | AS | Hardware | pp.68–106 | 3.1 Computers and their components · 3.2 Logic gates and logic circuits |
| 4 | AS | Processor fundamentals | pp.107–135 | 4.1 CPU architecture · 4.2 Assembly language · 4.3 Bit manipulation |
| 5 | AS | System software | pp.136–158 | 5.1 Operating systems · 5.2 Language translators |
| 6 | AS | Security, privacy and data integrity | pp.159–177 | 6.1 Data security · 6.2 Data integrity |
| 7 | AS | Ethics and ownership | pp.178–195 | 7.1 Legal/moral/ethical/cultural implications · 7.2 Copyright · 7.3 AI |
| 8 | AS | Databases | pp.196–216 | 8.1 Database concepts · 8.2 DBMS · 8.3 DDL/DML |
| 9 | AS | Algorithm design and problem solving | pp.217–237 | 9.1 Computational thinking skills · 9.2 Algorithms |
| 10 | AS | Data types and structures | pp.238–263 | 10.1 Data types/records · 10.2 Arrays · 10.3 Files · 10.4 ADTs |
| 11 | AS | Programming | pp.264–282 | 11.1 Programming basics · 11.2 Constructs · 11.3 Structured programming |
| 12 | AS | Software development | pp.283–303 | 12.1 Program development lifecycle · 12.2 Program design · 12.3 Testing/maintenance |
| 13 | A Level | Data representation | pp.304–327 | 13.1 User-defined data types · 13.2 File organisation/access · 13.3 Floating point |
| 14 | A Level | Communication and internet technologies | pp.328–345 | 14.1 Protocols · 14.2 Circuit/packet switching |
| 15 | A Level | Hardware | pp.346–371 | 15.1 Processors/parallel processing · 15.2 Boolean algebra/logic circuits |
| 16 | A Level | System software and virtual machines | pp.372–409 | 16.1 OS purposes · 16.2 VMs · 16.3 Translation software |
| 17 | A Level | Security | pp.410–424 | 17.1 Encryption · 17.2 Quantum cryptography · 17.3 Protocols · 17.4 Signatures/certificates |
| 18 | A Level | Artificial intelligence (AI) | pp.425–449 | 18.1 Shortest path algorithms · 18.2 AI/ML/deep learning |
| 19 | A Level | Computational thinking and problem solving | pp.450–497 | 19.1 Algorithms · 19.2 Recursion |
| 20 | A Level | Further programming | pp.498–540 | 20.1 Programming paradigms · 20.2 File processing/exception handling |

Page-end values are derived from the next chapter's start page; Chapter 20 ends before the Glossary on p.541.

## Storage decision

| Artifact | Canonical location |
| --- | --- |
| Hodder/Cambridge original source documents | Google Drive / guarded source storage |
| Past papers and mark schemes | Existing source corpus + database |
| Editable full-quality real presentation deck (.pptx) | Google Drive presentation folder |
| Compressed real PPTX mirror | Repository `frontend/public/9618/presentations/<chapter>/` |
| Exported real slide images | Repository `frontend/public/9618/presentations/<chapter>/slides/` |
| Real-deck manifest and site integration | Repository |
| Runtime presentation for migrated chapters | Project-hosted real slide images |
| Legacy HTML/CSS/React presentation renderer | Repository fallback until each chapter is migrated |
| SVG/CSS diagrams and animations | Repository study/fallback assets |
| Question-to-learning-objective mapping | Existing backend/database model |
| Source page evidence | Lesson source metadata |

For chapters migrated to the real-deck system, the editable full-quality PPTX in Drive is the source of truth. The repository also stores a compressed image-based PPTX mirror plus exported slide images. The lesson Presentation tab renders the project-hosted slide images, so classroom delivery does not depend on Drive embedding. Chapter 3 is the first implementation.

The project mirror must preserve the approved slide appearance; it is a delivery/backup copy, not a redesigned presentation. Drive remains the editable full-quality source.

### Migrated real decks

| Chapter | Drive source | Project delivery | Status |
| --- | --- | --- | --- |
| 3 Hardware | `9618_Chapter_03_Hardware_Real_Deck.pptx` | 22 real slide images + project PPTX mirror | Active |
| 4 Processor Fundamentals | `9618_Chapter_04_Processor_Fundamentals_Real_Deck.pptx` | 29 real slide images + project PPTX mirror | Active |

Chapter 4 is grounded in Hodder printed pp.107–135. Its exam-focus screen is separately grounded in Cambridge 2026 Paper 11 Q3 and Paper 13 Q7 mark-scheme evidence; that exam layer is not presented as Hodder source content.

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
| 2 | ✓ | ✓ | **2.1: 4 lessons · 2.2: 4 lessons** | **Pilot implemented** | Source-backed framing, Chapter 2 custom visuals and regression tests are on the rollout branch. |
| 3 | ✓ | ✓ | **3.1: 4 lessons · 3.2: 3 lessons** | **Benchmark implementation** | Source-complete pp.68–106; custom storage/device/sensor/logic visuals plus benchmark classroom framing. |
| 4 | ✓ | ✓ | **4.1: 3 lessons · 4.2: 2 lessons · 4.3: 1 lesson** | **Rollout implementation** | Source-complete pp.107–135; processor/assembly/bit-manipulation visuals and classroom framing implemented. |
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

## Chapter 3 benchmark implementation

The web route keeps the source-complete Hodder pp.68–106 sequence and applies classroom framing without replacing source beats:

- **3.1 Computers and their components:** 4 lessons — memory/embedded systems; secondary storage; hardware I/O; sensors/control.
- **3.2 Logic gates and logic circuits:** 3 lessons — gates/truth tables; circuit construction/verification; simplification/NAND/multi-input gates.
- Hodder end-of-chapter Questions 1–6 remain a chapter review route rather than being silently absorbed into 3.2.
- The supplied 22-slide Chapter 3 deck is used as the visual benchmark, not as an image-only runtime dependency.
- A scoped 9618 presentation skin carries the benchmark's white canvas, navy frame, cyan hierarchy and pastel teaching-card language while preserving the shared presenter's responsive/scroll-safe behaviour.

## Chapter 4 rollout implementation

Chapter 4 is named `CHAPTER_4_CURRENT_DRAFT` in one legacy export, but its repository source note and final source-completeness tests lock the full Hodder pp.107–135 range. The presentation rollout therefore treats the source as complete while leaving the legacy symbol name unchanged.

Classroom framing:

- **4.1 CPU architecture:** 3 lessons — CPU/registers; buses/performance/ports; fetch-execute/interrupts.
- **4.2 Assembly language:** 2 lessons — assembly/assembler/instruction families; addressing modes/worked traces.
- **4.3 Bit manipulation:** 1 lesson — shifts, masks, monitoring/control flags.
- End-of-chapter Questions 1–5 remain chapter review material.

## Rollout order

1. Keep Chapters 2–4 as the reference implementation for source-backed classroom framing.
2. Use Chapter 14 authored storyboard patterns where they improve classroom pacing.
3. Audit the remaining AS Level chapters (1, 5–12) in course order.
4. Audit A Level chapters (13–20) in course order.
5. For every chapter: source coverage → presentation pacing → custom visuals → past-paper checkpoint validation → regression tests.
6. Run full `npm run verify` before merge.
7. Keep deployment/preview verification as a separate release gate.

## Non-negotiable quality rule

A chapter is not complete because it has attractive slides. It is complete only when **source fidelity + teaching clarity + exam alignment + runtime verification** all pass.
