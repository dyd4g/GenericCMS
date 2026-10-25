// The CMS is an internal tool: never indexed, never framed by other sites.
module.exports = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: '/(.*)', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'same-origin' },
      { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
      { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
    ] }];
  },
};
