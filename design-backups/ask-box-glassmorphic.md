# Backup: department "Ask" container, glassmorphic version

Saved on 19 Nov 2026 before trying a different look for the container that holds the Ask input box and the
"Suggest a new agent" button (Agent repository, Variation 2, department hub).

## To get this version back
In `src/components/RepositoryV2.tsx`, change

    <section className="rv-ask rv-ask--solid">

back to

    <section className="rv-ask">

That is the only change needed. The glass rules below are still in `src/styles.css` and were not edited.
(The experimental rules are in the block marked `Ask container: experiment` at the end of `src/styles.css`;
they can stay or be deleted.)

## The glass rules (as they were)

    .rv-ask{margin:24px 0 8px;padding:22px 24px;border-radius:20px;
      background:linear-gradient(135deg,rgba(255,255,255,.11),rgba(255,255,255,.04));
      border:1px solid rgba(255,255,255,.14)}
    .rv-ask{margin-top:12px}
    .rv-ask{margin-bottom:40px}

The prompt box inside it keeps the new-chat composer look (frosted pill with the animated gradient border).
That part was not changed.

---

## Also saved: the version with the container and the title (before it was removed)

On 19 Nov 2026 the container and the "Ask HR" title were removed, leaving just the prompt box and the
Suggest button. To bring the container and title back, in `src/components/RepositoryV2.tsx` (inside the
department hub) replace the `<div className="rv-askrow rv-askrow--bare">...</div>` block with:

    <section className="rv-ask">   {/* add rv-ask--solid for the flat look */}
      <div className="rv-ask-h">
        <div>
          <h2><Icon n="msg" size={18} />Ask {deptShort(hub)}</h2>
        </div>
      </div>
      <div className="rv-askrow">
        <AskBox value={ask} onChange={setAsk} onSend={() => onAsk(ask.trim())} placeholder={'Ask ' + deptShort(hub) + ' anything. The right agent will answer.'} />
        <button className="rv-sug" onClick={() => onToast('Thanks, your suggestion has been sent to the ' + hub + ' team.')}><Icon n="plus2" size={14} />Suggest a new agent</button>
      </div>
    </section>
