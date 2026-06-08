export type LegalPageId = "about" | "accessibility" | "help" | "services" | "privacyPolicy" | "termsOfService";

export type LegalSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export type LegalPageContent = {
  title: string;
  description: string;
  sections: LegalSection[];
  contactNote: string;
};

const sharedPages: Record<LegalPageId, LegalPageContent> = {
  about: {
    title: "About Norge360",
    description: "Norge360 is a community-first platform built for local discovery, private conversations, and meaningful updates from the people around you.",
    sections: [
      {
        title: "What we are building",
        paragraphs: [
          "We are building a space where people can discover neighbors, follow community activity, and share posts without losing control of their audience.",
        ],
      },
      {
        title: "What you can do here",
        paragraphs: ["You can post, message, search, follow people, save content, and manage your experience from a single account."],
        bullets: ["Explore the feed and discover hub", "Manage privacy and messaging preferences", "Use search history and saved content across the app"],
      },
      {
        title: "Our approach",
        paragraphs: ["We keep the product focused on usefulness, privacy, and community trust instead of noisy social patterns."],
      },
    ],
    contactNote: "If you need help with your account or content, the Help page is the best place to start.",
  },
  accessibility: {
    title: "Accessibility",
    description: "We want Norge360 to work for as many people as possible, including users who rely on keyboards, screen readers, zoom, and strong visual contrast.",
    sections: [
      {
        title: "What we support",
        paragraphs: ["The product is designed to work with keyboard navigation, readable focus states, semantic controls, and responsive layouts."],
        bullets: ["Keyboard access for primary flows", "Readable text sizes and contrast-aware surfaces", "Responsive layouts on desktop and mobile"],
      },
      {
        title: "Ongoing improvements",
        paragraphs: ["Accessibility is part of our product work, not a one-time checklist. We keep improving labels, structure, and interaction patterns as the app evolves."],
      },
      {
        title: "Report a barrier",
        paragraphs: ["If something is hard to use, let us know through support so we can investigate and improve it."],
      },
    ],
    contactNote: "When reporting an accessibility barrier, include the page, what you were trying to do, and the device or browser you used.",
  },
  help: {
    title: "Help Center",
    description: "Find quick guidance for signing in, messaging, privacy settings, account safety, and common product questions.",
    sections: [
      {
        title: "Account help",
        paragraphs: ["If you are having trouble signing in, check your session, password, and recovery settings first."],
        bullets: ["Use password and recovery settings to keep access safe", "Review sessions if you were signed out unexpectedly", "Update your profile and privacy settings from Settings"],
      },
      {
        title: "Messaging and sharing",
        paragraphs: ["Messages, post sharing, and reactions are all part of the same communication flow, so most issues can be solved by checking message permissions or connection status."],
      },
      {
        title: "Safety and reporting",
        paragraphs: ["Use blocking, reporting, and privacy controls whenever something feels off. We review those signals to keep the platform safer."],
      },
    ],
    contactNote: "If the app is not behaving the way you expect, include a short description and a screenshot when possible.",
  },
  services: {
    title: "Services",
    description: "Norge360 currently combines discovery, community publishing, direct messaging, search, and account controls in one app.",
    sections: [
      {
        title: "Core services",
        paragraphs: ["The product is organized around a few core experiences that work together across the platform."],
        bullets: [
          "Community feed and explore feed",
          "Discover hub and popular people widget",
          "Direct and group messaging",
          "Search history and saved searches",
          "Account, privacy, and security settings",
        ],
      },
      {
        title: "Availability",
        paragraphs: ["Features may change over time as the product evolves, but the platform is intended to remain focused on these core experiences."],
      },
    ],
    contactNote: "For questions about feature availability or access, start with the Help page or your account settings.",
  },
  privacyPolicy: {
    title: "Privacy Policy",
    description: "This page explains how Norge360 handles information when you use the app.",
    sections: [
      {
        title: "Information we collect",
        paragraphs: [
          "We collect information you provide directly, such as profile details, posts, messages, search entries, and settings you choose to save.",
          "We also process technical data needed to keep the app secure and working, such as session information and device/browser signals.",
        ],
      },
      {
        title: "How we use information",
        paragraphs: ["We use information to run the service, personalize your experience, maintain safety, show relevant content, and help you recover access to your account."],
      },
      {
        title: "Sharing and retention",
        paragraphs: ["We only share information when it is needed to provide the service, follow legal obligations, or support safety and moderation. We retain data only as long as needed for those purposes."],
      },
      {
        title: "Your choices",
        paragraphs: ["You can update profile details, manage privacy settings, clear search history, revoke sessions, and block or report other accounts from within the product."],
      },
    ],
    contactNote: "Privacy requests and questions should be handled through the Help page and account settings so we can verify your account securely.",
  },
  termsOfService: {
    title: "Terms of Service",
    description: "These terms describe the rules for using Norge360.",
    sections: [
      {
        title: "Eligibility and accounts",
        paragraphs: ["You are responsible for the information on your account, for keeping your credentials secure, and for using the service in a lawful way."],
      },
      {
        title: "Acceptable use",
        paragraphs: ["Do not use the platform to harass, impersonate, scam, spam, or distribute harmful content. Respect the privacy and rights of other people."],
      },
      {
        title: "Content and moderation",
        paragraphs: ["You keep ownership of the content you create, but you grant Norge360 the permissions needed to host, display, and deliver it inside the service. We may remove content or limit access when needed to protect the platform and its users."],
      },
      {
        title: "Service changes",
        paragraphs: ["We may update features, change the service, or suspend access when necessary for safety, maintenance, or legal reasons."],
      },
    ],
    contactNote: "If you have questions about these terms, use the Help page to reach the right support path.",
  },
};

export function getLegalPageContent(_locale: string, pageId: LegalPageId): LegalPageContent {
  return sharedPages[pageId];
}
