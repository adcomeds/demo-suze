/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroFriezeCoverParser from './parsers/hero-frieze-cover.js';
import cardsTimelineParser from './parsers/cards-timeline.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/suze-cleanup.js';
import sectionsTransformer from './transformers/suze-sections.js';

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'suze-story',
  description: 'Brand history timeline page with year navigation and chronological story entries',
  urls: ['https://www.suze.com/suze-story/'],
  blocks: [
    { name: 'hero-frieze-cover', instances: ['#main > div.history > section.section:nth-child(1)', 'main .history > section:nth-child(1)'] },
    { name: 'cards-timeline', instances: ['#main > div.history > section.section:nth-child(2)', 'main .history > section:nth-child(2)'] },
  ],
  sections: [
    { id: 'story-1', name: 'Hero', selector: ['#main > div.history > section.section:nth-child(1)', 'main .history > section:nth-child(1)'], style: null, blocks: ['hero-frieze-cover'], defaultContent: [] },
    { id: 'story-2', name: 'History timeline', selector: ['#main > div.history > section.section:nth-child(2)', 'main .history > section:nth-child(2)'], style: null, blocks: ['cards-timeline'], defaultContent: [] },
  ],
};

// PARSER REGISTRY
const parsers = {
  'hero-frieze-cover': heroFriezeCoverParser,
  'cards-timeline': cardsTimelineParser,
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
    let matched = false;
    blockDef.instances.forEach((selector) => {
      if (matched) return; // instances are fallbacks for the same block; use the first that matches
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) return;
      matched = true;
      elements.forEach((element) => {
        pageBlocks.push({ name: blockDef.name, selector, element, section: blockDef.section || null });
      });
    });
    if (!matched) console.warn(`Block "${blockDef.name}" — no selector matched`);
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
