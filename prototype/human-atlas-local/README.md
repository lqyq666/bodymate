# Human Atlas local SCM reassembly

This is a local-only technical verification of Human Atlas browser components. It is deliberately separated from the product and from public assets because BodyMate's existing asset decision records an unresolved BodyParts3D license conflict.

Run `npm run human-atlas:fetch-local`, then `npm run build`, then `npm run human-atlas:serve`. Open `http://127.0.0.1:4177/prototype/human-atlas-local/`.

The downloader pins Human Atlas commit `1c38bf35c254a891200d3cedecfd57abebe83d8d` and writes the atlas manifest plus only chunks 4, 5, 11, 12, and 13 to `local-assets/`. This directory is gitignored. It reassembles 15 genuine components: selected right SCM, opposite SCM, six trapezius components, two clavicles, and five cervical vertebrae.

Selection is always `FJ1595 → Anatomy Registry → bodymate.neck.sternocleidomastoid.right → MoonBit select_structure → validated snapshot → renderer`.
