const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(ROOT_DIR, 'seo.config.json');

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const ORIGIN = String(config.siteOrigin || '').replace(/\/+$/, '');
if (!ORIGIN || !/^https?:\/\//.test(ORIGIN)) {
  throw new Error(`Invalid siteOrigin in seo.config.json: ${config.siteOrigin}`);
}

const CSS_VERSION = '40';
const SHARE_IMAGE_PATH = '/assets/images/og-image.png';
const SHARE_IMAGE_WIDTH = 1200;
const SHARE_IMAGE_HEIGHT = 630;
const SHARE_IMAGE_ALT =
  'Virtually Kelsey — Kelsey John smiling with her laptop alongside the headline Life gets busy. I’ll handle the details.';

const BUSINESS = {
  name: 'Virtually Kelsey',
  founderName: 'Kelsey John',
  email: 'kelseyjohn3@gmail.com',
  instagram: 'https://www.instagram.com/virtuallykelseyj/',
  services: [
    'Travel and event coordination',
    'Diary and appointment management',
    'Lifestyle concierge',
    'Client and customer care',
    'Inbox management',
    'Social media support',
  ],
};

const PAGES = [
  {
    file: 'index.html',
    route: '/',
    cssHref: `styles.css?v=${CSS_VERSION}`,
    title: 'Virtual PA & Lifestyle Concierge in Essex | Virtually Kelsey',
    description:
      'Essex-based virtual PA and lifestyle concierge for busy professionals, businesses and families across the UK. Free up your time with Kelsey’s support.',
    pageType: 'WebPage',
  },
  {
    file: 'about/index.html',
    route: '/about/',
    cssHref: `../styles.css?v=${CSS_VERSION}`,
    title: 'About Kelsey John | Essex Virtual PA | Virtually Kelsey',
    description:
      'Meet Kelsey John, an Essex-based virtual PA with over eleven years supporting senior leaders in luxury fashion. Personal support for work and home.',
    pageType: 'AboutPage',
    breadcrumbName: 'About Kelsey',
  },
  {
    file: 'contact/index.html',
    route: '/contact/',
    cssHref: `../styles.css?v=${CSS_VERSION}`,
    title: 'Contact Kelsey | Book a Free Call | Virtually Kelsey',
    description:
      'Book a free 30-minute introductory call with Kelsey or send a message about the support you need. Based in Essex, helping clients across the UK.',
    pageType: 'ContactPage',
    breadcrumbName: 'Contact',
  },
  {
    file: 'services/travel-and-events/index.html',
    route: '/services/travel-and-events/',
    cssHref: `../../styles.css?v=${CSS_VERSION}`,
    title: 'Travel & Event Coordination | Virtually Kelsey',
    description:
      'Support with business travel, family getaways and events. Kelsey helps coordinate flights, hotels, venues and itineraries for clients across the UK.',
    pageType: 'WebPage',
    breadcrumbName: 'Travel & Events',
    service: {
      name: 'Travel & Event Coordination',
      serviceType: 'Travel and event coordination',
      description:
        'Support with business travel, family getaways and events. Kelsey helps coordinate flights, hotels, venues and itineraries for clients across the UK.',
    },
  },
  {
    file: 'services/diary-and-appointments/index.html',
    route: '/services/diary-and-appointments/',
    cssHref: `../../styles.css?v=${CSS_VERSION}`,
    title: 'Diary & Appointment Management | Virtually Kelsey',
    description:
      'Take diary management off your list. Kelsey arranges meetings, handles rescheduling and keeps appointments and deadlines organised around your week.',
    pageType: 'WebPage',
    breadcrumbName: 'Diary & Appointments',
    service: {
      name: 'Diary & Appointment Management',
      serviceType: 'Diary and appointment management',
      description:
        'Take diary management off your list. Kelsey arranges meetings, handles rescheduling and keeps appointments and deadlines organised around your week.',
    },
  },
  {
    file: 'services/lifestyle-concierge/index.html',
    route: '/services/lifestyle-concierge/',
    cssHref: `../../styles.css?v=${CSS_VERSION}`,
    title: 'Lifestyle Concierge in Essex & Across the UK | Virtually Kelsey',
    description:
      'Personal support with gifting, household bookings, quotes and everyday life admin. Based in Essex, Kelsey helps busy people and families across the UK.',
    pageType: 'WebPage',
    breadcrumbName: 'Lifestyle Concierge',
    service: {
      name: 'Lifestyle Concierge',
      serviceType: 'Lifestyle concierge',
      description:
        'Personal support with gifting, household bookings, quotes and everyday life admin. Based in Essex, Kelsey helps busy people and families across the UK.',
    },
  },
  {
    file: 'services/client-and-customer-care/index.html',
    route: '/services/client-and-customer-care/',
    cssHref: `../../styles.css?v=${CSS_VERSION}`,
    title: 'Client & Customer Support Services | Virtually Kelsey',
    description:
      'Reliable support with customer enquiries, quote follow-ups and client communication. Kelsey responds in your tone of voice and keeps customers updated.',
    pageType: 'WebPage',
    breadcrumbName: 'Client & Customer Care',
    service: {
      name: 'Client & Customer Care',
      serviceType: 'Client and customer care',
      description:
        'Reliable support with customer enquiries, quote follow-ups and client communication. Kelsey responds in your tone of voice and keeps customers updated.',
    },
  },
  {
    file: 'services/inbox-management/index.html',
    route: '/services/inbox-management/',
    cssHref: `../../styles.css?v=${CSS_VERSION}`,
    title: 'Inbox & Email Management Services | Virtually Kelsey',
    description:
      'Let Kelsey organise your inbox, handle routine replies and flag important messages. Personal email support for busy professionals and business owners.',
    pageType: 'WebPage',
    breadcrumbName: 'Inbox Management',
    service: {
      name: 'Inbox Management',
      serviceType: 'Inbox management',
      description:
        'Let Kelsey organise your inbox, handle routine replies and flag important messages. Personal email support for busy professionals and business owners.',
    },
  },
  {
    file: 'services/social-media-support/index.html',
    route: '/services/social-media-support/',
    cssHref: `../../styles.css?v=${CSS_VERSION}`,
    title: 'Social Media Admin & Support | Virtually Kelsey',
    description:
      'Support with scheduling prepared posts, outreach, DMs and customer questions. Keep your social accounts active with help from Virtually Kelsey.',
    pageType: 'WebPage',
    breadcrumbName: 'Social Media Support',
    service: {
      name: 'Social Media Support',
      serviceType: 'Social media support',
      description:
        'Support with scheduling prepared posts, outreach, DMs and customer questions. Keep your social accounts active with help from Virtually Kelsey.',
    },
  },
  {
    file: 'privacy-policy/index.html',
    route: '/privacy-policy/',
    cssHref: `../styles.css?v=${CSS_VERSION}`,
    title: 'Privacy Policy | Virtually Kelsey',
    description:
      'Read how Virtually Kelsey collects, uses and protects personal information when you contact Kelsey or use the website.',
    pageType: 'WebPage',
    breadcrumbName: 'Privacy Policy',
  },
];

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildJsonLdGraph(page) {
  const canonicalUrl = `${ORIGIN}${page.route}`;
  const shareImageUrl = `${ORIGIN}${SHARE_IMAGE_PATH}`;
  const orgId = `${ORIGIN}/#organization`;
  const personId = `${ORIGIN}/#kelsey-john`;
  const websiteId = `${ORIGIN}/#website`;
  const logoId = `${ORIGIN}/#logo`;
  const primaryImageId = `${ORIGIN}/#primaryimage`;
  const webpageId = `${canonicalUrl}#webpage`;
  const breadcrumbId = `${canonicalUrl}#breadcrumb`;
  const serviceId = `${canonicalUrl}#service`;

  const essexPlace = {
    '@type': 'Place',
    name: 'Essex, United Kingdom',
    address: {
      '@type': 'PostalAddress',
      addressRegion: 'Essex',
      addressCountry: 'GB',
    },
  };

  const ukArea = [
    { '@type': 'AdministrativeArea', name: 'Essex' },
    { '@type': 'Country', name: 'United Kingdom' },
  ];

  const organization = {
    '@type': 'Organization',
    '@id': orgId,
    name: BUSINESS.name,
    url: `${ORIGIN}/`,
    description:
      'Virtual PA and lifestyle concierge support based in Essex, helping busy professionals, small business owners and families across the United Kingdom.',
    email: BUSINESS.email,
    logo: {
      '@type': 'ImageObject',
      '@id': logoId,
      url: `${ORIGIN}/assets/images/virtually-kelsey-logo.png`,
      contentUrl: `${ORIGIN}/assets/images/virtually-kelsey-logo.png`,
      width: 2048,
      height: 1715,
      caption: BUSINESS.name,
    },
    image: { '@id': primaryImageId },
    founder: { '@id': personId },
    location: essexPlace,
    areaServed: ukArea,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer enquiries',
      email: BUSINESS.email,
      areaServed: 'GB',
      availableLanguage: ['en-GB'],
    },
    sameAs: [BUSINESS.instagram],
    knowsAbout: BUSINESS.services,
  };

  const person = {
    '@type': 'Person',
    '@id': personId,
    name: BUSINESS.founderName,
    jobTitle: 'Virtual PA & Lifestyle Concierge',
    description:
      'Essex-based virtual PA and lifestyle concierge with over eleven years supporting senior leaders in luxury fashion.',
    url: `${ORIGIN}/about/`,
    image: `${ORIGIN}/assets/images/kelsey-about-hero.webp`,
    email: BUSINESS.email,
    worksFor: { '@id': orgId },
    workLocation: essexPlace,
    sameAs: [BUSINESS.instagram],
    knowsAbout: BUSINESS.services,
  };

  const website = {
    '@type': 'WebSite',
    '@id': websiteId,
    url: `${ORIGIN}/`,
    name: BUSINESS.name,
    description:
      'Essex-based virtual PA and lifestyle concierge for busy professionals, small business owners and families across the United Kingdom.',
    publisher: { '@id': orgId },
    inLanguage: 'en-GB',
  };

  const primaryImage = {
    '@type': 'ImageObject',
    '@id': primaryImageId,
    url: shareImageUrl,
    contentUrl: shareImageUrl,
    width: SHARE_IMAGE_WIDTH,
    height: SHARE_IMAGE_HEIGHT,
    caption: SHARE_IMAGE_ALT,
    inLanguage: 'en-GB',
  };

  const webpage = {
    '@type': page.pageType,
    '@id': webpageId,
    url: canonicalUrl,
    name: page.title,
    description: page.description,
    isPartOf: { '@id': websiteId },
    primaryImageOfPage: { '@id': primaryImageId },
    inLanguage: 'en-GB',
  };

  if (page.route === '/') {
    webpage.about = { '@id': orgId };
    webpage.mainEntity = { '@id': orgId };
  } else if (page.pageType === 'AboutPage') {
    webpage.about = [{ '@id': personId }, { '@id': orgId }];
    webpage.mainEntity = { '@id': personId };
  } else if (page.pageType === 'ContactPage') {
    webpage.about = { '@id': orgId };
    webpage.mainEntity = { '@id': orgId };
  } else if (page.service) {
    webpage.about = { '@id': serviceId };
    webpage.mainEntity = { '@id': serviceId };
  } else {
    webpage.about = { '@id': orgId };
  }

  if (page.breadcrumbName) {
    webpage.breadcrumb = { '@id': breadcrumbId };
  }

  const graph = [organization, person, website, primaryImage, webpage];

  if (page.service) {
    graph.push({
      '@type': 'Service',
      '@id': serviceId,
      name: page.service.name,
      serviceType: page.service.serviceType,
      description: page.service.description,
      url: canonicalUrl,
      provider: { '@id': orgId },
      areaServed: ukArea,
      audience: {
        '@type': 'Audience',
        audienceType: 'Busy professionals, small business owners and families',
      },
    });
  }

  if (page.breadcrumbName) {
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': breadcrumbId,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: `${ORIGIN}/`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: page.breadcrumbName,
          item: canonicalUrl,
        },
      ],
    });
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}

