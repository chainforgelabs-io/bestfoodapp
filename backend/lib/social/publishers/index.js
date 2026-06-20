const instagramPublisher = require("./instagram");
const xPublisher = require("./x");

const publishers = {
  instagram: instagramPublisher,
  x: xPublisher,
};

function getPublisher(platform) {
  const publisher = publishers[platform];
  if (!publisher) {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  return publisher;
}

module.exports = { getPublisher, publishers };
