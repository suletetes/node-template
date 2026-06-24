const { throwAppError } = require('@app-core/errors');
const { appLogger } = require('@app-core/logger');
const CreatorCard = require('@app/repository/creator-card');
const CreatorCardMessages = require('@app/messages/creator-card');

async function getCard(serviceData, options = {}) {
  let response;

  try {
    const { slug, access_code } = serviceData;

    // 1. Find card by slug (not deleted)
    const card = await CreatorCard.findOne({
      query: { slug, deleted: null },
    });

    // Rule 1: NF01 - Card does not exist
    if (!card) {
      throwAppError(CreatorCardMessages.CARD_NOT_FOUND, 'NF01');
    }

    // Rule 2: NF02 - Card is draft
    if (card.status === 'draft') {
      throwAppError(CreatorCardMessages.CARD_IS_DRAFT, 'NF02');
    }

    // Rule 3: AC03 - Private card, no access_code supplied
    if (card.access_type === 'private' && !access_code) {
      throwAppError(CreatorCardMessages.ACCESS_CODE_NEEDED, 'AC03');
    }

    // Rule 4: AC04 - Private card, wrong access_code
    if (card.access_type === 'private' && access_code !== card.access_code) {
      throwAppError(CreatorCardMessages.INVALID_ACCESS_CODE, 'AC04');
    }

    // Success: serialize response WITHOUT access_code
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
      created: card.created,
      updated: card.updated,
      deleted: card.deleted || null,
    };
  } catch (error) {
    appLogger.errorX(error, 'get-card-error');
    throw error;
  }

  return response;
}

module.exports = getCard;
