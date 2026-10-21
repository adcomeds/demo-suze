/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
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

  // tools/importer/import-chess-challenge.js
  var import_chess_challenge_exports = {};
  __export(import_chess_challenge_exports, {
    default: () => import_chess_challenge_default
  });

  // tools/importer/parsers/age-gate.js
  function parse(element, { document }) {
    const options = (element.dataset.options || "").trim();
    const age = document.createDocumentFragment();
    age.appendChild(document.createComment(" field:minimumAge "));
    age.appendChild(document.createTextNode(element.dataset.minimumAge || "18"));
    const text = document.createDocumentFragment();
    text.appendChild(document.createComment(" field:text "));
    [...element.childNodes].forEach((node) => text.appendChild(node));
    const name = options ? `age-gate (${options})` : "age-gate";
    element.replaceWith(WebImporter.Blocks.createBlock(document, { name, cells: [[age], [text]] }));
  }

  // tools/importer/parsers/player-registration.js
  function parse2(element, { document }) {
    const cells = ["text", "termsLink"].map((field) => {
      const frag = document.createDocumentFragment();
      frag.appendChild(document.createComment(` field:${field} `));
      const source = element.querySelector(`[data-field="${field}"]`);
      if (source) [...source.childNodes].forEach((node) => frag.appendChild(node));
      return [frag];
    });
    element.replaceWith(WebImporter.Blocks.createBlock(document, { name: "player-registration", cells }));
  }

  // tools/importer/parsers/chess.js
  function parse3(element, { document, options = "" }) {
    const cells = ["resultWin", "resultLoss", "resultDraw"].map((field) => {
      const frag = document.createDocumentFragment();
      frag.appendChild(document.createComment(` field:${field} `));
      const source = element.querySelector(`[data-field="${field}"]`);
      if (source) [...source.childNodes].forEach((node) => frag.appendChild(node));
      return [frag];
    });
    const variant = (options || element.dataset.options || "").trim();
    const name = variant ? `chess (${variant})` : "chess";
    element.replaceWith(WebImporter.Blocks.createBlock(document, { name, cells }));
  }

  // tools/importer/parsers/invite.js
  function parse4(element, { document }) {
    const text = document.createDocumentFragment();
    text.appendChild(document.createComment(" field:text "));
    [...element.childNodes].forEach((node) => text.appendChild(node));
    element.replaceWith(WebImporter.Blocks.createBlock(document, { name: "invite", cells: [[text]] }));
  }

  // tools/importer/parsers/player-message.js
  function parse5(element, { document }) {
    const cells = [...element.querySelectorAll(":scope > [data-item]")].map((item) => {
      const audience = document.createDocumentFragment();
      audience.appendChild(document.createComment(" field:audience "));
      audience.appendChild(document.createTextNode(item.dataset.audience || "registered"));
      const text = document.createDocumentFragment();
      text.appendChild(document.createComment(" field:text "));
      const source = item.querySelector('[data-field="text"]');
      if (source) [...source.childNodes].forEach((node) => text.appendChild(node));
      const link = document.createDocumentFragment();
      const a = item.querySelector(":scope > a[href]");
      if (a) {
        link.appendChild(document.createComment(" field:link "));
        link.appendChild(a);
      }
      return [audience, text, link];
    });
    element.replaceWith(WebImporter.Blocks.createBlock(document, { name: "player-message", cells }));
  }

  // tools/importer/import-chess-challenge.js
  var PAGE_TEMPLATE = {
    name: "chess-challenge",
    description: "Chess challenge game page: intro, age gate, registration, chess board and invite (control and challenger)",
    urls: [
      "http://localhost:3000/tools/importer/sources/chess-challenge/masters-en.html",
      "http://localhost:3000/tools/importer/sources/chess-challenge/us-es.html",
      "http://localhost:3000/tools/importer/sources/chess-challenge/fr-fr.html"
    ],
    blocks: [
      { name: "age-gate", instances: ['[data-block="age-gate"]'] },
      { name: "player-registration", instances: ['[data-block="player-registration"]'] },
      { name: "chess", instances: ['[data-block="chess"]'] },
      { name: "invite", instances: ['[data-block="invite"]'] },
      { name: "player-message", instances: ['[data-block="player-message"]'] }
    ]
  };
  var parsers = {
    "age-gate": parse,
    "player-registration": parse2,
    chess: parse3,
    invite: parse4,
    "player-message": parse5
  };
  var meta = (document, name) => {
    var _a, _b;
    return ((_b = (_a = document.querySelector(`meta[name="${name}"]`)) == null ? void 0 : _a.content) == null ? void 0 : _b.trim()) || "";
  };
  var import_chess_challenge_default = {
    transform: (payload) => {
      const { document, url, params } = payload;
      const pageUrl = new URL(params.originalURL || url);
      const isChallenger = pageUrl.searchParams.get("variant") === "challenger";
      const main = document.querySelector("main") || document.body;
      const found = [];
      PAGE_TEMPLATE.blocks.forEach(({ name, instances }) => {
        instances.forEach((selector) => {
          main.querySelectorAll(selector).forEach((element) => {
            const options = name === "chess" && isChallenger ? "nudge" : void 0;
            parsers[name](element, { document, url, params, options });
            found.push(name);
          });
        });
      });
      const sections = [...main.querySelectorAll(":scope > section")];
      sections.forEach((section, index) => {
        const conversionName = section.dataset.conversionName;
        if (conversionName) {
          section.append(WebImporter.Blocks.createBlock(document, {
            name: "Section Metadata",
            cells: [["conversion-name", conversionName]]
          }));
        }
        if (index > 0) section.before(document.createElement("hr"));
        section.replaceWith(...section.childNodes);
      });
      const metadata = {
        Title: document.title,
        Description: meta(document, "description")
      };
      if (!isChallenger) {
        metadata.experiment = meta(document, "experiment");
        metadata["experiment-variants"] = meta(document, "challenger-path");
        metadata["experiment-split"] = meta(document, "experiment-split");
        metadata["experiment-status"] = meta(document, "experiment-status");
        metadata["conversion-element"] = meta(document, "conversion-element");
      }
      main.append(document.createElement("hr"));
      main.append(WebImporter.Blocks.getMetadataBlock(document, metadata));
      const path = meta(document, isChallenger ? "challenger-path" : "target-path");
      return [{
        element: main,
        path,
        report: {
          title: document.title,
          template: PAGE_TEMPLATE.name,
          variant: isChallenger ? "challenger" : "control",
          blocks: found
        }
      }];
    }
  };
  return __toCommonJS(import_chess_challenge_exports);
})();
