const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { PAGES, ORIGIN, SHARE_IMAGE_PATH, SHARE_IMAGE_ALT } = require('./sync-seo');

const ROOT_DIR = path.resolve(__dirname, '..');

function fetchUrl(url) {
  const client = url.startsWith('https') ? https : http;
  return new Promise((resolve, reject) => {
    const req = client.get(url, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks),
        });
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error(`Timeout fetching ${url}`)));
  });
}

async function loadSchemaOrgVocabulary(cachePath) {
  if (fs.existsSync(cachePath)) {
    return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  }
  const res = await fetchUrl('https://schema.org/version/latest/schemaorg-current-https.jsonld');
  if (res.status !== 200) {
    throw new Error(`Failed to fetch Schema.org vocabulary: HTTP ${res.status}`);
  }
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, res.body);
  return JSON.parse(res.body.toString('utf8'));
}

function buildSchemaIndex(vocab) {
  const classes = new Map();
  const propDomains = new Map();

  for (const node of vocab['@graph'] || []) {
    const id = node['@id'] || '';
    const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
    const shortName = id.replace(/^schema:|^https?:\/\/schema\.org\//, '');

    if (types.includes('rdfs:Class')) {
      const parentsRaw = node['rdfs:subClassOf'] || [];
      const parents = (Array.isArray(parentsRaw) ? parentsRaw : [parentsRaw])
        .map((p) => (p['@id'] || '').replace(/^schema:|^https?:\/\/schema\.org\//, ''))
        .filter(Boolean);
      classes.set(shortName, parents);
    }

    if (types.includes('rdf:Property')) {
      const domRaw = node['schema:domainIncludes'] || node['https://schema.org/domainIncludes'] || [];
      const doms = (Array.isArray(domRaw) ? domRaw : [domRaw])
        .map((d) => (d['@id'] || '').replace(/^schema:|^https?:\/\/schema\.org\//, ''))
        .filter(Boolean);
      propDomains.set(shortName, new Set(doms));
    }
  }

  function getAncestors(clsName, visited = new Set()) {
    if (visited.has(clsName)) return visited;
    visited.add(clsName);
    for (const parent of classes.get(clsName) || []) {
      getAncestors(parent, visited);
    }
    return visited;
  }

  return { classes, propDomains, getAncestors };
}

function validateJsonLdAgainstSchemaOrg(jsonLdObj, schemaIndex, pageLabel) {
  const errors = [];
  if (jsonLdObj['@context'] !== 'https://schema.org') {
    errors.push(`${pageLabel}: @context must be https://schema.org`);
  }
  const graph = jsonLdObj['@graph'];
  if (!Array.isArray(graph) || !graph.length) {
    errors.push(`${pageLabel}: @graph missing or empty`);
    return errors;
  }

  const definedIds = new Set();
  for (const entity of graph) {
    if (entity['@id']) {
      if (definedIds.has(entity['@id'])) {
        errors.push(`${pageLabel}: duplicate @id ${entity['@id']}`);
      }
      definedIds.add(entity['@id']);
    }
  }

  function checkNode(node, pathCtx) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach((item, idx) => checkNode(item, `${pathCtx}[${idx}]`));
      return;
    }

    const keys = Object.keys(node);
    // Pure @id reference node
    if (keys.length === 1 && keys[0] === '@id') {
      if (!definedIds.has(node['@id'])) {
        errors.push(`${pageLabel} (${pathCtx}): unresolved @id reference ${node['@id']}`);
      }
      return;
    }

    const typeName = node['@type'];
    if (!typeName) {
      errors.push(`${pageLabel} (${pathCtx}): object missing @type`);
      return;
    }
    if (!schemaIndex.classes.has(typeName)) {
      errors.push(`${pageLabel} (${pathCtx}): unknown Schema.org @type "${typeName}"`);
      return;
    }

    const ancestors = schemaIndex.getAncestors(typeName);
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith('@')) continue;
      const validDomains = schemaIndex.propDomains.get(k);
      if (!validDomains) {
        errors.push(`${pageLabel} (${pathCtx} ${typeName}): unknown Schema.org property "${k}"`);
      } else {
        let allowed = false;
        for (const anc of ancestors) {
          if (validDomains.has(anc)) {
            allowed = true;
            break;
          }
        }
        if (!allowed) {
          errors.push(
            `${pageLabel} (${pathCtx} ${typeName}): property "${k}" not valid on ${typeName}`
          );
        }
      }
      if (v && typeof v === 'object') {
        checkNode(v, `${pathCtx}.${k}`);
      }
    }
  }

  graph.forEach((entity, idx) => checkNode(entity, `@graph[${idx}]`));

  // Google Rich Results checks
  const org = graph.find((n) => n['@type'] === 'Organization');
  if (!org || !org.name || !org.url || !org.logo || !org.logo.url) {
    errors.push(`${pageLabel}: Organization missing Google Logo rich-result required fields`);
  }
  if (org && Array.isArray(org.sameAs)) {
    for (const s of org.sameAs) {
      if (/^https?:\/\/(www\.)?(facebook|instagram)\.com\/?$/i.test(s)) {
        errors.push(`${pageLabel}: generic social homepage found in Organization.sameAs: ${s}`);
      }
    }
  }

  const bc = graph.find((n) => n['@type'] === 'BreadcrumbList');
  if (bc) {
    if (!Array.isArray(bc.itemListElement) || bc.itemListElement.length < 2) {
      errors.push(`${pageLabel}: BreadcrumbList must contain at least 2 ListItems`);
    } else {
      bc.itemListElement.forEach((li, i) => {
        if (li['@type'] !== 'ListItem' || li.position !== i + 1 || !li.name || !li.item) {
          errors.push(`${pageLabel}: invalid BreadcrumbList ListItem at index ${i}`);
        }
      });
    }
  }

  return errors;
}

function unescapeHtml(str) {
  return String(str)
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function validateHtmlDocument(html, page, schemaIndex) {
  const errs = [];
  const label = page.route;
  const expectedCanonical = `${ORIGIN}${page.route}`;
  const expectedImage = `${ORIGIN}${SHARE_IMAGE_PATH}`;

  if (!/<html\s+lang="en-GB"\s*>/i.test(html)) {
    errs.push(`${label}: missing <html lang="en-GB">`);
  }
  if (/meta\s+name="robots"\s+content="[^"]*noindex/i.test(html)) {
    errs.push(`${label}: unexpected noindex meta tag`);
  }

  const titles = [...html.matchAll(/<title>([\s\S]*?)<\/title>/gi)];
  if (titles.length !== 1 || unescapeHtml(titles[0][1].trim()) !== page.title) {
    errs.push(`${label}: title mismatch or count=${titles.length}`);
  }

  const descs = [...html.matchAll(/<meta\s+name="description"\s+content="([^"]*)"\s*\/?>/gi)];
  if (descs.length !== 1 || unescapeHtml(descs[0][1]) !== page.description) {
    errs.push(`${label}: meta description mismatch or count=${descs.length}`);
  }

  const canonicals = [...html.matchAll(/<link\s+rel="canonical"\s+href="([^"]*)"\s*\/?>/gi)];
  if (canonicals.length !== 1 || unescapeHtml(canonicals[0][1]) !== expectedCanonical) {
    errs.push(`${label}: canonical mismatch or count=${canonicals.length}`);
  }

  const requiredRootLinks = [
    '/favicon.svg',
    '/favicon.ico',
    '/favicon-16x16.png',
    '/favicon-32x32.png',
    '/favicon-48x48.png',
    '/apple-touch-icon.png',
    '/site.webmanifest',
  ];
  for (const href of requiredRootLinks) {
    if (!html.includes(`href="${href}"`)) {
      errs.push(`${label}: missing root-relative ${href}`);
    }
  }

  const getMeta = (attr, key) => {
    const m = html.match(new RegExp(`<meta\\s+${attr}="${key}"\\s+content="([^"]*)"\\s*\\/?>`, 'i'));
    return m ? unescapeHtml(m[1]) : null;
  };

  if (getMeta('property', 'og:type') !== 'website') errs.push(`${label}: og:type !== website`);
  if (getMeta('property', 'og:site_name') !== 'Virtually Kelsey') errs.push(`${label}: og:site_name`);
  if (getMeta('property', 'og:locale') !== 'en_GB') errs.push(`${label}: og:locale !== en_GB`);
  if (getMeta('property', 'og:url') !== expectedCanonical) errs.push(`${label}: og:url !== canonical`);
  if (getMeta('property', 'og:title') !== page.title) errs.push(`${label}: og:title mismatch`);
  if (getMeta('property', 'og:description') !== page.description) errs.push(`${label}: og:description mismatch`);
  if (getMeta('property', 'og:image') !== expectedImage) errs.push(`${label}: og:image mismatch`);
  if (getMeta('property', 'og:image:alt') !== SHARE_IMAGE_ALT) errs.push(`${label}: og:image:alt mismatch`);
  if (getMeta('name', 'twitter:card') !== 'summary_large_image') errs.push(`${label}: twitter:card`);
  if (getMeta('name', 'twitter:title') !== page.title) errs.push(`${label}: twitter:title`);
  if (getMeta('name', 'twitter:description') !== page.description) errs.push(`${label}: twitter:description`);
  if (getMeta('name', 'twitter:image') !== expectedImage) errs.push(`${label}: twitter:image`);
  if (getMeta('name', 'twitter:image:alt') !== SHARE_IMAGE_ALT) errs.push(`${label}: twitter:image:alt`);

  // Social link checks
  if (/href="https:\/\/www\.facebook\.com\/?"/i.test(html)) {
    errs.push(`${label}: generic Facebook homepage link still present`);
  }
  if (/href="https:\/\/www\.instagram\.com\/?"/i.test(html)) {
    errs.push(`${label}: generic Instagram homepage link still present`);
  }
  if (!html.includes('href="https://www.instagram.com/virtuallykelseyj/"')) {
    errs.push(`${label}: missing verified Instagram profile link`);
  }

  // JSON-LD check
  const ldMatches = [...html.matchAll(/<script\s+type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/gi)];
  if (ldMatches.length !== 1) {
    errs.push(`${label}: expected 1 JSON-LD script, found ${ldMatches.length}`);
  } else {
    try {
      const parsed = JSON.parse(ldMatches[0][1]);
      errs.push(...validateJsonLdAgainstSchemaOrg(parsed, schemaIndex, label));

      const graph = parsed['@graph'] || [];
      const types = graph.map((n) => n['@type']);
      if (!types.includes('Organization')) errs.push(`${label}: missing Organization`);
      if (!types.includes('Person')) errs.push(`${label}: missing Person`);
      if (!types.includes('WebSite')) errs.push(`${label}: missing WebSite`);
      if (!types.includes(page.pageType)) errs.push(`${label}: missing ${page.pageType}`);
      if (page.service && !types.includes('Service')) errs.push(`${label}: missing Service`);
      if (page.breadcrumbName && !types.includes('BreadcrumbList')) {
        errs.push(`${label}: missing BreadcrumbList`);
      }
      if (!page.breadcrumbName && types.includes('BreadcrumbList')) {
        errs.push(`${label}: unexpected BreadcrumbList on home`);
      }
    } catch (e) {
      errs.push(`${label}: invalid JSON-LD syntax: ${e.message}`);
    }
  }

  return { errs, canonical: expectedCanonical };
}

async function main() {
  const isLive = process.argv.includes('--live');
  const cachePath = '/tmp/schemaorg-current-https.jsonld';
  const vocab = await loadSchemaOrgVocabulary(cachePath);
  const schemaIndex = buildSchemaIndex(vocab);

  const allErrors = [];
  const canonicalSet = new Set();
  const titleSet = new Set();
  const descSet = new Set();

  for (const page of PAGES) {
    if (titleSet.has(page.title)) allErrors.push(`Duplicate title: ${page.title}`);
    titleSet.add(page.title);
    if (descSet.has(page.description)) allErrors.push(`Duplicate description: ${page.description}`);
    descSet.add(page.description);

    let html;
    if (isLive) {
      const url = `${ORIGIN}${page.route}`;
      const res = await fetchUrl(url);
      if (res.status !== 200) {
        allErrors.push(`LIVE ${url}: expected HTTP 200, got ${res.status}`);
        continue;
      }
      const xRobots = res.headers['x-robots-tag'];
      if (xRobots && /noindex/i.test(String(xRobots))) {
        allErrors.push(`LIVE ${url}: unexpected x-robots-tag: ${xRobots}`);
      }
      html = res.body.toString('utf8');
    } else {
      html = fs.readFileSync(path.join(ROOT_DIR, page.file), 'utf8');
    }

    const { errs, canonical } = validateHtmlDocument(html, page, schemaIndex);
    allErrors.push(...errs);
    canonicalSet.add(canonical);
  }

  // Validate robots.txt & sitemap.xml
  const robotsTxt = isLive
    ? (await fetchUrl(`${ORIGIN}/robots.txt`)).body.toString('utf8')
    : fs.readFileSync(path.join(ROOT_DIR, 'robots.txt'), 'utf8');

  if (!robotsTxt.includes('User-agent: *\nAllow: /') || !robotsTxt.includes(`Sitemap: ${ORIGIN}/sitemap.xml`)) {
    allErrors.push('robots.txt content mismatch');
  }

  const sitemapXml = isLive
    ? (await fetchUrl(`${ORIGIN}/sitemap.xml`)).body.toString('utf8')
    : fs.readFileSync(path.join(ROOT_DIR, 'sitemap.xml'), 'utf8');

  const sitemapLocs = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => unescapeHtml(m[1]));
  if (sitemapLocs.length !== PAGES.length) {
    allErrors.push(`sitemap.xml expected ${PAGES.length} URLs, found ${sitemapLocs.length}`);
  }
  for (const loc of sitemapLocs) {
    if (!canonicalSet.has(loc)) {
      allErrors.push(`sitemap.xml URL does not match any page canonical: ${loc}`);
    }
  }
  for (const can of canonicalSet) {
    if (!sitemapLocs.includes(can)) {
      allErrors.push(`Canonical missing from sitemap.xml: ${can}`);
    }
  }

  if (isLive) {
    const assetsToCheck = [
      '/robots.txt',
      '/sitemap.xml',
      '/favicon.svg',
      '/favicon.ico',
      '/favicon-16x16.png',
      '/favicon-32x32.png',
      '/favicon-48x48.png',
      '/apple-touch-icon.png',
      '/site.webmanifest',
      SHARE_IMAGE_PATH,
    ];
    for (const asset of assetsToCheck) {
      const res = await fetchUrl(`${ORIGIN}${asset}`);
      if (res.status !== 200) {
        allErrors.push(`LIVE asset ${asset}: expected HTTP 200, got ${res.status}`);
      }
    }
    const missingRes = await fetchUrl(`${ORIGIN}/non-existent-seo-404-verify/`);
    if (missingRes.status !== 404) {
      allErrors.push(`LIVE missing page expected HTTP 404, got ${missingRes.status}`);
    }
  }

  if (allErrors.length) {
    console.error('SEO Validation FAILED:');
    allErrors.forEach((e) => console.error(' -', e));
    process.exit(1);
  }

  console.log(
    `PASS (${isLive ? 'LIVE PRODUCTION' : 'LOCAL BUILD'}): All ${PAGES.length} pages, titles, descriptions, canonicals, Open Graph/Twitter tags, Schema.org vLatest JSON-LD @graph entities, robots.txt, and sitemap.xml validated with 0 errors!`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

