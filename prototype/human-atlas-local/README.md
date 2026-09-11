# Human Atlas local SCM reassembly

This is a local-only technical verification of Human Atlas browser components. It is deliberately separated from the product and public assets; the downloaded geometry is always gitignored and is never bundled by this prototype.

Run `npm run human-atlas:fetch-full-local`, then `npm run build`, then `npm run human-atlas:serve`. Open `http://127.0.0.1:4177/prototype/human-atlas-local/` for the complete navigation preview.

The downloader pins Human Atlas commit `1c38bf35c254a891200d3cedecfd57abebe83d8d` and writes the full atlas manifest plus all 15 chunks to `local-assets/`. This directory is gitignored. The overview renders all supported systems except reproductive anatomy; the local inspection reassembles 15 genuine neck-context components: selected right SCM, opposite SCM, six trapezius components, two clavicles, and five cervical vertebrae.

Selection is always `FJ1595 → Anatomy Registry → bodymate.neck.sternocleidomastoid.right → MoonBit select_structure → validated snapshot → renderer`.
