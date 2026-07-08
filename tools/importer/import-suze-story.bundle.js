/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/importer/import-suze-story.js
  var import_suze_story_exports = {};
  __export(import_suze_story_exports, {
    default: () => import_suze_story_default
  });

  // tools/importer/parsers/hero-frieze-cover.js
  function parse(element, { document }) {
    const image = element.querySelector(".history__header__media img, .history__header__image, img:not(.history__header__insert__corner)");
    const heading = element.querySelector(".history__header__insert__title, h1, h2");
    const desc = element.querySelector(".history__header__insert__description, .history__header__insert p, p");
    if (!image && !heading) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [];
    const imageFrag = document.createDocumentFragment();
    if (image) {
      imageFrag.appendChild(document.createComment(" field:image "));
      imageFrag.appendChild(image);
      cells.push([imageFrag]);
    } else {
      cells.push([""]);
    }
    const textFrag = document.createDocumentFragment();
    textFrag.appendChild(document.createComment(" field:text "));
    if (heading) textFrag.appendChild(heading.cloneNode(true));
    if (desc) textFrag.appendChild(desc.cloneNode(true));
    cells.push([textFrag]);
    const block = WebImporter.Blocks.createBlock(document, { name: "hero-frieze-cover", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-timeline.js
  function parse2(element, { document }) {
    const rows = Array.from(element.querySelectorAll(".historySection__content__item__row, .historySection__content > div"));
    if (rows.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [];
    rows.forEach((row) => {
      const image = row.querySelector(".historySection__content__item__col__img img, .col-img img, img");
      const textCol = row.querySelector(".historySection__content__item__col__text, .col-text");
      const scope = textCol || row;
      const heading = scope.querySelector("h1, h2, h3, h4");
      const para = scope.querySelector("p");
      const yearLabel = heading ? heading.textContent.trim() : "";
      if (!image && !heading && !para) return;
      const yearFrag = document.createDocumentFragment();
      yearFrag.appendChild(document.createComment(" field:year "));
      if (yearLabel) yearFrag.appendChild(document.createTextNode(yearLabel));
      const imageFrag = document.createDocumentFragment();
      if (image) {
        imageFrag.appendChild(document.createComment(" field:image "));
        imageFrag.appendChild(image);
      }
      const textFrag = document.createDocumentFragment();
      textFrag.appendChild(document.createComment(" field:text "));
      if (heading) textFrag.appendChild(heading.cloneNode(true));
      if (para) textFrag.appendChild(para.cloneNode(true));
      cells.push([yearFrag, imageFrag, textFrag]);
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-timeline", cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/suze-cleanup.js
  var TransformHook = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  function transform(hookName, element, payload) {
    if (hookName === TransformHook.beforeTransform) {
      WebImporter.DOMUtils.remove(element, [
        "#pr_age_gate",
        // age-gate overlay
        "#didomi-host",
        // Didomi cookie consent host
        '[id^="didomi"]',
        // Didomi injected nodes
        '[class^="didomi"]',
        // Didomi styling containers
        '[class*="didomi-"]',
        // Didomi utility classes
        "#modals",
        // modal container (video URLs captured inline)
        ".modal"
        // individual modal nodes (video / text-version)
      ]);
    }
    if (hookName === TransformHook.afterTransform) {
      WebImporter.DOMUtils.remove(element, [
        "header.header",
        // site header / nav
        "footer.footer",
        // site footer
        ".language-switcher",
        // language switcher widget
        '[class*="lang-switch"]',
        // language switcher (alt naming)
        "noscript",
        "link",
        "iframe"
      ]);
    }
  }

  // tools/importer/transformers/suze-sections.js
  var TransformHook2 = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  function tryQuery(scope, sel) {
    if (!sel) return null;
    try {
      return scope.querySelector(sel);
    } catch (e) {
      return null;
    }
  }
  function resolveSectionElement(element, selector) {
    const selectors = Array.isArray(selector) ? selector : [selector];
    for (const sel of selectors) {
      if (!sel) continue;
      const scopeVariant = sel.replace(/^#?main\s*>?\s*/i, ":scope > ");
      const stripped = sel.replace(/^#?main\s*>?\s*/i, "");
      const sectionTailMatch = stripped.match(/(section[^>]*(?:>.*)?)$/i);
      const sectionTail = sectionTailMatch ? sectionTailMatch[1].trim() : null;
      const candidates = [sel, scopeVariant, stripped, sectionTail];
      for (const candidate of candidates) {
        const found = tryQuery(element, candidate);
        if (found) return found;
      }
    }
    return null;
  }
  function transform2(hookName, element, payload) {
    if (hookName === TransformHook2.afterTransform) {
      const template = payload && payload.template;
      const sections = template && Array.isArray(template.sections) ? template.sections : [];
      if (sections.length < 2) return;
      const document = element.ownerDocument;
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        const sectionEl = resolveSectionElement(element, section.selector);
        if (!sectionEl) continue;
        if (section.style) {
          const metaBlock = WebImporter.Blocks.createBlock(document, {
            name: "Section Metadata",
            cells: { style: section.style }
          });
          sectionEl.after(metaBlock);
        }
        if (i > 0) {
          sectionEl.before(document.createElement("hr"));
        }
      }
    }
  }

  // tools/importer/import-suze-story.js
  var PAGE_TEMPLATE = {
    name: "suze-story",
    description: "Brand history timeline page with year navigation and chronological story entries",
    urls: ["https://www.suze.com/suze-story/"],
    blocks: [
      { name: "hero-frieze-cover", instances: ["#main > div.history > section.section:nth-child(1)", "main .history > section:nth-child(1)"] },
      { name: "cards-timeline", instances: ["#main > div.history > section.section:nth-child(2)", "main .history > section:nth-child(2)"] }
    ],
    sections: [
      { id: "story-1", name: "Hero", selector: ["#main > div.history > section.section:nth-child(1)", "main .history > section:nth-child(1)"], style: null, blocks: ["hero-frieze-cover"], defaultContent: [] },
      { id: "story-2", name: "History timeline", selector: ["#main > div.history > section.section:nth-child(2)", "main .history > section:nth-child(2)"], style: null, blocks: ["cards-timeline"], defaultContent: [] }
    ]
  };
  var parsers = {
    "hero-frieze-cover": parse,
    "cards-timeline": parse2
  };
  var transformers = [
    transform,
    ...PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [transform2] : []
  ];
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = __spreadProps(__spreadValues({}, payload), { template: PAGE_TEMPLATE });
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
        if (matched) return;
        const elements = document.querySelectorAll(selector);
        if (elements.length === 0) return;
        matched = true;
        elements.forEach((element) => {
          pageBlocks.push({ name: blockDef.name, selector, element, section: blockDef.section || null });
        });
      });
      if (!matched) console.warn(`Block "${blockDef.name}" \u2014 no selector matched`);
    });
    console.log(`Found ${pageBlocks.length} block instances on page`);
    return pageBlocks;
  }
  var import_suze_story_default = {
    transform: (payload) => {
      const { document, url, params } = payload;
      const main = document.body;
      executeTransformers("beforeTransform", main, payload);
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
      executeTransformers("afterTransform", main, payload);
      const hr = document.createElement("hr");
      main.appendChild(hr);
      WebImporter.rules.createMetadata(main, document);
      WebImporter.rules.transformBackgroundImages(main, document);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const path = WebImporter.FileUtils.sanitizePath(
        new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html$/, "")
      );
      return [{
        element: main,
        path,
        report: {
          title: document.title,
          template: PAGE_TEMPLATE.name,
          blocks: pageBlocks.map((b) => b.name)
        }
      }];
    }
  };
  return __toCommonJS(import_suze_story_exports);
})();
