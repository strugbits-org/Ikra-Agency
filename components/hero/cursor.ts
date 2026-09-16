import { gsap } from "@/lib/gsap";

/**
 * Custom circle cursor, active only while pointing at this section. Returns the
 * caller's cleanup, which removes the listeners.
 *
 * **A finger is a mouse as far as these three events are concerned, and that is the
 * whole of the bug this guards against.** Tapping the section on a phone makes the
 * browser synthesise `mouseover`/`mouseenter`/`mousemove` at the point of the tap, so
 * the white dot faded in under the reader's finger — and then *stayed there*, because a
 * finger lifts rather than travelling off the element, so the `mouseleave` that would
 * take it away never arrives. Pointer events carry the one thing the compatibility
 * mouse events have already thrown away (`pointerType`), and they fire *before* their
 * mouse counterparts, so the flag below is already correct by the time `handleEnter` or
 * `handleMove` reads it. `pointerover` covers a mouse arriving and `pointerdown` a tap;
 * a touch fires both, and either one is enough to put the dot away.
 *
 * The guard is here rather than a `(hover: none)` test at the mount site on purpose: a
 * touchscreen laptop answers `hover: hover` for its *primary* input and would keep the
 * cursor — correctly, it has a mouse — and would still strand the dot the first time
 * somebody prodded the screen.
 */
export function attachHeroCursor(section: HTMLElement, cursor: HTMLDivElement) {
  gsap.set(cursor, { xPercent: -50, yPercent: -50 });
  const xTo = gsap.quickTo(cursor, "x", { duration: 0.4, ease: "power3" });
  const yTo = gsap.quickTo(cursor, "y", { duration: 0.4, ease: "power3" });

  let fromMouse = false;
  const hide = () => gsap.to(cursor, { opacity: 0, duration: 0.2 });

  function handlePointer(e: PointerEvent) {
    fromMouse = e.pointerType === "mouse";
    if (!fromMouse) hide();
  }
  function handleMove(e: MouseEvent) {
    if (!fromMouse) return;
    xTo(e.clientX);
    yTo(e.clientY);
  }
  function handleEnter(e: MouseEvent) {
    if (!fromMouse) return;
    xTo(e.clientX);
    yTo(e.clientY);
    gsap.to(cursor, { opacity: 1, duration: 0.2 });
  }

  section.addEventListener("pointerover", handlePointer);
  section.addEventListener("pointerdown", handlePointer);
  section.addEventListener("mousemove", handleMove);
  section.addEventListener("mouseenter", handleEnter);
  section.addEventListener("mouseleave", hide);
  return () => {
    section.removeEventListener("pointerover", handlePointer);
    section.removeEventListener("pointerdown", handlePointer);
    section.removeEventListener("mousemove", handleMove);
    section.removeEventListener("mouseenter", handleEnter);
    section.removeEventListener("mouseleave", hide);
  };
}
