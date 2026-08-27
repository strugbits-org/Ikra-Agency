import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, ScrollSmoother);
  // iOS/Android resize the viewport as the address bar collapses mid-scroll, which
  // otherwise triggers a ScrollTrigger refresh at exactly the wrong moment — a pin's
  // start/end get re-measured against a transient viewport height, so it can end up
  // releasing early or late relative to the document's real, settled height. This is
  // GSAP's own mitigation: touch-only resizes (address-bar show/hide) are ignored, so
  // every pin keeps the measurement it took once the layout actually settled.
  ScrollTrigger.config({ ignoreMobileResize: true });
}

export { gsap, ScrollTrigger, ScrollSmoother };
