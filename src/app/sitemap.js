export default function sitemap() {
  const baseUrl = "https://africart-three.vercel.app";

  // List of your public main routes
  const routes = [
    '',
    '/login',
    '/register',
    '/forgot-password'
  ];

  const sitemapUrls = routes.map((route) => {
    return {
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      // The homepage updates more frequently than login/register pages
      changeFrequency: route === '' ? 'daily' : 'monthly',
      priority: route === '' ? 1 : 0.8,
    };
  });

  return sitemapUrls;
}
