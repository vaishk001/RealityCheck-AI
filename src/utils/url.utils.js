const { URL } = require('url');

function safeParseUrl(rawUrl) {
  try {
    return new URL(rawUrl);
  } catch (error) {
    return null;
  }
}

function isIpHost(hostname) {
  // IPv4 check; IPv6 is intentionally omitted for MVP readability.
  const ipv4Regex = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
  return ipv4Regex.test(hostname);
}

function countDots(input) {
  return (input.match(/\./g) || []).length;
}

module.exports = {
  safeParseUrl,
  isIpHost,
  countDots
};
