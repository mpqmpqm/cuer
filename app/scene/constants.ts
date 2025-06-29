// Bone connection definitions for the humanoid figure
// Each array contains pairs of joint names that should be connected with bones
export const BONE_CONNECTIONS: Array<[string, string]> = [
  // Spine
  ["head", "chest"],
  ["chest", "sacrum"],

  // Arms
  ["chest", "rightShoulder"],
  ["chest", "leftShoulder"],
  ["rightShoulder", "rightHand"],
  ["leftShoulder", "leftHand"],

  // Torso to hips
  ["sacrum", "rightHip"],
  ["sacrum", "leftHip"],

  // Legs
  ["rightHip", "rightKnee"],
  ["leftHip", "leftKnee"],
  ["rightKnee", "rightFoot"],
  ["leftKnee", "leftFoot"],
];

// Joint names in the same order as defined in the main application
export const JOINT_NAMES = [
  "head",
  "chest",
  "rightShoulder",
  "leftShoulder",
  "rightHand",
  "leftHand",
  "sacrum",
  "rightHip",
  "leftHip",
  "rightKnee",
  "leftKnee",
  "leftFoot",
  "rightFoot",
];
