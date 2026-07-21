/** Full demo config — covers every optional section. */
const sampleEvent = {
  slug: "sample-event",
  seo: {
    title: "Sample Live Night | BookMyTickets",
    description:
      "An unforgettable night of music, dance, and celebration. Get tickets, VIP access, and more.",
    ogImage: "/branding/Banner.png",
    twitterCard: "summary_large_image",
    canonicalPath: "/sample-event",
  },
  brand: {
    name: "SAMPLE LIVE",
    logoSrc: "/branding/BMT2 New.png",
    accentColor: "#c9a227",
  },
  hero: {
    backgroundType: "image",
    backgroundSrc: "/branding/Banner.png",
    title: "SAMPLE LIVE NIGHT",
    subtitle: "One night. Infinite energy.",
    facts: [
      { label: "WHEN", value: "Saturday, August 15, 2026" },
      { label: "WHERE", value: "Grand Arena, Dallas, TX" },
      { label: "DOORS", value: "6:00 PM" },
      { label: "SHOW", value: "8:00 PM" },
    ],
    eventDateIso: "2026-08-15T20:00:00-05:00",
    primaryCta: { label: "BUY TICKETS", href: "#tickets" },
    secondaryCta: { label: "LEARN MORE", href: "#about" },
    banner: {
      text: "Early bird tickets available — limited seats!",
      dismissible: true,
    },
  },
  about: {
    id: "about",
    heading: "About the Night",
    paragraphs: [
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
      "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
      "Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris.",
    ],
    directorCredit: "Presented by BookMyTickets Entertainment",
    ctas: [
      { label: "GET TICKETS", href: "#tickets" },
      { label: "WATCH REEL", href: "#media", variant: "outline" },
    ],
  },
  media: {
    id: "media",
    heading: "Watch & Explore",
    items: [
      {
        type: "image",
        src: "/branding/Banner.png",
        alt: "Stage atmosphere",
        caption: "The stage awaits",
      },
      {
        type: "image",
        src: "/branding/BMT2 New.png",
        alt: "Event brand",
        caption: "Official event brand",
      },
      {
        type: "external",
        href: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        label: "Official Trailer",
        thumbnail: "/branding/Banner.png",
      },
    ],
  },
  experience: {
    id: "experience",
    heading: "The Experience",
    items: [
      {
        title: "World-Class Performance",
        body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam.",
      },
      {
        title: "Immersive Production",
        body: "Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta.",
      },
      {
        title: "Unforgettable Night Out",
        body: "Mauris massa. Vestibulum lacinia arcu eget nulla. Class aptent taciti sociosqu ad litora torquent per conubia nostra.",
      },
    ],
  },
  tickets: {
    id: "tickets",
    heading: "Tickets",
    mode: "external",
    externalUrl: "https://www.ticketmaster.com/",
    unlockLabel: "UNLOCK TICKETS",
    promoCode: "SAMPLE2026",
    promoHint: "Use this code at checkout for early access pricing.",
    howToVideoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    seatMapImage: "/branding/Banner.png",
    note: "Tickets are fulfilled via Ticketmaster. Promo code may expire without notice.",
  },
  vipPerk: {
    id: "vip",
    heading: "VIP Access",
    body: "Upgrade to VIP for premium seating, lounge access, and a commemorative gift. Limited inventory — first come, first served.",
    cta: { label: "VIEW VIP OPTIONS", href: "#tickets" },
  },
  activities: {
    id: "activities",
    heading: "Get Involved",
    cards: [
      {
        title: "Open Auditions",
        body: "Dance crews and solo artists — apply to open the night. Ages 16+. Travel not provided.",
      },
      {
        title: "Volunteer Crew",
        body: "Help with guest experience, merch, and stage ops. Free admission for selected volunteers.",
      },
    ],
    form: {
      title: "Apply Now",
      fields: [
        { name: "fullName", label: "Full name", type: "text", required: true },
        { name: "email", label: "Email", type: "email", required: true },
        { name: "phone", label: "Phone", type: "tel", required: false },
        {
          name: "interest",
          label: "I'm interested in",
          type: "select",
          required: true,
          options: ["Open Auditions", "Volunteer Crew", "Both"],
        },
        {
          name: "message",
          label: "Tell us about yourself",
          type: "textarea",
          required: true,
        },
      ],
      submitLabel: "Submit application",
      successMessage: "Thanks! We received your application and will be in touch.",
    },
  },
  sponsors: {
    id: "sponsors",
    heading: "Partners & Sponsors",
    titleSponsor: {
      name: "Title Partner Co.",
      logoSrc: "/branding/BMT2 New.png",
      href: "https://bookmytickets.us",
    },
    tiers: [
      {
        name: "Gold",
        logos: [
          { name: "Gold Partner A", logoSrc: "/branding/BMT2 New.png" },
          { name: "Gold Partner B", logoSrc: "/branding/BMT2 New.png" },
        ],
      },
      {
        name: "Silver",
        logos: [
          { name: "Silver Partner A", logoSrc: "/branding/BMT2 New.png" },
          { name: "Silver Partner B", logoSrc: "/branding/BMT2 New.png" },
          { name: "Silver Partner C", logoSrc: "/branding/BMT2 New.png" },
        ],
      },
    ],
    enquiryForm: {
      title: "Become a sponsor",
      fields: [
        { name: "company", label: "Company", type: "text", required: true },
        { name: "contactName", label: "Contact name", type: "text", required: true },
        { name: "email", label: "Email", type: "email", required: true },
        {
          name: "budget",
          label: "Approximate budget",
          type: "select",
          required: false,
          options: ["Under $5k", "$5k–$15k", "$15k–$50k", "$50k+"],
        },
        { name: "message", label: "Message", type: "textarea", required: true },
      ],
      submitLabel: "Send enquiry",
      successMessage: "Thanks! Our partnerships team will reach out shortly.",
    },
  },
  presenters: {
    heading: "Presented by",
    logos: [
      { name: "BookMyTickets", logoSrc: "/branding/BMT2 New.png", href: "/" },
    ],
    poweredBy: "Powered by BookMyTickets",
  },
  footer: {
    recap: "Sample Live Night — August 15, 2026 — Grand Arena, Dallas",
    columns: [
      {
        title: "Event",
        links: [
          { label: "About", href: "#about" },
          { label: "Tickets", href: "#tickets" },
          { label: "VIP", href: "#vip" },
        ],
      },
      {
        title: "Get involved",
        links: [
          { label: "Auditions", href: "#activities" },
          { label: "Sponsors", href: "#sponsors" },
        ],
      },
      {
        title: "BookMyTickets",
        links: [
          { label: "Home", href: "/" },
          { label: "All events", href: "/events" },
          { label: "Contact", href: "/contact" },
        ],
      },
    ],
    socials: [
      { label: "Instagram", href: "https://instagram.com" },
      { label: "YouTube", href: "https://youtube.com" },
      { label: "Facebook", href: "https://facebook.com" },
    ],
    legal: "© 2026 BookMyTickets. All rights reserved. Demo landing page.",
  },
};

export default sampleEvent;
