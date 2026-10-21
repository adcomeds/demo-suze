/* eslint-disable */
/* global WebImporter */
/**
 * Import script for the chess challenge pages (new content, no legacy source page).
 *
 * Sources are authoring briefs in tools/importer/sources/chess-challenge/<locale>.html,
 * served by the local dev server. Each source produces:
 *   - the control page (target-path), with the experiment and conversion metadata
 *   - the challenger page (challenger-path) when imported with ?variant=challenger:
 *     identical content, chess block option "nudge", no experiment metadata
 */

// PARSER IMPORTS
import ageGateParser from './parsers/age-gate.js';
import playerRegistrationParser from './parsers/player-registration.js';
import chessParser from './parsers/chess.js';
import inviteParser from './parsers/invite.js';
import playerMessageParser from './parsers/player-message.js';

const PAGE_TEMPLATE = {
  name: 'chess-challenge',
  description: 'Chess challenge game page: intro, age gate, registration, chess board and invite (control and challenger)',
  urls: [
    'http://localhost:3000/tools/importer/sources/chess-challenge/masters-en.html',
    'http://localhost:3000/tools/importer/sources/chess-challenge/us-es.html',
    'http://localhost:3000/tools/importer/sources/chess-challenge/fr-fr.html',
  ],
  blocks: [
    { name: 'age-gate', instances: ['[data-block="age-gate"]'] },
    { name: 'player-registration', instances: ['[data-block="player-registration"]'] },
    { name: 'chess', instances: ['[data-block="chess"]'] },
    { name: 'invite', instances: ['[data-block="invite"]'] },
    { name: 'player-message', instances: ['[data-block="player-message"]'] },
  ],
};

const parsers = {
  'age-gate': ageGateParser,
  'player-registration': playerRegistrationParser,
  chess: chessParser,
  invite: inviteParser,
  'player-message': playerMessageParser,
};

const meta = (document, name) => document.querySelector(`meta[name="${name}"]`)?.content?.trim() || '';

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const pageUrl = new URL(params.originalURL || url);
    const isChallenger = pageUrl.searchParams.get('variant') === 'challenger';
    const main = document.querySelector('main') || document.body;

    // blocks
    const found = [];
    PAGE_TEMPLATE.blocks.forEach(({ name, instances }) => {
      instances.forEach((selector) => {
        main.querySelectorAll(selector).forEach((element) => {
          const options = name === 'chess' && isChallenger ? 'nudge' : undefined;
          parsers[name](element, { document, url, params, options });
          found.push(name);
        });
      });
    });

    // sections: section metadata (conversion name) and section breaks
    const sections = [...main.querySelectorAll(':scope > section')];
    sections.forEach((section, index) => {
      const conversionName = section.dataset.conversionName;
      if (conversionName) {
        section.append(WebImporter.Blocks.createBlock(document, {
          name: 'Section Metadata',
          cells: [['conversion-name', conversionName]],
        }));
      }
      if (index > 0) section.before(document.createElement('hr'));
      section.replaceWith(...section.childNodes);
    });

    // page metadata
    const metadata = {
      Title: document.title,
      Description: meta(document, 'description'),
    };
    // keys match the page model field names (models/_page.json) so they map to page properties
    if (!isChallenger) {
      metadata.experiment = meta(document, 'experiment');
      metadata['experiment-variants'] = meta(document, 'challenger-path');
      metadata['experiment-split'] = meta(document, 'experiment-split');
      metadata['experiment-status'] = meta(document, 'experiment-status');
      metadata['conversion-element'] = meta(document, 'conversion-element');
    }
    // metadata in its own trailing section, like the site's other import scripts
    main.append(document.createElement('hr'));
    main.append(WebImporter.Blocks.getMetadataBlock(document, metadata));

    const path = meta(document, isChallenger ? 'challenger-path' : 'target-path');

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        variant: isChallenger ? 'challenger' : 'control',
        blocks: found,
      },
    }];
  },
};
