# Migration notes — hero-cover-player on masters/{en,es,fr}/product/suze-loriginale

Captured 2026-07-16 before the "Frieze Heading" field was split out of the
"Text" richtext field in `hero-cover-player`. Old content authored the
heading (h3) as the first element inside the same richtext field as the
description paragraph. After this change the block expects 4 rows (image,
video, heading, text) instead of 3, so the currently authored 3-row content
will misalign: the whole old text row would be read as the heading (a
garbled marquee), and the description would disappear entirely.

Re-author each of these 3 pages' `hero-cover-player` block by moving the
heading text out of "Text" into the new "Frieze Heading" field.

## masters/en/product/suze-loriginale
- Poster Image: https://delivery-p31104-e170504.adobeaemcloud.com/adobe/assets/urn:aaid:aem:c9a16f84-4f0f-4c0a-9b80-fdf86c276bc8/as/image003-1527x0-c-default.avif
- Video URL: https://youtu.be/_yKiXuyT-84
- Frieze Heading: 130 years of know how
- Text: Since 1889, Suze has been produced following the exact same recipe, maceration, distillation and blending.

## masters/es/product/suze-loriginale
- Poster Image: https://delivery-p31104-e170504.adobeaemcloud.com/adobe/assets/urn:aaid:aem:c9a16f84-4f0f-4c0a-9b80-fdf86c276bc8/as/image003-1527x0-c-default.avif
- Video URL: https://youtu.be/_yKiXuyT-84
- Frieze Heading: 130 años de saber hacer
- Text: Desde 1889, Suze se elabora siguiendo la misma receta, así como el mismo proceso de maceración, destilación y ensamblaje.

## masters/fr/product/suze-loriginale
- Poster Image: https://delivery-p31104-e170504.adobeaemcloud.com/adobe/assets/urn:aaid:aem:c9a16f84-4f0f-4c0a-9b80-fdf86c276bc8/as/image003-1527x0-c-default.avif
- Video URL: https://youtu.be/_yKiXuyT-84
- Frieze Heading: 130 ans de savoir-faire
- Text: Depuis 1889, Suze est réalisée selon la même recette, macération, distillation et assemblage. Appuyez sur le bouton pour en apprendre d'avantage.
