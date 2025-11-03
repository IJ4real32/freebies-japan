// ✅ FILE: src/utils/sanitize.js
/**
 * sanitizeText - safely filters input without removing normal spaces
 * Keeps letters, numbers, punctuation, and single/double spaces.
 * Prevents unwanted symbols/emojis while allowing natural typing.
 */
export const sanitizeText = (val = "") => {
  if (typeof val !== "string") return "";
  return val
    .replace(/[^\w\s.,!()&'":;/-]/g, "") // allow letters, digits, punctuation, and spaces
    .replace(/\s{3,}/g, "  "); // collapse 3+ spaces to max two
};
