# Game System Concept — Roles, Flow & General Website Concepts

This document defines the **ready functionality** of the entire game system: roles, how they interact, and the general concepts of the website. Supply chain planning is used as the example throughout; examples are kept short.

---

## 1. Roles and Responsibility

### Instructor (Scenario Builder)

- **Role:** Creates and configures **scenarios** that students will play.
- **Responsibilities:** Chooses a **template** (e.g. Supply chain planning), sets **product**, scenario title, context, objectives, and metrics. Exports or shares the scenario (e.g. copy/export JSON or class link) so students can load it.
- **Transmission:** Instructor output = a **Scenario** (or a **Class** that contains a scenario). Students consume this; they do not edit it during play.

### Student (Player)

- **Role:** Loads a scenario (or joins a class) and **plays** the game.
- **Responsibilities:** Each round: **Observe** (demand, inventories, pipeline), **Decide** (order quantity, production plan, split), **Execute** (trigger round and see animation), **Reflect** (cause–effect, costs). All calculations use only scenario inputs + student decisions + deterministic seed (reproducible).
- **Transmission:** Student input = decisions per round. Student output = round history, costs, and analytics for reflection.

**Role separation:** Instructor defines *what* is being simulated; student decides *how* to act within that setup. No overlap: students cannot change scenario parameters; instructors do not make in-round decisions.

---

## 2. Core Concepts (Website-Wide)

### Template

- A **reusable game type** offered by the system (e.g. Supply chain planning). Defines the structure of the game (nodes, parameters, default scenario). Instructors create classes **from** a template; the template name and product choice are examples of template-level options.

### Scenario

- The **single source of truth** for one playable game: identity (id, title, rounds, seed), supply chain structure, planning parameters (e.g. lead times), demand model, capacities, costs, initial state, and policy helpers. One scenario = one deterministic, reproducible game instance. Example: a Supply chain planning scenario with 5 rounds, lead time 2, base demand 100.

### Class

- An **instructor-created container** that ties a scenario (and optional narrative: context, objectives, metrics) to a named group (e.g. “IE 431 – Section 1”). Students select a class to load that scenario and play. Product choice in the create-class flow is an example of class/scenario configuration.

### Game phases (fixed sequence)

- **Observe** — Student sees chain state, reported demand, pipeline; can open Analytics or Reflection.
- **Decisions** — Student sets order quantity, production plan, split (with tooltips and, e.g. in Supply chain planning, a base-stock recommendation).
- **Execute** — Student commits; system runs one round (e.g. demand, pipeline advance, production, distribution, DC fulfillment, costs) and shows a **one-shot segment-by-segment transfer animation**; no continuous movement when idle.
- **Reflection** — System shows cause–effect (e.g. “Order placed 2 rounds ago arrived now”), true vs reported demand, unmet demand, cost breakdown (holding, stockout, ordering).

Flow: **Observe → Decisions → Execute → Reflection → Observe** (repeat until last round or reset).

### Round

- One cycle of the four phases. A round index (e.g. 1 of 5) and a deterministic **seed** ensure the same scenario + same decisions yield the same results (reproducibility).

### State and decisions

- **State:** Inventories at each node, order pipeline, cumulative cost, and demand history. Updated only at the end of Execute.
- **Decisions:** Per-round inputs (e.g. order quantity, production plan, split). Locked in when the student executes; order quantity, for example, enters the pipeline and arrives after the scenario’s lead time (e.g. 2 rounds in Supply chain planning).

---

## 3. Role Transitions and Data Flow

### Instructor → Student

1. Instructor picks a **template** (e.g. Supply chain planning), optionally chooses **product**, fills scenario title and narrative, and creates a **class**.
2. Class (with embedded scenario) is stored or exported (e.g. JSON / share link).
3. Student **loads** the class (or pastes/imports scenario). The scenario becomes the only authority for structure, parameters, and RNG seed.

### Student play loop

1. **Load scenario** → initial state and round 1.
2. **Observe** → see reported demand, inventories (e.g. rounded or ranges), pipeline arrivals.
3. **Decide** → set order quantity (e.g. from dropdown + optional custom), production plan, split; see recommendation if the template supports it (e.g. base-stock in Supply chain planning).
4. **Execute** → run one round (simulateNextRound with scenario + current state + decisions), play transfer animation, then show Reflection.
5. **Reflect** → read cause–effect and costs; continue to next Observe.
6. Repeat until last round; then view full analytics or reset.

### Determinism

- All outcomes come from **scenario + student decisions + seed**. Same scenario, same decisions, same seed → same round results and same final state. No hidden randomness for the student.

---

## 4. UI Concepts (General)

### Header / top bar

- Shows **round** (e.g. “Round 2”), **scenario or class name** (e.g. “Supply chain planning”), **objective**, **cost**, and navigation (Orders/Decisions, Analytics, Reflection, Reset). Template name is reflected here (e.g. Supply chain planning, not “Bullwhip effect”).

### Decisions panel

- No vertical scroll; **compact layout** and **dropdowns** (e.g. order quantity as dropdown with preset units + “Custom”). Shows pipeline (“Orders in transit”), reported demand, round progress, and optional **directed ordering** (forecast, lead-time demand, safety stock, S, recommended order). Tooltips explain lead time and inputs briefly (e.g. “Order arrives at Factory after L rounds”).

### Supply chain view

- Fixed **nodes** (e.g. Supplier → Factory → WH_A → WH_B → DC → Customer). Boxes move **only during Execute**, one segment at a time, then stop. No idle animation.

### Analytics and Reflection

- **Analytics:** Historical view of rounds (inventories, demand, costs, service level). **Reflection:** Post-round cause–effect and cost breakdown, using the same scenario and round results (e.g. “Order placed 2 rounds ago X arrived”; “True demand D, you saw ~R, unmet U”; holding vs stockout vs ordering).

---

## 5. Summary Table

| Concept        | Definition (general) | Example (short) |
|----------------|----------------------|------------------|
| Template       | Reusable game type   | Supply chain planning |
| Scenario       | Single playable config + seed | 5 rounds, lead time 2, base demand 100 |
| Class          | Instructor bundle (scenario + narrative) | “IE 431 – Section 1” with product “Widget A” |
| Instructor     | Builds and shares scenario/class | Chooses template, product, title, creates class |
| Student        | Loads scenario, plays rounds   | Observe → Decide → Execute → Reflect |
| Game phases    | Fixed 4-phase loop   | Observe, Decisions, Execute, Reflection |
| Decisions      | Per-round inputs     | Order qty, production plan, split to WH_A |
| Execute        | One round + animation | simulateNextRound; boxes move segment-by-segment once |
| Determinism    | Reproducible from scenario + decisions + seed | Same inputs → same results |
| Directed ordering | Optional policy suggestion in Decisions | Forecast, S, recommended order (e.g. base-stock) |

---

This describes the **ready functionality** of the game system: clear roles (Instructor vs Student), transmission of scenario from Instructor to Student, fixed game phases, and general concepts with Supply chain planning as the defining example without detailed mechanics.
