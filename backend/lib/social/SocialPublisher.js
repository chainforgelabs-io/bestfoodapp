/**
 * @typedef {Object} PublishInput
 * @property {string} imageUrl
 * @property {string} caption
 * @property {boolean} [linkInBody]
 */

/**
 * @typedef {Object} PublishResult
 * @property {string} postId
 * @property {string|null} permalink
 */

/**
 * @typedef {Object} SocialPublisher
 * @property {"instagram"|"x"} platform
 * @property {(input: PublishInput) => Promise<PublishResult>} publish
 */

module.exports = {};
