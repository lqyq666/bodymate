# BodyMate environment asset manifest

Generated on 2026-09-13 from Tripo GLB exports. Original export copies are retained locally in `source/tripo/`. The public repository includes their source hashes below, versioned `processed` Web outputs, and byte-identical stable-path `runtime` copies.

| Role | Source SHA-256 | Runtime bytes | Runtime triangles | Runtime SHA-256 |
|---|---|---:|---:|---|
| Observation platform | `08E9A264DDF3DC0F6AEFD9D375CFDF645D34024CD943C2277FEEF2998D8CA7B9` | 5,321,720 | 154,475 | `80CA54B2F704FB2416DFAACD580354022750160DFF5F799E2EA4F4EC495803DF` |
| Curved wall bay | `62B7B82FB449728BC8C54B8644FD0453F2010067ABEE267D9AB5DB9340BAF639` | 2,519,988 | 59,013 | `B55DC9BF7DC678BC40100C07F6CFD90197098EC9A5095533A9295A8A7DD30B06` |
| Rear portal | `0B20C327C3B0C5481CEB4BE39AB1DB47723304CBDAC841EF754550235471FE2B` | 4,253,332 | 113,869 | `AA272E02BF5AFFBF93767615BDA6BF07401EA794BF1BB97BF2F3AD380D7A77F5` |
| Ceiling ring | `1BF3FAA17E4DF9E49CEF923EC4A51DB7B18F37E75D403125B58E678E44552F35` | 2,083,764 | 20,077 | `44D9AFFA90D673830D52932CC2C67A8EE8EE0E646BF4CEE50BFB866DBA465937` |
| **Total** |  | **14,178,804** | **347,434** |  |

Processing used glTF Transform CLI 4.5.0. The platform, wall bay, and portal were welded, simplified to ratios `0.08`, `0.06`, and `0.06` with an error limit of `0.01`, then resized to a maximum texture dimension of 2048 px. The ceiling ring retained its original geometry and was resized to 2048 px. Geometry compression and KTX2 texture compression were intentionally not enabled, so the current Three.js `GLTFLoader` requires no Draco, Meshopt, or KTX2 decoder.

All four processed files pass glTF Validator with zero errors. They retain embedded Base Color and Normal textures; platform, wall bay, and portal also retain embedded Metallic/Roughness textures. Validator reports the inherited warning `MESH_PRIMITIVE_GENERATED_TANGENT_SPACE`; Three.js generates tangent space at runtime for these normal-mapped meshes.