function buildHeadHtml(page) {
  const canonicalUrl = `${ORIGIN}${page.route}`;
  const shareImageUrl = `${ORIGIN}${SHARE_IMAGE_PATH}`;
  const jsonLd = JSON.stringify(buildJsonLdGraph(page), null, 2)
    .split('\n')
    .map((line, i) => (i === 0 ? line : `  ${line}`))
    .join('\n');

  return `<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(page.title)}</title>
  <meta name="description" content="${escapeHtml(page.description)}" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
  <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${escapeHtml(BUSINESS.name)}" />
  <meta property="og:locale" content="en_GB" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:title" content="${escapeHtml(page.title)}" />
  <meta property="og:description" content="${escapeHtml(page.description)}" />
  <meta property="og:image" content="${escapeHtml(shareImageUrl)}" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content="${SHARE_IMAGE_WIDTH}" />
  <meta property="og:image:height" content="${SHARE_IMAGE_HEIGHT}" />
  <meta property="og:image:alt" content="${escapeHtml(SHARE_IMAGE_ALT)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(page.title)}" />
  <meta name="twitter:description" content="${escapeHtml(page.description)}" />
  <meta name="twitter:image" content="${escapeHtml(shareImageUrl)}" />
  <meta name="twitter:image:alt" content="${escapeHtml(SHARE_IMAGE_ALT)}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="${escapeHtml(page.cssHref)}" />
  <script type="application/ld+json">
  ${jsonLd}
  </script>
</head>`;
}

