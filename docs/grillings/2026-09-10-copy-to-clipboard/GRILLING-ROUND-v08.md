# Grilling round v08 — copy to clipboard on the reflowed / cleaned pane

## Settled in v07

- **Q15 — Copy engine:** (a). `CopyButton` calls **`navigator.clipboard.writeText` itself**, inside a `try`/`catch`. **`useClipboard` is not used.** VueUse stays, and arrives with #76, for **`useTimeoutFn`**, which drives the 1500 ms "Copied" reset: a second copy restarts the full duration, and the timer stops when the button unmounts. No permission query, no `execCommand`. A rejection, including a missing `navigator.clipboard`, lands in the `catch`. Q5, Q7, Q9 and Q10 stand as written, and so does the v01 premise.
- **Q16 — ADR-0001:** (a). **Superseded, not edited.** Done in this round:
  - `docs/adr/0002-vueuse-as-browser-api-toolkit-corrected.md` restates the same decision on the corrected facts. Its _Context_ opens by saying the decision is unchanged and only the facts are. It carries `supersedes: ADR-0001`.
  - `docs/adr/0001-vueuse-as-browser-api-toolkit.md` gained only `status: superseded` and `superseded-by: ADR-0002`. Nothing else in it changed.
  - `CONTEXT.md`'s _Export_ line now points at ADR-0002, and says the button takes only VueUse's timer.

Recorded in ADR-0002 without being asked, so you can object:

- **The copy engine gets no ADR of its own.** It fails the "hard to reverse" test, since it lives in one component. It is stated instead as the first _Consequence_ of ADR-0002, because that is exactly the "what the library does not cover" that section exists for, and a reader finding VueUse next to a hand-written clipboard write needs the reason in the same record.
- **ADR-0002 adds a fourth consequence:** a composable's behaviour is read in the installed version's source, not in its docs, and the same check applies to `useDropZone` when the drop lands. That is the lesson of ADR-0001, stated where the next VueUse feature will look.

## Q17 - How do #76 and #77 land now?

#74 was split into #76 (the happy path) and #77 ("Copy failed"). That split made sense when the engine was `useClipboard`: #76 could ship a library that swallowed rejections, and #77 would add the failure state on top. Under Q15 (a), that is no longer true. `writeText` rejects, and the rejection has to go somewhere the moment #76 lands:

- **With no `catch`**, a refused copy becomes an unhandled promise rejection in the click handler: a console error, and the label stays "Copy".
- **With an empty `catch`**, the failure is silent. That is v01 Q3 option (d) ("Nothing at all. The paste will tell you."), rejected in Q5 because silence on rejection is "the only case where feedback actually matters".

#76 is uncommitted, so none of this has landed yet.

Options:

a. **Fold #77 into #76.** One change, one set of acceptance criteria, #77 closed as merged into #76. The failure path is the `catch` branch plus the tests #77 already lists.
b. **Keep both tickets, land them together.** #76 then #77 as two commits in the same delivery, each a vertical slice closing its own ticket, and nothing reaches `develop` between them. #76's commit carries a `catch` that #77's commit fills in.
c. **Keep both tickets, land #76 alone first**, with an empty `catch`. The failure is silent until #77 lands.

➡️ Recommendation: **(b)**. It keeps the tickets you wrote and the review history they carry, and each commit stays a slice you can read on its own: the happy path, then the failure state. It never lets `develop` hold the silent-failure state Q5 rejected. (a) is equally sound and slightly simpler, and loses only the split you chose deliberately when #74 became two tickets. (c) lands the silent failure on `develop`, where anything that builds from it (a Netlify deploy, a release branch) ships it.

Whichever you pick, both issue bodies need rewording, since each still states the `useClipboard` fact: #76's criterion "`useClipboard` with its default 1500 ms provides the success state", and #77's "`useClipboard` does not help here. Its `copy()` rejects without exposing any error state (ADR-0001)". The summary's paste-ready section will carry the replacement text for whichever shape you pick.

### Answer to Q17

(b)
