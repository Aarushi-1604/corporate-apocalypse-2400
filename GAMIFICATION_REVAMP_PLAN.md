# Corporate Apocalypse 2400 — Gamification Revamp Plan

## Story & Learning Philosophy
Each interaction is structured like an immersive, story-based corporate simulator:
- **Narrative Beat / Briefing**: Character dialogue and real-world business concept introduction.
- **Interactive Mission / Mini-Game**: Hands-on tactical decision surface with real-time feedback and visual stakes.
- **De-brief / Engine Impact**: Clear recap of consequences applied to company stats via the simulation engine.

---

## 1. Architecture Proposal

### A. Frontend Architecture (`apps/web`)
- **Shared Mini-Game Core Framework (`apps/web/components/minigames/framework`)**:
  - `MiniGameShell.tsx`: Implements the 3-phase flow (Briefing Dialogue -> Mission Game -> De-brief).
  - Web Audio sound effect triggers (subtle mechanical UI clicks, alert klaxons, success chimes).
  - Common HUD components (Timer, Stakes Meter, Morale/Confidence Gauges).
- **HQ World Map (`HQHub.tsx`)**:
  - An interactive command view representing the CEO's Cyber-Corporate Suite.
  - Interactive hotspots for Executive Office, Operations Floor, HR Dept, Deal Room, and Board Room.
  - Dynamic status indicators, alert pulses for Breaking News and HR grievances.

### B. Backend Architecture (`apps/api`)
- **Decision Consequence Memory (`company_decision_memories` table via Alembic)**:
  - Stores key decision tags, severity, and payload per quarter.
- **Endpoints**:
  - `GET /api/v1/company/decisions/history`: Fetches past decision tags for dynamic narrative dialogue framing and crisis weighting.
  - `POST /api/v1/company/decisions/record`: Persists new decision memories.

---

## 2. Per-Decision-Surface Mini-Game Concepts

1. **Operations**: *Resource Allocation Grid* (diminishing returns, budget balancing visual reactor).
2. **Breaking News / Crisis**: *Command Center Crisis Triage* (urgent countdown, rapid decision tree with stakes).
3. **Employee HR**: *Executive Office HR Dossier* (dialogue messenger, employee morale & budget trade-offs).
4. **Client Negotiation**: *Dealmaker Trade-Off Matrix* (price vs trust dynamic dial with concession chips).
5. **Board Room**: *Hot Seat Executive Pitch* (6 scripted board members with live confidence gauges and callback dialogue to past choices).

---

## 3. Phased Phased Roadmap (Oct 6 – Oct 13)

- **Phase 1 (Oct 6)**: Game Framework (`MiniGameShell`), Narrative Dialogue overlay system, Web Audio manager, and Interactive HQ Command Center view.
- **Phase 2 (Oct 7)**: Operations Mini-Game (Resource Allocation Grid).
- **Phase 3 (Oct 8)**: Breaking News Crisis Triage & HR Dossier Messenger.
- **Phase 4 (Oct 9)**: Client Negotiation Dealmaker & Board Room Hot Seat.
- **Phase 5 (Oct 10)**: Backend Progression Memory Engine & Event Weighting.
- **Phase 6 (Oct 11)**: Certificate Generation & Visual Polish.
- **Phase 7 (Oct 12)**: End-to-End Balancing & Edge Case Testing.
- **Phase 8 (Oct 13)**: Codebase Freeze & Deployment Readiness.
