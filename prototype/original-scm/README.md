# Original SCM visual study

This is an isolated visual experiment for one authored right SCM representation. It does **not** contain a third-party anatomical mesh and does not claim clinical or anatomy-reference precision.

Run `npm install`, `npm run build`, then `npm run original-scm:serve`; open `http://127.0.0.1:4175/prototype/original-scm/`.

The interaction chain is:

`original procedural mesh click → Anatomy Registry → BodyMate stable ID → MoonBit select_structure → validated snapshot → renderer material / visibility / bounds focus`

The visual study has one stable structure, sixteen generated meshes (one surface and fifteen fiber bundles), and zero imported binary meshes. `isolate` hides the authored reference forms; `restore` shows them again.