function transformPageHtml(rawHtml, page) {
  let html = rawHtml.replace(/<html\s+lang="[^"]*"\s*>/i, '<html lang="en-GB">');
  const headRegex = /<head>[\s\S]*?<\/head>/i;
  if (!headRegex.test(html)) {
    throw new Error(`Missing <head> in ${page.file}`);
  }
  html = html.replace(headRegex, buildHeadHtml(page));

  // Ensure verified Instagram profile URL on all pages
  html = html.replace(
    /href="https:\/\/www\.instagram\.com\/?"/g,
    `href="${BUSINESS.instagram}"`
  );

  // Remove generic Facebook homepage link block if present
  html = html.replace(
    /\s*<!--\s*Facebook\s*-->\s*<a\s+href="https:\/\/www\.facebook\.com\/?"[\s\S]*?<\/a>/g,
    ''
  );
  html = html.replace(
    /\s*<a\s+href="https:\/\/www\.facebook\.com\/?"[\s\S]*?<\/a>/g,
    ''
  );

  // Ensure homepage privacy-policy link uses trailing slash
  html = html.replace(
    /href="\.\/privacy-policy"/g,
    'href="/privacy-policy/"'
  );

  return html;
}

function getLastModDate(relFile) {
  const fullPath = path.join(ROOT_DIR, relFile);
  try {
    const stat = fs.statSync(fullPath);
    if (stat && stat.mtime) {
      return stat.mtime.toISOString().slice(0, 10);
    }
  } catch (_) {}
  try {
    const gitDate = execFileSync(
      'git',
      ['log', '-1', '--format=%cs', '--', relFile],
      { cwd: ROOT_DIR, encoding: 'utf8' }
    ).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(gitDate)) return gitDate;
  } catch (_) {}
  return null;
}

