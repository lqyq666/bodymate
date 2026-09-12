# BodyMate domain language

BodyMate separates anatomy and movement meaning from 3D presentation so that educational claims remain bounded and testable.

## Anatomy

**Structure**:
A canonical anatomical item that can be selected or included in a bounded relationship.
_Avoid_: Mesh, body part

**StructureSet**:
An ordered group of canonical Structures with one focus and explicit highlight roles.
_Avoid_: Selection group, muscle list

**Participation Profile**:
A qualitative mapping from a Motion Definition to broad muscle groups and relative display emphasis; it is not measured activation or force.
_Avoid_: Activation model, force profile

## Motion

**Motion Definition**:
The canonical identity, aliases, duration, parameter contract, presets, and Participation Profile for one supported action.
_Avoid_: Clip, exercise config

**Motion Session**:
The single accepted runtime state containing the current Motion Definition, phase, pause state, speed, and normalized parameter values.
_Avoid_: Player state, animation state

**Pose Intent**:
A deterministic, renderer-independent description of the joint targets for one Motion Definition at one phase.
_Avoid_: Animation frame, Three.js pose

## Boundary

**Presentation**:
The application of accepted domain output to GLB geometry, bones, materials, camera, labels, and input hit testing.
_Avoid_: Domain logic, business logic
