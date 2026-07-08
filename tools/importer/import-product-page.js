/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroVideoCoverParser from './parsers/hero-video-cover.js';
import cardsTastingNotesParser from './parsers/cards-tasting-notes.js';
import cardsFlipParser from './parsers/cards-flip.js';
import columnsFriezeParser from './parsers/columns-frieze.js';
import heroCoverPlayerParser from './parsers/hero-cover-player.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/suze-cleanup.js';
import sectionsTransformer from './transformers/suze-sections.js';

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'product-page',
  description: 'Product detail page with video hero, tasting-notes, How-to-enjoy flip cards, origin frieze, and elaboration cover-player',
  urls: [
    'https://www.suze.com/product/suze-loriginale/',
    'https://www.suze.com/product/suze-tonic-0/',
  ],
  blocks: [
    { name: 'hero-video-cover', instances: ['#main > div.product > section.section:nth-child(1)'] },
    { name: 'cards-tasting-notes', instances: ['#main > div.product > section.section.product-section:nth-child(2)'] },
    { name: 'cards-flip', instances: ['#main > div.product > section.section.ofw-hidden:nth-child(3)'] },
    { name: 'columns-frieze', instances: ['#main > div.product > section.section.ofw-hidden:nth-child(4)'] },
    { name: 'hero-cover-player', instances: ['#main > div.product > section.section:nth-child(5)'] },
  ],
  sections: [
    { id: 'prod-1', name: 'Hero', selector: '#main > div.product > section.section:nth-child(1)', style: null, blocks: ['hero-video-cover'], defaultContent: [] },
    { id: 'prod-2', name: 'Product tasting notes', selector: '#main > div.product > section.section.product-section:nth-child(2)', style: null, blocks: ['cards-tasting-notes'], defaultContent: [] },
    { id: 'prod-3', name: 'How to enjoy Suze?', selector: '#main > div.product > section.section.ofw-hidden:nth-child(3)', style: 'orange', blocks: ['cards-flip'], defaultContent: ['#main > div.product > section.section.ofw-hidden:nth-child(3) h2'] },
    { id: 'prod-4', name: 'Where does Suze come from?', selector: '#main > div.product > section.section.ofw-hidden:nth-child(4)', style: null, blocks: ['columns-frieze'], defaultContent: [] },
    { id: 'prod-5', name: "Suze's elaboration", selector: '#main > div.product > section.section:nth-child(5)', style: 'orange', blocks: ['hero-cover-player'], defaultContent: ['#main > div.product > section.section:nth-child(5) h2'] },
  ],
};

// PARSER REGISTRY
const parsers = {
  'hero-video-cover': heroVideoCoverParser,
  'cards-tasting-notes': cardsTastingNotesParser,
  'cards-flip': cardsFlipParser,
  'columns-frieze': columnsFriezeParser,
  'hero-cover-player': heroCoverPlayerParser,
};

// TRANSFORMER REGISTRY
const transformers = [
  cleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [sectionsTransformer] : []),
];

function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        pageBlocks.push({ name: blockDef.name, selector, element, section: blockDef.section || null });
      });
    });
  });
  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.body;

    executeTransformers('beforeTransform', main, payload);

    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    executeTransformers('afterTransform', main, payload);

    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    const path = WebImporter.FileUtils.sanitizePath(
      new URL(params.originalURL).pathname.replace(/\/$/, '').replace(/\.html$/, ''),
    );

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
