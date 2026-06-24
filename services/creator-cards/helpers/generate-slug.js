const { randomBytes } = require('@app-core/randomness');
const CreatorCard = require('@app/repository/creator-card');

/**
 * Generate a random 6-character alphanumeric suffix
 * @returns {string}
 */
function generateSuffix() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let suffix = '';
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) {
    const index = parseInt(bytes[i], 16) % chars.length;
    suffix += chars[index];
  }
  return suffix;
}

/**
 * Auto-generate a slug from a title following the assessment rules:
 * 1. Lowercase the title
 * 2. Replace whitespace with hyphens
 * 3. Remove characters that are not letters, numbers, hyphens, or underscores
 * 4. If result < 5 chars OR already taken, append -<random 6 alphanumeric>
 * @param {string} title
 * @returns {Promise<string>}
 */
async function generateSlug(title) {
  let slug = title.toLowerCase();
  slug = slug.replace(/\s+/g, '-');
  slug = slug.replace(/[^a-z0-9\-_]/g, '');

  let needsSuffix = false;

  if (slug.length < 5) {
    needsSuffix = true;
  } else {
    const existingCard = await CreatorCard.findOne({
      query: { slug, deleted: null },
    });
    if (existingCard) {
      needsSuffix = true;
    }
  }

  if (needsSuffix) {
    const suffix = generateSuffix();
    slug = `${slug}-${suffix}`;
  }

  return slug;
}

module.exports = generateSlug;
