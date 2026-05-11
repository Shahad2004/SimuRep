# Supply Chain Game — How It Works (Flow & Boxes)

This document explains **exactly** how the game runs, when boxes move, and what is “real” vs visual atmosphere.

---

## 1. High-level game flow

The game runs in **rounds** (e.g. Round 1 of 5). Each round has this sequence:

1. **Observe** — You see the chain (Supplier → Factory → WH A → WH B → DC → Customer), current inventories, and (noisy) demand. You can open **Analytics** or **Reflection** (after round 1).
2. **Decisions** — You set **Order quantity**, **Production rate**, and **Warehouse A %** (B = 100 − A). These choices are **locked in for 2 turns** (lead time). You see “Orders in transit” (arrives next round / in 2 rounds) and “Reported demand ~X”.
3. **Execute** — You click **Next Turn**. The game shows a **one-time transfer animation**: a batch of 📦 moves **one segment at a time** (Supplier→Factory, then Factory→WH A, then WH A→WH B, then WH B→DC, then DC→Customer) over 5 × 900 ms. Then the new round is applied.
4. **Reflection** — After the transfer animation, the **Reflection** panel opens. You see what happened (e.g. cause–effect: “Two rounds ago you ordered X; that just arrived…”), actual demand vs what you saw, and prompts to reflect. You click **Continue** to go back to **Observe** for the next round.

So: **Observe → Decisions → Execute (transfer animation) → Reflection → Observe** (repeat until round 5 or reset).

---

## 2. When do boxes move? (Two different behaviors)

### A. During Execute (decision-driven transfer)

- **When:** Only when you click **Next Turn** and the game is in **Executing** state.
- **What:** One **batch** of 5 📦 emojis moves **left to right** on **one segment at a time**:
  - **Phase 0 (0–900 ms):** Boxes move on **Supplier → Factory** (your order flowing in).
  - **Phase 1 (900–1800 ms):** Boxes move on **Factory → WH A**.
  - **Phase 2 (1800–2700 ms):** Boxes move on **WH A → WH B**.
  - **Phase 3 (2700–3600 ms):** Boxes move on **WH B → DC**.
  - **Phase 4 (3600–4500 ms):** Boxes move on **DC → Customer**.
- **Meaning:** This represents **one turn of material flow** triggered by your decision. After the 5th phase, the round result is applied (inventories, demand, costs, stockouts) and the **Reflection** panel is shown.

So the **only** time boxes represent “your decision making stuff move” is this 4.5 s sequence.

### B. When idle (Observe / Decisions / Reflection)

- **When:** Whenever the game is **not** in **Executing** (i.e. in Observe, Decisions, or Reflection).
- **What:** **No boxes move.** The lanes stay static (with their colored glow: green / amber / red). Boxes appear **only** during the Execute phase after you click Next Turn.
- **Meaning:** Movement is tied directly to your decision. You take a decision → you click Next Turn → boxes transfer segment by segment → then the round updates and Reflection appears.

**Summary:**

- **Decision-driven only:** Boxes move in a **one-shot, segment-by-segment** wave **only during Execute** (after you click Next Turn). There is no idle looping.

---

## 3. What the player controls vs what is automatic

| You control | Automated / hidden |
|------------|---------------------|
| **Order quantity** (0–200) — how much you ask from the supplier | **Lead time 2:** that order arrives at the factory **2 rounds later**. You see “Orders in transit: X next round, Y in 2 rounds.” |
| **Production rate** (0–150) — factory output | **True demand** is random (base + noise + amplification). You only see **noisy “Reported demand ~X.”** |
| **Warehouse A %** (0–100); B = 100 − A | **Exact** inventory numbers at Supplier, WH A, WH B, DC are **hidden** from you (you see **approximate ~values**). Only **Factory** and **Customer** (demand) are exact. |
| When to click **Next Turn** (Execute) | How much actually reaches the customer (effective supply, stockouts, service level) and how costs and inventories update. |

So: you decide **order**, **production**, and **split**; the game decides **when** orders arrive, **what** demand really is, and **how** that turns into inventory and costs.

---

## 4. Why it feels like “boxes are always transferring”

- In **Observe** (and other non-Execute states), **all five lanes** show **looping** 📦. So at any moment you see movement on every link. That is by design for a “living” chain, but it is **not** one discrete “transfer” from your last decision.
- The **only** transfer that is tied to your action is the **Execute** animation: one batch, segment by segment, then reflection.

If you want the game to feel **more** like “boxes move only when I do something,” options would be:

- **Option A:** In Observe/Decisions/Reflection, **don’t** show looping boxes (or show very few/slow), and rely on the **Execute** phase for clear “my decision → boxes move” feedback.
- **Option B:** Keep looping for atmosphere but make it **weaker** (e.g. fewer boxes, slower, or only on segments with “enough” flow), so the **Execute** phase is clearly the main “transfer” moment.

---

## 5. Flow of data (what actually changes each round)

When **Execute** finishes (after the 5-phase box animation):

1. **Order pipeline:** What was “arrives next round” becomes **arrived** and is used as `pipelineArrival` for the factory. Your **new** order (from the decision you just made) enters the pipeline as “in 2 rounds.”
2. **Demand:** True demand = base demand + noise + a small **amplification** from how much you changed your order. You only ever see **noisy displayed demand**.
3. **Inventories and costs:** `calculateNextRound()` updates supplier, factory, warehouses, DC, stockouts, service level, ordering/holding/stockout cost, and total cost.
4. **Reflection:** You see cause–effect (e.g. “Two rounds ago you ordered X… That just arrived…”), actual demand vs displayed, and prompts to reflect. Then **Continue** → back to Observe for the next round.

---

## 6. Short summary for “how the game is working”

- **Rounds:** Observe → Decisions → Execute (one-shot box transfer per segment) → Reflection → Observe.
- **Boxes “from your action”:** Only during **Execute**: one batch of 📦 moves segment 0 → 1 → 2 → 3 → 4, then the round updates and Reflection opens.
- **Boxes “always” moving:** In other states, boxes on every lane **loop** forever; number and speed come from game data but the motion is **continuous**, not one event.
- **Your levers:** Order (locked 2 turns), production, warehouse split. You see partial/noisy info; the system has lead time, amplification, and hidden true demand so the bullwhip effect is felt rather than calculated.

