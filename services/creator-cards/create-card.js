const validator = require('@app-core/validator');
const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const { appLogger } = require('@app-core/logger');
const CreatorCard = require('@app/repository/creator-card');
const CreatorCardMessages = require('@app/messages/creator-card');
const generateSlug = require('./helpers/generate-slug');

const spec = `root {
  title string<trim|minLength:3|maxLength:100>
  description? string<trim|maxLength:500>
  slug? string<trim|minLength:5|maxLength:50>
  creator_reference string<trim|length:20>
  links[]? {
    title string<trim|minLength:1|maxLength:100>
    url string<trim|maxLength:200>
  }
  service_rates? {
    currency string<uppercase|length:3>
    rates[] {
      name string<trim|minLength:3|maxLength:100>
      description string<trim|maxLength:250>
      amount number<min:1>
    }
  }
  status string(draft|published)
  access_type? string(public|private)
  access_code? string<trim>
}`;

const parsedSpec = validator.parse(spec);

async function createCard(serviceData, options = {}) {
  let response;
  const data = validator.validate(serviceData, parsedSpec);

  try {
    // Default access_type to public
    if (!data.access_type) {
      data.access_type = 'public';
    }

    // Business rule: AC01 - access_code required for private cards
    if (data.access_type === 'private' && !data.access_code) {
      throwAppError(CreatorCardMessages.ACCESS_CODE_REQUIRED, 'AC01');
    }

    // Business rule: AC05 - access_code must not be set on public cards
    if (data.access_type === 'public' && data.access_code) {
      throwAppError(CreatorCardMessages.ACCESS_CODE_NOT_ALLOWED, 'AC05');
    }

    // Validate access_code format: exactly 6 alphanumeric characters
    if (data.access_code) {
      const accessCodeRegex = /^[A-Za-z0-9]{6}$/;
      if (!accessCodeRegex.test(data.access_code)) {
        throwAppError(
          'access_code must be exactly 6 alphanumeric characters',
          ERROR_CODE.INVLDDATA
        );
      }
    }

    // Validate links URLs start with http:// or https://
    if (data.links && data.links.length > 0) {
      for (let i = 0; i < data.links.length; i++) {
        const link = data.links[i];
        if (!link.url.startsWith('http://') && !link.url.startsWith('https://')) {
          throwAppError('Link URL must start with http:// or https://', ERROR_CODE.INVLDDATA);
        }
      }
    }

    // Validate service_rates.currency enum
    if (data.service_rates) {
      const validCurrencies = ['NGN', 'USD', 'GBP', 'GHS'];
      if (!validCurrencies.includes(data.service_rates.currency)) {
        throwAppError('Currency must be one of NGN, USD, GBP, GHS', ERROR_CODE.INVLDDATA);
      }

      // Validate rates is non-empty
      if (!data.service_rates.rates || data.service_rates.rates.length === 0) {
        throwAppError(
          'rates must be a non-empty array when service_rates is provided',
          ERROR_CODE.INVLDDATA
        );
      }

      // Validate each rate amount is a positive integer
      for (let i = 0; i < data.service_rates.rates.length; i++) {
        const rate = data.service_rates.rates[i];
        if (!Number.isInteger(rate.amount) || rate.amount < 1) {
          throwAppError('Rate amount must be a positive integer (min 1)', ERROR_CODE.INVLDDATA);
        }
      }
    }

    // Handle slug
    let slug;
    if (data.slug) {
      // Validate slug format: letters, numbers, hyphens, underscores only
      const slugRegex = /^[A-Za-z0-9\-_]+$/;
      if (!slugRegex.test(data.slug)) {
        throwAppError(
          'Slug can only contain letters, numbers, hyphens, and underscores',
          ERROR_CODE.INVLDDATA
        );
      }

      // Check uniqueness for client-provided slug
      const existingCard = await CreatorCard.findOne({
        query: { slug: data.slug, deleted: null },
      });

      if (existingCard) {
        throwAppError(CreatorCardMessages.SLUG_TAKEN, 'SL02');
      }

      slug = data.slug;
    } else {
      // Auto-generate slug from title
      slug = await generateSlug(data.title);
    }

    // Prepare record data
    const now = Date.now();
    const recordData = {
      title: data.title,
      description: data.description || null,
      slug,
      creator_reference: data.creator_reference,
      links: data.links || [],
      service_rates: data.service_rates || null,
      status: data.status,
      access_type: data.access_type,
      access_code: data.access_type === 'private' ? data.access_code : null,
      created: now,
      updated: now,
      deleted: null,
    };

    const createdCard = await CreatorCard.create(recordData);

    // Serialize: expose _id as id
    response = {
      id: createdCard._id,
      title: createdCard.title,
      description: createdCard.description || null,
      slug: createdCard.slug,
      creator_reference: createdCard.creator_reference,
      links: createdCard.links || [],
      service_rates: createdCard.service_rates || null,
      status: createdCard.status,
      access_type: createdCard.access_type,
      access_code: createdCard.access_code || null,
      created: createdCard.created,
      updated: createdCard.updated,
      deleted: createdCard.deleted || null,
    };
  } catch (error) {
    appLogger.errorX(error, 'create-card-error');
    throw error;
  }

  return response;
}

module.exports = createCard;
