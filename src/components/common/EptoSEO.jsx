/**
 * EptoSEO — Shared SEO component for all Eptomart sub-apps
 * Usage: <EptoSEO app="koyambedu" page="home" />
 *        <EptoSEO app="eptofresh" title="Custom Title" description="..." />
 *        <EptoSEO app="main" page="product" title={product.name} image={product.image} jsonLd={productSchema} />
 */
import { Helmet } from 'react-helmet-async';

const BASE_URL = 'https://www.eptomart.com';
const DEFAULT_IMAGE = `${BASE_URL}/icons/icon-512x512.png`;

// ─── Per-sub-app default metadata ───────────────────────────────────────────
const APP_CONFIG = {
  main: {
    siteName:    'Eptomart',
    themeColor:  '#0B1729',
    locale:      'en_IN',
    twitterSite: '@eptomart',
    pages: {
      home: {
        title:       'Eptomart — Shop Everything Online | Fast Delivery in Chennai',
        description: 'India's fast, affordable online shopping destination. Electronics, fashion, groceries and more — delivered to your door.',
        canonical:   `${BASE_URL}/`,
        keywords:    'online shopping, buy online India, electronics, fashion, groceries, Chennai delivery',
        image:       DEFAULT_IMAGE,
        jsonLd: {
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'WebSite',
              '@id':   `${BASE_URL}/#website`,
              url:     `${BASE_URL}/`,
              name:    'Eptomart',
              description: 'India's fast, affordable online shopping destination.',
              potentialAction: {
                '@type':       'SearchAction',
                target:        { '@type': 'EntryPoint', urlTemplate: `${BASE_URL}/shop?q={search_term_string}` },
                'query-input': 'required name=search_term_string',
              },
              inLanguage: 'en-IN',
            },
            {
              '@type':  'Organization',
              '@id':    `${BASE_URL}/#organization`,
              name:     'Eptomart',
              url:      `${BASE_URL}/`,
              logo:     { '@type': 'ImageObject', url: DEFAULT_IMAGE, width: 512, height: 512 },
              contactPoint: { '@type': 'ContactPoint', contactType: 'customer service', email: 'support@eptomart.com', availableLanguage: ['English', 'Tamil'] },
              sameAs:   ['https://www.facebook.com/eptomart', 'https://www.instagram.com/eptomart'],
            },
          ],
        },
      },
      shop: {
        title:       'Shop All Products | Eptomart',
        description: 'Browse thousands of products across all categories on Eptomart. Best prices, fast delivery.',
        canonical:   `${BASE_URL}/shop`,
        keywords:    'shop online, buy products India, best price',
        image:       DEFAULT_IMAGE,
      },
      about: {
        title:       'About Us | Eptomart',
        description: 'Learn about Eptomart — our story, mission and commitment to fast, affordable delivery across India.',
        canonical:   `${BASE_URL}/about`,
        keywords:    'about eptomart, company, mission',
        image:       DEFAULT_IMAGE,
      },
      contact: {
        title:       'Contact Us | Eptomart',
        description: 'Get in touch with Eptomart support. We are here to help with orders, products and more.',
        canonical:   `${BASE_URL}/contact`,
        keywords:    'contact eptomart, support, help',
        image:       DEFAULT_IMAGE,
      },
    },
  },

  koyambedu: {
    siteName:    'Koyambedu Daily | Eptomart',
    themeColor:  '#16a34a',
    locale:      'ta_IN',
    twitterSite: '@eptomart',
    pages: {
      home: {
        title:       'Koyambedu Daily — Fresh Vegetables & Fruits Delivered | Eptomart',
        description: 'Order fresh vegetables, fruits and groceries from Koyambedu Market — Asia's largest wholesale market — delivered to your doorstep in Chennai.',
        canonical:   `${BASE_URL}/koyambedu`,
        keywords:    'koyambedu market, fresh vegetables online Chennai, fruits delivery, wholesale prices, daily groceries',
        image:       `${BASE_URL}/icons/koyambedu-og.png`,
        jsonLd: {
          '@context':   'https://schema.org',
          '@type':      'LocalBusiness',
          name:         'Koyambedu Daily',
          description:  'Fresh vegetables, fruits and groceries from Koyambedu Market delivered to your doorstep.',
          url:          `${BASE_URL}/koyambedu`,
          image:        `${BASE_URL}/icons/koyambedu-og.png`,
          priceRange:   '₹',
          currenciesAccepted: 'INR',
          paymentAccepted:    'Cash, Credit Card, UPI',
          areaServed:   { '@type': 'City', name: 'Chennai', sameAs: 'https://www.wikidata.org/wiki/Q1352' },
          address: {
            '@type':           'PostalAddress',
            streetAddress:     'Koyambedu Market',
            addressLocality:   'Chennai',
            addressRegion:     'Tamil Nadu',
            postalCode:        '600092',
            addressCountry:    'IN',
          },
          openingHoursSpecification: [
            { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'], opens: '04:00', closes: '22:00' },
          ],
          parentOrganization: { '@type': 'Organization', name: 'Eptomart', url: BASE_URL },
        },
      },
      shop: {
        title:       'Shop Fresh Produce | Koyambedu Daily',
        description: 'Buy vegetables, fruits, leafy greens and more at Koyambedu market wholesale prices. Same-day and next-day delivery in Chennai.',
        canonical:   `${BASE_URL}/koyambedu/shop`,
        keywords:    'buy vegetables Chennai, fresh fruits delivery, same day grocery delivery, koyambedu prices',
        image:       `${BASE_URL}/icons/koyambedu-og.png`,
      },
      product: {
        title:       'Fresh Product | Koyambedu Daily',
        description: 'Buy fresh produce at Koyambedu market prices. Fast delivery in Chennai.',
        canonical:   `${BASE_URL}/koyambedu`,
        keywords:    'fresh vegetables, koyambedu, buy online Chennai',
        image:       `${BASE_URL}/icons/koyambedu-og.png`,
      },
    },
  },

  eptofresh: {
    siteName:    'EptoFresh | Eptomart',
    themeColor:  '#dc2626',
    locale:      'en_IN',
    twitterSite: '@eptomart',
    pages: {
      home: {
        title:       'EptoFresh — Fresh Chicken, Fish & Eggs Delivered | Eptomart',
        description: 'Order fresh chicken, fish, eggs and proteins online in Chennai. Cleaned, cut and delivered within hours from trusted local sellers.',
        canonical:   `${BASE_URL}/eptofresh`,
        keywords:    'fresh chicken delivery Chennai, fish online order, eggs delivery, protein delivery Chennai, EptoFresh',
        image:       `${BASE_URL}/icons/eptofresh-og.png`,
        jsonLd: {
          '@context':   'https://schema.org',
          '@type':      'LocalBusiness',
          name:         'EptoFresh Proteins',
          description:  'Fresh chicken, fish and eggs delivered from trusted local sellers in Chennai.',
          url:          `${BASE_URL}/eptofresh`,
          image:        `${BASE_URL}/icons/eptofresh-og.png`,
          priceRange:   '₹₹',
          currenciesAccepted: 'INR',
          paymentAccepted:    'Cash, Credit Card, UPI',
          areaServed:   { '@type': 'City', name: 'Chennai', sameAs: 'https://www.wikidata.org/wiki/Q1352' },
          address: {
            '@type':         'PostalAddress',
            addressLocality: 'Chennai',
            addressRegion:   'Tamil Nadu',
            addressCountry:  'IN',
          },
          parentOrganization: { '@type': 'Organization', name: 'Eptomart', url: BASE_URL },
        },
      },
      shop: {
        title:       'Shop Fresh Proteins | EptoFresh',
        description: 'Choose from a wide range of fresh meats, poultry and seafood from verified local sellers. Delivered fresh to your door.',
        canonical:   `${BASE_URL}/eptofresh/shop`,
        keywords:    'fresh chicken Chennai, fish delivery, meat online order, seafood Chennai',
        image:       `${BASE_URL}/icons/eptofresh-og.png`,
      },
    },
  },

  uzhavar: {
    siteName:    'Uzhavar — Farmer Fresh | Eptomart',
    themeColor:  '#15803d',
    locale:      'ta_IN',
    twitterSite: '@eptomart',
    pages: {
      home: {
        title:       'Uzhavar — Farm-Fresh Produce Direct from Farmers | Eptomart',
        description: 'Connect with local Tamil Nadu farmers. Buy farm-fresh vegetables, fruits and produce directly — supporting farmers, delivering fresh.',
        canonical:   `${BASE_URL}/uzhavar`,
        keywords:    'farmer fresh produce, uzhavar, farm to table Tamil Nadu, direct from farmer, organic vegetables',
        image:       `${BASE_URL}/icons/uzhavar-og.png`,
        jsonLd: {
          '@context':  'https://schema.org',
          '@type':     'Organization',
          name:        'Uzhavar — Farmer Fresh',
          description: 'Farm-fresh produce direct from Tamil Nadu farmers.',
          url:         `${BASE_URL}/uzhavar`,
          image:       `${BASE_URL}/icons/uzhavar-og.png`,
          parentOrganization: { '@type': 'Organization', name: 'Eptomart', url: BASE_URL },
        },
      },
    },
  },
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function EptoSEO({
  app         = 'main',
  page        = 'home',
  title,
  description,
  canonical,
  keywords,
  image,
  noIndex     = false,
  jsonLd,       // custom JSON-LD (overrides page default)
  breadcrumb,   // array of { name, url } for BreadcrumbList
}) {
  const appCfg  = APP_CONFIG[app]  || APP_CONFIG.main;
  const pageCfg = appCfg.pages[page] || appCfg.pages.home;

  const resolvedTitle       = title       || pageCfg.title;
  const resolvedDescription = description || pageCfg.description;
  const resolvedCanonical   = canonical   || pageCfg.canonical;
  const resolvedKeywords    = keywords    || pageCfg.keywords;
  const resolvedImage       = image       || pageCfg.image || DEFAULT_IMAGE;
  const resolvedSiteName    = appCfg.siteName;

  // Build JSON-LD array
  const schemas = [];

  // Page-level schema (custom or default from config)
  const pageSchema = jsonLd || pageCfg.jsonLd;
  if (pageSchema) schemas.push(pageSchema);

  // BreadcrumbList if provided
  if (breadcrumb && breadcrumb.length > 0) {
    schemas.push({
      '@context':      'https://schema.org',
      '@type':         'BreadcrumbList',
      itemListElement: breadcrumb.map((crumb, i) => ({
        '@type':   'ListItem',
        position:  i + 1,
        name:      crumb.name,
        item:      crumb.url,
      })),
    });
  }

  return (
    <Helmet>
      {/* Basic */}
      <title>{resolvedTitle}</title>
      <meta name="description"        content={resolvedDescription} />
      {resolvedKeywords && <meta name="keywords" content={resolvedKeywords} />}
      <link rel="canonical"           href={resolvedCanonical} />
      <meta name="theme-color"        content={appCfg.themeColor} />
      {noIndex
        ? <meta name="robots" content="noindex, nofollow" />
        : <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      }

      {/* Open Graph */}
      <meta property="og:title"       content={resolvedTitle} />
      <meta property="og:description" content={resolvedDescription} />
      <meta property="og:url"         content={resolvedCanonical} />
      <meta property="og:image"       content={resolvedImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height"content="630" />
      <meta property="og:type"        content="website" />
      <meta property="og:site_name"   content={resolvedSiteName} />
      <meta property="og:locale"      content={appCfg.locale} />

      {/* Twitter Card */}
      <meta name="twitter:card"       content="summary_large_image" />
      <meta name="twitter:site"       content={appCfg.twitterSite} />
      <meta name="twitter:title"      content={resolvedTitle} />
      <meta name="twitter:description"content={resolvedDescription} />
      <meta name="twitter:image"      content={resolvedImage} />

      {/* JSON-LD */}
      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}

// ─── Product JSON-LD helper ──────────────────────────────────────────────────
export function buildProductSchema({ name, description, image, price, currency = 'INR', availability = 'InStock', url, seller }) {
  return {
    '@context':   'https://schema.org',
    '@type':      'Product',
    name,
    description:  description || name,
    image:        Array.isArray(image) ? image : [image].filter(Boolean),
    offers: {
      '@type':          'Offer',
      price:            price,
      priceCurrency:    currency,
      availability:     `https://schema.org/${availability}`,
      url:              url || BASE_URL,
      seller:           seller ? { '@type': 'Organization', name: seller } : undefined,
    },
  };
}
