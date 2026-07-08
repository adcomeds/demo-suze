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

  // tools/importer/import-product-page.js
  var import_product_page_exports = {};
  __export(import_product_page_exports, {
    default: () => import_product_page_default
  });

  // tools/importer/parsers/hero-video-cover.js
  function parse(element, { document }) {
    const source = element.querySelector(".product__header__video source[src], video source[src], video[src]");
    const videoUrl = source ? source.getAttribute("src") || source.src : "";
    const heading = element.querySelector(".product__header__insert__title, h1, h2");
    const desc = element.querySelector(".product__header__insert .product__header__insert__description:not(.mobile), .product__header__insert__description:not(.mobile)");
    if (!videoUrl && !heading) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [];
    const videoFrag = document.createDocumentFragment();
    videoFrag.appendChild(document.createComment(" field:video "));
    if (videoUrl) {
      const a = document.createElement("a");
      a.href = videoUrl;
      a.textContent = videoUrl;
      videoFrag.appendChild(a);
    }
    cells.push([videoFrag]);
    const textFrag = document.createDocumentFragment();
    textFrag.appendChild(document.createComment(" field:text "));
    if (heading) textFrag.appendChild(heading.cloneNode(true));
    if (desc) textFrag.appendChild(desc.cloneNode(true));
    cells.push([textFrag]);
    const block = WebImporter.Blocks.createBlock(document, { name: "hero-video-cover", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-tasting-notes.js
  function parse2(element, { document }) {
    const items = Array.from(element.querySelectorAll(
      ".productSection__content__data-box__row, .productSection__list__item, .productSection__list li"
    ));
    if (items.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [];
    items.forEach((item) => {
      const icon = item.querySelector(
        ".productSection__content__data-box__icon img, .productSection__list__item__icon, img"
      );
      const iconFrag = document.createDocumentFragment();
      if (icon) {
        iconFrag.appendChild(document.createComment(" field:image "));
        iconFrag.appendChild(icon.cloneNode(true));
      }
      const label = item.querySelector(
        ".productSection__content__data-box__item__title, .productSection__list__item__label"
      );
      const value = item.querySelector(
        ".productSection__content__data-box__item__content, .productSection__list__item__value"
      );
      const textFrag = document.createDocumentFragment();
      textFrag.appendChild(document.createComment(" field:text "));
      const p = document.createElement("p");
      if (label) {
        const strong = document.createElement("strong");
        strong.textContent = label.textContent.trim();
        p.appendChild(strong);
      }
      if (value) {
        if (label) p.appendChild(document.createTextNode(" "));
        p.appendChild(document.createTextNode(value.textContent.trim()));
      }
      textFrag.appendChild(p);
      cells.push([iconFrag, textFrag]);
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-tasting-notes", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-flip.js
  function parse3(element, { document }) {
    const cards = Array.from(element.querySelectorAll(".flip-card"));
    if (cards.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [];
    cards.forEach((card) => {
      const front = card.querySelector(".flip-card-front");
      const back = card.querySelector(".flip-card-back");
      const image = card.querySelector(".flip-card__header-image, img");
      const imageFrag = document.createDocumentFragment();
      if (image) {
        imageFrag.appendChild(document.createComment(" field:image "));
        imageFrag.appendChild(image);
      }
      const textFrag = document.createDocumentFragment();
      textFrag.appendChild(document.createComment(" field:text "));
      if (front) {
        const frontTitle = front.querySelector(".flip-card__header-title");
        if (frontTitle) {
          const h = document.createElement("h3");
          h.textContent = frontTitle.textContent;
          textFrag.appendChild(h);
        }
        const frontDesc = front.querySelector(".flip-card__description");
        if (frontDesc) textFrag.appendChild(frontDesc.cloneNode(true));
      }
      if (back) {
        const backTitle = back.querySelector(".flip-card__back-title");
        if (backTitle) {
          const h = document.createElement("h4");
          h.textContent = backTitle.textContent;
          textFrag.appendChild(h);
        }
        const recipe = back.querySelector(".flip-card__recipe");
        if (recipe) {
          const rows = Array.from(recipe.querySelectorAll(".flip-card__recipe__row"));
          if (rows.length) {
            const table = document.createElement("table");
            rows.forEach((row) => {
              const tr = document.createElement("tr");
              Array.from(row.querySelectorAll("p")).forEach((p) => {
                const td = document.createElement("td");
                td.textContent = p.textContent;
                tr.appendChild(td);
              });
              table.appendChild(tr);
            });
            textFrag.appendChild(table);
          }
          const detail = recipe.querySelector(".flip-card__recipe__detail");
          if (detail) textFrag.appendChild(detail.cloneNode(true));
        }
        const backDesc = back.querySelector(".flip-card__description");
        if (backDesc) textFrag.appendChild(backDesc.cloneNode(true));
        const productLink = back.querySelector(".flip-card__buttons a[href], a.cta[href]");
        if (productLink) {
          const p = document.createElement("p");
          p.appendChild(productLink.cloneNode(true));
          textFrag.appendChild(p);
        }
      }
      cells.push([imageFrag, textFrag]);
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-flip", cells });
    let sectionHeading = element.querySelector(":scope .flip-card-section > h2");
    if (!sectionHeading) {
      sectionHeading = Array.from(element.querySelectorAll("h2")).find((h) => !h.closest(".flip-card"));
    }
    if (sectionHeading) {
      element.replaceWith(sectionHeading.cloneNode(true), block);
    } else {
      element.replaceWith(block);
    }
  }

  // tools/importer/parsers/columns-frieze.js
  function parse4(element, { document }) {
    const frieze = element.querySelector(".suzeOriginalHome__frieze__infinite-frieze__title, .frieze h2, .frieze h3");
    const image = element.querySelector(".suzeOriginalHome__content__media img, img");
    const insert = element.querySelector(".suzeOriginalHome__content__insert");
    const scope = insert || element;
    const title = scope.querySelector("h3, h4");
    const text = scope.querySelector(".suzeOriginalHome__content__insert__text, p");
    const cta = element.querySelector(".suzeOriginalHome__content__insert a.cta, .suzeOriginalHome__content__insert a, a.cta");
    if (!image && !text) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const imageCell = [];
    if (image) imageCell.push(image);
    const contentCell = [];
    if (frieze) contentCell.push(frieze);
    if (title) contentCell.push(title);
    if (text) contentCell.push(text);
    if (cta) contentCell.push(cta);
    const cells = [];
    cells.push([imageCell, contentCell]);
    const block = WebImporter.Blocks.createBlock(document, { name: "columns-frieze", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/hero-cover-player.js
  function parse5(element, { document }) {
    const frieze = element.querySelector(".coverPlayer__frieze__infinite-frieze__title, .frieze h2, .frieze h3");
    const poster = element.querySelector(".coverPlayer__content__media__image, .coverPlayer__content__media img, img");
    const playBtn = element.querySelector(".coverPlayer__content__show-video[data-video], [data-video]");
    let videoUrl = playBtn ? playBtn.getAttribute("data-video") : "";
    if (!videoUrl) {
      const ytSrc = element.querySelector('[data-src*="youtu"], iframe[src*="youtu"], a[href*="youtu"]');
      if (ytSrc) {
        videoUrl = ytSrc.getAttribute("data-src") || ytSrc.getAttribute("src") || ytSrc.getAttribute("href") || "";
      }
    }
    const insert = element.querySelector(".coverPlayer__content__insert");
    const scope = insert || element;
    const title = scope.querySelector("h3, h4");
    const desc = scope.querySelector(".coverPlayer__content__insert__description, p");
    const cta = element.querySelector(".coverPlayer__content__insert a.cta, .coverPlayer__content__insert a, a.cta");
    if (!poster && !desc) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [];
    const imageFrag = document.createDocumentFragment();
    if (poster) {
      imageFrag.appendChild(document.createComment(" field:image "));
      imageFrag.appendChild(poster);
      cells.push([imageFrag]);
    } else {
      cells.push([""]);
    }
    const videoFrag = document.createDocumentFragment();
    videoFrag.appendChild(document.createComment(" field:video "));
    if (videoUrl) {
      const a = document.createElement("a");
      a.href = videoUrl;
      a.textContent = videoUrl;
      videoFrag.appendChild(a);
    }
    cells.push([videoFrag]);
    const textFrag = document.createDocumentFragment();
    textFrag.appendChild(document.createComment(" field:text "));
    if (frieze) {
      const h = document.createElement("h2");
      h.textContent = frieze.textContent;
      textFrag.appendChild(h);
    }
    if (title) textFrag.appendChild(title.cloneNode(true));
    if (desc) textFrag.appendChild(desc.cloneNode(true));
    if (cta) {
      const p = document.createElement("p");
      p.appendChild(cta.cloneNode(true));
      textFrag.appendChild(p);
    }
    cells.push([textFrag]);
    const block = WebImporter.Blocks.createBlock(document, { name: "hero-cover-player", cells });
    const sectionHeading = Array.from(element.querySelectorAll("h2")).find((h) => !h.closest('[class*="coverPlayer__content"], [class*="coverPlayer__frieze"]') && !h.closest('[class*="frieze"]'));
    if (sectionHeading) {
      element.replaceWith(sectionHeading.cloneNode(true), block);
    } else {
      element.replaceWith(block);
    }
  }

  // tools/importer/transformers/suze-cleanup.js
  var TransformHook = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  function transform(hookName, element, payload) {
    if (hookName === TransformHook.beforeTransform) {
      element.querySelectorAll('.youtube-iframe[data-src*="youtu"]').forEach((yt) => {
        const section = yt.closest("section");
        if (section) section.appendChild(yt);
      });
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

  // tools/importer/import-product-page.js
  var PAGE_TEMPLATE = {
    name: "product-page",
    description: "Product detail page with video hero, tasting-notes, How-to-enjoy flip cards, origin frieze, and elaboration cover-player",
    urls: [
      "https://www.suze.com/product/suze-loriginale/",
      "https://www.suze.com/product/suze-tonic-0/"
    ],
    blocks: [
      { name: "hero-video-cover", instances: ["#main > div.product > section.section:nth-child(1)"] },
      { name: "cards-tasting-notes", instances: ["#main > div.product > section.section.product-section:nth-child(2)"] },
      { name: "cards-flip", instances: ["#main > div.product > section.section.ofw-hidden:nth-child(3)"] },
      { name: "columns-frieze", instances: ["#main > div.product > section.section.ofw-hidden:nth-child(4)"] },
      { name: "hero-cover-player", instances: ["#main > div.product > section.section:nth-child(5)"] }
    ],
    sections: [
      { id: "prod-1", name: "Hero", selector: "#main > div.product > section.section:nth-child(1)", style: null, blocks: ["hero-video-cover"], defaultContent: [] },
      { id: "prod-2", name: "Product tasting notes", selector: "#main > div.product > section.section.product-section:nth-child(2)", style: null, blocks: ["cards-tasting-notes"], defaultContent: [] },
      { id: "prod-3", name: "How to enjoy Suze?", selector: "#main > div.product > section.section.ofw-hidden:nth-child(3)", style: "orange", blocks: ["cards-flip"], defaultContent: ["#main > div.product > section.section.ofw-hidden:nth-child(3) h2"] },
      { id: "prod-4", name: "Where does Suze come from?", selector: "#main > div.product > section.section.ofw-hidden:nth-child(4)", style: null, blocks: ["columns-frieze"], defaultContent: [] },
      { id: "prod-5", name: "Suze's elaboration", selector: "#main > div.product > section.section:nth-child(5)", style: "orange", blocks: ["hero-cover-player"], defaultContent: ["#main > div.product > section.section:nth-child(5) h2"] }
    ]
  };
  var parsers = {
    "hero-video-cover": parse,
    "cards-tasting-notes": parse2,
    "cards-flip": parse3,
    "columns-frieze": parse4,
    "hero-cover-player": parse5
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
  var import_product_page_default = {
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
  return __toCommonJS(import_product_page_exports);
})();
