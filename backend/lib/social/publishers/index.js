const instagramPublisher = require("./instagram");
const xPublisher = require("./x");
const facebookPublisher = require("./facebook");

const publishers = {
  instagram: instagramPublisher,
  x: xPublisher,
  facebook: facebookPublisher,
};

function getPublisher(platform) {
  const publisher = publishers[platform];
  if (!publisher) {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  return publisher;
}

module.exports = { getPublisher, publishers };
