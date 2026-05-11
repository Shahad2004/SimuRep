# System Assessment — SIMU-LAB

Assessment of the system in terms of components, functionalities, and interfaces (report use).

---

## 1. System Components

| Component | Description |
|-----------|-------------|
| **Roles** | Two roles: **Instructor** and **Student**. Selected via header toggle. |
| **Templates** | Two lab types: Strategy Planning (supply chain rounds) and Production Planning (EOQ, 12 periods). Instructor picks one when adding a lab to a class. |
| **Data model** | **InstructorClass** (id, name, labs[]). **Lab** (id, templateId, scenario, pin, optional productionPlanning, feedbackFromInstructor). **StudentJoinedEntry** (classId, labId, className, labTitle, templateId, joinedAt, feedback). |
| **Persistence** | Browser localStorage only: instructor classes (`simulab_instructor_classes_v2`), student joined labs (`simulab_student_joined_v1`). No server or database. |
| **Application shell** | Single React app: header (SIMU-LAB, Student/Instructor), then role-specific content. Student view switches between dashboard (StudentHome) and game (StudentDashboard or ProductionPlanningGame) based on selected lab. |

---

## 2. Functionalities

**Instructor**
- Create classes (name only).
- Inside a class: add labs via template dropdown (Strategy Planning or Production Planning); configure scenario (title, product, context, objectives, metrics); for Production Planning set H, D, S, demand pattern.
- Each lab gets a 6-digit PIN. Students join by entering the PIN.
- Optional feedback text per lab; students see it on their dashboard.

**Student**
- Join a lab by entering the 6-digit PIN (or via URL `?join=PIN`).
- Dashboard: list of joined labs; play a lab or view instructor feedback; leave and return to dashboard.
- **Strategy Planning game:** Observe → Decisions (order quantity, production, warehouse split) → Execute → Reflection; rounds with supply chain visualization, analytics, reflection prompts.
- **Production Planning game:** Same flow per period (12 periods): set order quantity Q, run period, view cost and reflection; analytics shows cost by period.

**Join and routing**
- Join by PIN: lookup lab in instructor data, add to student joined list, open that lab.
- App routes to StudentDashboard (Strategy Planning) or ProductionPlanningGame (Production Planning) based on lab `templateId`.

---

## 3. Interfaces

| Interface | Purpose |
|-----------|---------|
| **Header** | Site title (SIMU-LAB), tagline, Student/Instructor toggle. |
| **Instructor view** | Add class (name). Class list (left); selected class detail (right): lab list with PIN and feedback field per lab, “Add template” (dropdown + template-specific form). |
| **Student dashboard (StudentHome)** | Join with PIN input; “My labs” list (Play, View feedback); Leave from game returns here. |
| **Strategy Planning game** | Top bar: round, scenario, cost, Orders / Analytics / Reflection / Reset / Leave. Main: supply chain visualization. Bottom: Orders panel, Run turn. Slide-out panels: Decisions, Analytics, Reflection. |
| **Production Planning game** | Same structure: period, scenario, cumulative cost, Orders / Analytics / Reflection / Reset / Leave. Main: H/D/S parameters, production flow (order → demand → cost). Decisions: Q input, run period. Reflection: period summary and prompts. |
| **Join** | PIN entry (dashboard) or URL `?join=PIN`; no QR in current build. |

---

## Summary

The system is a **client-side only** simulation platform: instructors define classes and labs (from two templates) and share a PIN; students join by PIN, play the corresponding game (Strategy or Production Planning), and see feedback. All state is in localStorage. Interfaces are role-based (instructor vs student) and game-based (dashboard vs Strategy game vs Production Planning game).
