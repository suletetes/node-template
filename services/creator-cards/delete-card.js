const validator = require('@app-core/validator');
const { throwAppError } = require('@app-core/errors');
const { appLogger } = require('@app-core/logger');
const CreatorCard = require('@app/repository/creator-card');
const CreatorCardMessages = require('@app/messages/creator-card');

const spec = `root {
  slug string<trim>
  creator_reference string<trim|length:20>
}`;

const parsedSpec = validator.parse(spec);

async function deleteCard(serviceData, options = {}) {
  let response;
  const data = validator.validate(serviceData, parsedSpec);

  try {
    // Find card by slug (not already deleted)
    const card = await CreatorCard.findOne({
      query: { slug: data.slug, deleted: null },
    });

    // NF01 - Card not found
    if (!card) {
      throwAppError(CreatorCardMessages.CARD_NOT_FOUND, 'NF01');
    }

    // Mark as deleted
    const now = Date.now();
    await CreatorCard.updateOne({
      query: { _id: card._id },
      updateValues: { deleted: now, updated: now },
    });

    // Return the deleted card in creation response format
    response = {
      id: card._id,
      title: card.title,
      description: card.description || null,
      slug: card.slug,
      creator_reference: card.creator_reference,
      links: card.links || [],
      service_rates: card.service_rates || null,
      status: card.status,
      access_type: card.access_type,
      access_code: card.access_code || null,
      created: card.created,
      updated: now,
      deleted: now,
    };
  } catch (error) {
    appLogger.errorX(error, 'delete-card-error');
    throw error;
  }

  return response;
}

module.exports = deleteCard;