function buildRobotsTxt() {
  return `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`;
}

function buildSitemapXml() {
  const entries = PAGES.map((page) => {
    const loc = `${ORIGIN}${page.route}`;
    const lastmod = getLastModDate(page.file);
    const lastmodTag = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : '';
    return `  <url>\n    <loc>${escapeHtml(loc)}</loc>${lastmodTag}\n  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

function writeIfChanged(fullPath, content) {
  const exists = fs.existsSync(fullPath);
  const prev = exists ? fs.readFileSync(fullPath, 'utf8') : null;
  if (prev !== content) {
    fs.writeFileSync(fullPath, content, 'utf8');
    return true;
  }
  return false;
}

function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--print-head' && args[1]) {
    const page = PAGES.find((p) => p.file === args[1]);
    if (!page) throw new Error(`Unknown page: ${args[1]}`);
    process.stdout.write(buildHeadHtml(page));
    return;
  }

  let updatedCount = 0;
  for (const page of PAGES) {
    const fullPath = path.join(ROOT_DIR, page.file);
    const raw = fs.readFileSync(fullPath, 'utf8');
    const next = transformPageHtml(raw, page);
    if (writeIfChanged(fullPath, next)) {
      updatedCount += 1;
      console.log(`Updated ${page.file}`);
    }
  }

  if (writeIfChanged(path.join(ROOT_DIR, 'robots.txt'), buildRobotsTxt())) {
    updatedCount += 1;
    console.log('Updated robots.txt');
  }

  if (writeIfChanged(path.join(ROOT_DIR, 'sitemap.xml'), buildSitemapXml())) {
    updatedCount += 1;
    console.log('Updated sitemap.xml');
  }

  console.log(`SEO sync complete (${updatedCount} file(s) changed, origin=${ORIGIN}).`);
}

if (require.main === module) {
  main();
}

module.exports = { PAGES, ORIGIN, BUSINESS, SHARE_IMAGE_PATH, SHARE_IMAGE_ALT };
