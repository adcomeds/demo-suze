/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroParser from './parsers/hero.js';
import columnsFriezeParser from './parsers/columns-frieze.js';
import cardsFlipParser from './parsers/cards-flip.js';
import heroCoverPlayerParser from './parsers/hero-cover-player.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/suze-cleanup.js';
import sectionsTransformer from './transformers/suze-sections.js';

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'homepage',
  description: 'Suze homepage with animated hero/frieze, product-showcase flip cards (How to drink it), and Suze story cover-player section',
  urls: ['https://www.suze.com/'],
  blocks: [
    { name: 'hero', instances: ['#main > div.homepage > section.section:nth-child(1)'] },
    { name: 'columns-frieze', instances: ['#main > div.homepage > section.section.ofw-hidden:nth-child(2)'] },
    { name: 'cards-flip', instances: ['#main > div.homepage > section.section.ofw-hidden:nth-child(3)'] },
    { name: 'hero-cover-player', instances: ['#main > div.homepage > section.section.ofw-hidden:nth-child(4)'] },
  ],
  sections: [
    { id: 'home-1', name: 'Hero', selector: '#main > div.homepage > section.section:nth-child(1)', style: null, blocks: ['hero'], defaultContent: [] },
    { id: 'home-2', name: "Suze L'Originale intro", selector: '#main > div.homepage > section.section.ofw-hidden:nth-child(2)', style: null, blocks: ['columns-frieze'], defaultContent: [] },
    { id: 'home-3', name: 'How to drink it?', selector: '#main > div.homepage > section.section.ofw-hidden:nth-child(3)', style: 'orange', blocks: ['cards-flip'], defaultContent: ['#main > div.homepage > section.section.ofw-hidden:nth-child(3) h2'] },
    { id: 'home-4', name: 'Suze story', selector: '#main > div.homepage > section.section.ofw-hidden:nth-child(4)', style: null, blocks: ['hero-cover-player'], defaultContent: [] },
  ],
};

// PARSER REGISTRY
const parsers = {
  hero: heroParser,
  'columns-frieze': columnsFriezeParser,
  'cards-flip': cardsFlipParser,
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

    // Homepage lives at /index
    let pathname = new URL(params.originalURL).pathname.replace(/\/$/, '').replace(/\.html$/, '');
    if (pathname === '' || pathname === '/') pathname = '/index';
    const path = WebImporter.FileUtils.sanitizePath(pathname);

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
