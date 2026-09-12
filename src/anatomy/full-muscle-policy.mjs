const excludedTerms = Object.freeze([
  'penis', 'penile', 'testis', 'testicular', 'scrot', 'cavernos',
  'ischiocavernos', 'bulbospongios', 'urethr', 'prostat', 'perineal',
  'cremaster', 'spermatic', 'labium', 'clitor', 'vagin',
]);

export const fullMuscleExclusionTerms = excludedTerms;

export function fullMuscleExclusionReason(name) {
  const normalized = String(name || '').toLocaleLowerCase();
  const term = excludedTerms.find((candidate) => normalized.includes(candidate));
  return term ? `Excluded by genital-region policy: ${term}` : null;
}

export function includesFullBodyMuscle(part) {
  return part?.system === 'muscular' && !fullMuscleExclusionReason(part.name);
}

export function bodymateMuscleId(part) {
  return `bodymate.muscle.${String(part.id).toLocaleLowerCase()}`;
}
