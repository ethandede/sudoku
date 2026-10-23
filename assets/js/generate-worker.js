// Builds a puzzle off the main thread.
// The generator reports cells removed, uniqueness checks, and grades.
// Copyright (c) Magic UI. The gauge this progress drives is adapted from
// https://magicui.design/docs/components/animated-circular-progress-bar
// MIT License. Permission notice is in assets/scss/components/_gen-progress.scss.

const version = new URL(self.location.href).search;
importScripts(`solver.js${version}`, `pools.js${version}`, `generator.js${version}`);

const gen = self.SudokuGenerator;

self.onmessage = (event) => {
  const data = event.data || {};
  const id = data.id;
  gen.setProgress((info) => {
    self.postMessage({ type: "progress", id, info });
  });
  try {
    const options = data.options || {};
    const result =
      data.op === "technique"
        ? gen.generateForTechnique(data.slug, { allowed: options.allowed || [], seed: options.seed })
        : gen.generate(data.difficulty, data.seed);
    self.postMessage({ type: "done", id, result: JSON.parse(JSON.stringify(result)) });
  } catch (error) {
    self.postMessage({
      type: "error",
      id,
      message: String(error && error.message ? error.message : error),
    });
  } finally {
    gen.setProgress(null);
  }
};
