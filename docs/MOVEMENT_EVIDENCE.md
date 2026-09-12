# Movement evidence and current-model coverage

## Scope and safety

This is a bundled, evidence-backed anatomy-relationship catalog for the 14 real BodyMate neck/shoulder meshes. It identifies only **participating structures covered by the current model**. It does not claim a complete real-human muscle list, activation magnitude, EMG percentage, training effect, diagnosis, rehabilitation value, or treatment advice.

`MainContributor` and `Contributor` are qualitative participation labels supported by the cited anatomy descriptions. The product’s internal highlight weights are presentation-order tiers only; they are not biological measurements.

## Evidence references

### `ev.scapula.elevation`

- **Source:** NCBI Bookshelf / StatPearls, *Anatomy, Thorax, Scapula*
- **URL:** <https://www.ncbi.nlm.nih.gov/books/NBK538319/>
- **Note:** Its scapular-motion description names upper trapezius and levator scapulae for scapular elevation. This supports the model’s shoulder-girdle-elevation coverage, not an exhaustive movement analysis.

### `ev.neck.rotation-flexion`

- **Source:** OpenStax, *Anatomy and Physiology 2e*, “11.3 Axial Muscles of the Head, Neck, and Back”
- **URL:** <https://openstax.org/books/anatomy-and-physiology-2e/pages/11-3-axial-muscles-of-the-head-neck-and-back>
- **Note:** Table 11.5 describes unilateral SCM rotation to the opposite side, bilateral SCM flexion, and unilateral splenius capitis rotation to the same side. This supports only the mapped current-model structures.

## Production movement catalog

### `shoulder_girdle_elevation`

- **Chinese name:** 肩胛带上提 / 耸肩
- **English canonical name:** Shoulder Girdle Elevation
- **Aliases:** 耸肩, shrug, 肩膀往上提
- **Mapped BodyMate structures:** 左/右斜方肌上部 (`MainContributor`), 左/右肩胛提肌 (`Contributor`)
- **Evidence:** `ev.scapula.elevation`
- **Current-model coverage limitation:** The four listed meshes are only the current model’s evidence-backed coverage; they are not asserted to be all structures involved in a real shrug.

### `cervical_rotation_right`

- **Chinese name:** 颈部向右旋转 / 向右转头
- **English canonical name:** Right Cervical Rotation
- **Aliases:** 向右转头, 头转右边, rotate neck right
- **Mapped BodyMate structures:** 左侧胸锁乳突肌 (`MainContributor`), 右侧头夹肌 (`Contributor`)
- **Evidence:** `ev.neck.rotation-flexion`
- **Current-model coverage limitation:** This is a limited, evidence-backed view of mapped structures, not a complete cervical-rotation muscle inventory.

### `cervical_rotation_left`

- **Chinese name:** 颈部向左旋转 / 向左转头
- **English canonical name:** Left Cervical Rotation
- **Aliases:** 向左转头, 头转左边, rotate neck left
- **Mapped BodyMate structures:** 右侧胸锁乳突肌 (`MainContributor`), 左侧头夹肌 (`Contributor`)
- **Evidence:** `ev.neck.rotation-flexion`
- **Current-model coverage limitation:** This is a limited, evidence-backed view of mapped structures, not a complete cervical-rotation muscle inventory.

### `cervical_flexion`

- **Chinese name:** 颈部屈曲 / 低头
- **English canonical name:** Cervical Flexion
- **Aliases:** 低头, neck flexion
- **Mapped BodyMate structures:** 左/右胸锁乳突肌 (`MainContributor`)
- **Evidence:** `ev.neck.rotation-flexion`
- **Current-model coverage limitation:** The map intentionally represents only the bilateral SCM coverage in the current model and does not claim all flexors.

## Excluded from this release

`cervical_lateral_flexion_right` and `cervical_lateral_flexion_left` are not production mappings in Stage 5B. The available evidence supports broad multi-muscle participation but not the narrowly bounded, direction-specific current-model mapping needed here.
