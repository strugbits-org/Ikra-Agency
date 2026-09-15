import type { Metadata } from "next";
import PlaygroundNarrative from "@/components/PlaygroundNarrative";

export const metadata: Metadata = {
  title: "ikra — playground",
  description: "Work upstream.",
};

export default function PlaygroundPage() {
  return (
    <main>
      <PlaygroundNarrative />
      {/*
        A stand-in for whatever comes next, and it is here because the first section's last
        beat needs it: once the copy parks, the pin releases and the section scrolls away
        *over* what follows, which is the reveal the reference ends on. With nothing under it
        there is no reveal to look at — the page would simply stop.

        Deliberately plain and deliberately light: in the reference the section that appears
        is a pale field, and the only thing this has to do is be a different ground arriving
        from below. Replace it with the real one.
      */}
      <section className="flex min-h-screen items-center justify-center bg-gray px-8">
        <p className="max-w-xl text-center text-lg text-ink/50">
          Next section goes here.
        </p>
      </section>
    </main>
  );
}
