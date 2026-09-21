# Cambridge 9618 presentation system — approval-gated rollout

## Current decision

Only the approved Chapter 3 Hardware presentation is active in the real-deck runtime. Chapter 4, Chapter 5 and Chapter 6 real-deck attempts are removed from Drive/project delivery because they did not match the supplied Chapter 3 benchmark closely enough.

## Non-negotiable approval rule

For every future chapter:

1. Create the chapter presentation as a standalone PPTX first.
2. Use the Chapter 3 Hardware presentation as the visual benchmark.
3. Share the PPTX for review before any Drive/project integration.
4. Upload to Drive and add project slide assets only after explicit user approval.
5. Preserve high-resolution project delivery after approval: 2560×1440 WebP slide images plus a project PPTX mirror.

## Approved migrated real decks

| Chapter | Drive source | Project delivery | Status |
| --- | --- | --- | --- |
| 3 Hardware | `9618_Chapter_03_Hardware_Real_Deck.pptx` | 22 high-resolution real slide images + project PPTX mirror | Active / approved |

## Removed/unapproved real decks

| Chapter | Reason |
| --- | --- |
| 4 Processor Fundamentals | Removed. Must be recreated as a separate PPTX and approved before Drive/project upload. |
| 5 System Software | Removed. Must be recreated as a separate PPTX and approved before Drive/project upload. |
| 6 Security, privacy and data integrity | Removed/blocked from project. Must be recreated as a separate PPTX and approved before Drive/project upload. |

## Storage policy after approval

| Artifact | Location |
| --- | --- |
| Editable full-quality PPTX | Google Drive presentation folder |
| Project mirror PPTX | `frontend/public/9618/presentations/chapter-XX/` |
| Runtime slide images | `frontend/public/9618/presentations/chapter-XX/slides/` |
| Runtime presentation | Project-hosted high-resolution slide images |

## Large-display clarity standard

Approved real-deck runtime slide assets must be exported as **2560×1440 WebP** at high quality. Do not use 1024×576 JPG assets because they blur on projectors and large displays.

## Canonical Hodder source map

| Chapter | Level | Hodder title | Printed source range |
| ---: | --- | --- | --- |
| 1 | AS | Information representation and multimedia | pp.1–26 |
| 2 | AS | Communication | pp.27–67 |
| 3 | AS | Hardware | pp.68–106 |
| 4 | AS | Processor fundamentals | pp.107–135 |
| 5 | AS | System software | pp.136–158 |
| 6 | AS | Security, privacy and data integrity | pp.159–177 |
| 7 | AS | Ethics and ownership | pp.178–195 |
| 8 | AS | Databases | pp.196–216 |
| 9 | AS | Algorithm design and problem solving | pp.217–237 |
| 10 | AS | Data types and structures | pp.238–263 |
| 11 | AS | Programming | pp.264–282 |
| 12 | AS | Software development | pp.283–303 |
| 13 | A Level | Data representation | pp.304–327 |
| 14 | A Level | Communication and internet technologies | pp.328–345 |
| 15 | A Level | Hardware | pp.346–371 |
| 16 | A Level | System software and virtual machines | pp.372–409 |
| 17 | A Level | Security | pp.410–424 |
| 18 | A Level | Artificial intelligence | pp.425–449 |
| 19 | A Level | Computational thinking and problem solving | pp.450–497 |
| 20 | A Level | Further programming | pp.498–540 |
