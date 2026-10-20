# Workflow section

Show one task moving through KRAMA, instead of presenting three disconnected text columns. The example is “Write the case study”: captured in Inbox, reserved for 9:00–9:25 in Planner, then ready for a 25-minute Focus session.

Use the existing Inter family, light canvas #FAFAFA, white surface #FFFFFF, ink #141821, secondary #414B60, and Iris #3864C8. Dark mode inherits KRAMA's existing navy surfaces and accessible text. All quiet tints derive from the existing Iris token, mixed in sRGB.

    Inbox example       Planner example       Focus example
    Write it down       Make time for it      Give it your focus
    One sentence        One sentence          One sentence

The product examples carry the visual identity: an Inbox item, a scheduled block, and a timer. Keep these as illustrations rather than fake buttons. Use an ordered list for the sequence, short left-aligned titles, and natural copy. Remove the table dividers, numeric labels and repeated route footers. On narrow screens the sequence stacks in reading order. No new features, libraries or motion.

Review: generic feature cards would not explain the handoff. Reuse the same task and consistent 25-minute duration across the illustrations, with a quiet connector between stages on desktop. Preserve the recently reduced main workspace preview and the header alignment.

Validation: production build and frontend lint passed. Six production responsive and contrast checks passed across Chromium, Firefox and WebKit. Reviewed eight dedicated workflow screenshots at 320, 390, 768 and 1440px in both themes; no horizontal overflow. Illustrations have accessible descriptions and add no keyboard stops or motion.
