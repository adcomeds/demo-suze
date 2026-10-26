/*
 * AEM Sidekick plugins. Loaded by scripts.js only when the Sidekick is on the page.
 * See https://www.aem.live/docs/ew/developing/set-up-experimentation
 */
let expMod;
const DA_EXP = 'https://da.live/nx/public/plugins/exp/exp.js';

/* "Experimentation" button (tools/sidekick/config.json): opens or toggles the panel */
async function toggleExp() {
  const exists = document.querySelector('#aem-sidekick-exp');

  // If it doesn't exist, let module side effects run
  if (!exists) {
    expMod = await import(DA_EXP);
    return;
  }

  // Else, cache the module here and toggle it.
  if (!expMod) expMod = await import(DA_EXP);
  expMod.default();
}

(async function sidekick() {
  const sk = document.querySelector('aem-sidekick');
  if (!sk) return;
  sk.addEventListener('custom:experimentation', toggleExp);
}());
