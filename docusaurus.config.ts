import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Cube Partner Training',
  tagline: 'Master the semantic layer for analytics success',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://cube-partner-training.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/cube-partner-training/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'cube-partner-training', // Usually your GitHub org/user name.
  projectName: 'cube-partner-training', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/cube-partner-training/cube-partner-training/tree/main/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    navbar: {
      title: 'Cube Partner Training',
      logo: {
        alt: 'Cube Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Training Modules',
        },
        {
          href: 'https://cube.dev',
          label: 'Cube.dev',
          position: 'right',
        },
        {
          href: 'https://cubecloud.dev',
          label: 'Cube Cloud',
          position: 'right',
        },
        {
          href: 'https://github.com/cube-js/cube',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Training',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/intro',
            },
            {
              label: 'Module 1: Foundation',
              to: '/docs/module-1-foundation',
            },
            {
              label: 'Module 2: Getting Started',
              to: '/docs/module-2-getting-started',
            },
          ],
        },
        {
          title: 'Cube Resources',
          items: [
            {
              label: 'Cube.dev',
              href: 'https://cube.dev',
            },
            {
              label: 'Cube Cloud',
              href: 'https://cubecloud.dev',
            },
            {
              label: 'Documentation',
              href: 'https://cube.dev/docs',
            },
            {
              label: 'Community Slack',
              href: 'https://cube.dev/slack',
            },
          ],
        },
        {
          title: 'Support',
          items: [
            {
              label: 'GitHub Issues',
              href: 'https://github.com/cube-js/cube/issues',
            },
            {
              label: 'Stack Overflow',
              href: 'https://stackoverflow.com/questions/tagged/cube.js',
            },
            {
              label: 'Partner Program',
              href: 'https://cube.dev/partners',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Cube Dev, Inc. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
