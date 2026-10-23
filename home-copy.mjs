// The only home-page marketing copy.
// Swap approved lines here. The build reads this file.
// Do not paste these sentences into templates.
//
// title:       document <title>, og:title, and twitter:title
// description: meta description
// term:        search phrase that must appear in the title and description
// h1:          heading above the board
// subhead:     line under the heading, hidden on phones
// The technique count in "See all N techniques" is not stored here.
// The build fills N from the techniques list.

export const homeCopy = {
  title: "Free Sudoku, Graded by the Hardest Move | SudokuSudoku",
  description:
    "Free Sudoku online, graded by the hardest move instead of the clue count. Stuck? The hint names the technique rather than handing you a number.",
  term: "graded by the hardest move",
  h1: "Free Sudoku, graded by the hardest move",
  subhead: "Hints teach the move, not just the number.",
  introHeading: "Why this Sudoku is different",
  intro:
    "I play Sudoku most days, usually the NYT on my phone, and I still get stuck. So I built the version I wanted. Every puzzle here is solved one step at a time, the way a person would, and the hardest step sets the level. Clue count has nothing to do with it. That's why Not Easy plays a lot like an NYT Medium, and why Expert is where X-wings and swordfish finally show up. New to this? Start with Easy. Want the same grid as everyone else today? Play the daily. When you get stuck, take a hint. It won't hand you a number, it shows you the move and tells you what it's called. Free, no download, and no account unless you want one.",
  features: [
    {
      title: "Hints that name the move",
      text: "The hint points at the cells, tells you what the step is called, and shows why it works. Want the long version? It links to the technique page.",
      links: [{ phrase: "technique page", href: "/techniques/" }],
    },
    {
      title: "Graded by the hardest step",
      text: "The solver works every puzzle the way you would. Whatever its toughest step was sets the level, so Hard actually means hard.",
    },
    {
      title: "Practice one technique",
      text: "Pick a technique and the puzzle loads with the easier steps done, stopping right where you need it. Practice stays off your stats.",
    },
    {
      title: "Stats on your device",
      text: "Streaks, badges and a skill ladder live in your browser. Want them on another device? Sign in with an email link. No password.",
    },
  ],
  faq: [
    {
      question: "Can a Sudoku have more than one solution?",
      answer:
        "A proper one has exactly one. Every puzzle here is checked for a single solution before you see it.",
    },
    {
      question: "Do you have to guess to solve Sudoku?",
      answer:
        "Not here. Every puzzle can be finished with named logic steps, the same ones the hints teach. If you're guessing, there's a move you haven't spotted yet. Take a hint.",
    },
    {
      question: "Why is Sudoku so hard for me?",
      answer:
        "Usually it's one step you haven't learned yet, not the number of clues. The hint shows which one, and Practice a technique drops you right on it.",
      links: [
        { phrase: "one step you haven't learned yet", href: "/articles/what-makes-a-sudoku-hard/" },
        { phrase: "the number of clues", href: "/articles/fewest-and-most-sudoku-clues/" },
        { phrase: "Practice a technique", href: "/skills/" },
      ],
    },
    {
      question: "How do I get better at Sudoku?",
      answer:
        "Learn one new technique at a time. Start with hidden singles, then pointing. Play a level until it feels easy, then move up one.",
    },
    {
      question: "Is Sudoku good for your brain?",
      answer:
        "It's honest mental exercise and it keeps you focused. Evidence that it prevents memory loss is thin, so I'd play it because it's fun.",
      links: [
        {
          phrase: "Evidence that it prevents memory loss is thin",
          href: "/articles/does-sudoku-keep-your-brain-sharp/",
        },
      ],
    },
  ],
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function applyLinks(text, links = []) {
  let html = escapeHtml(text);
  const ordered = [...links].sort((a, b) => b.phrase.length - a.phrase.length);
  for (const link of ordered) {
    const phrase = escapeHtml(link.phrase);
    if (!html.includes(phrase)) throw new Error(`Home copy is missing the phrase: ${link.phrase}`);
    html = html.replace(phrase, `<a href="${escapeHtml(link.href)}">${phrase}</a>`);
  }
  return html;
}

export function renderHomeIntro() {
  return `<h1>${escapeHtml(homeCopy.h1)}</h1>
        <p class="supporting-text">${escapeHtml(homeCopy.subhead)}</p>`;
}

export function renderHomeBelow({ techniqueCount = 0 } = {}) {
  const intro = applyLinks(homeCopy.intro, [
    { phrase: "NYT Medium", href: "/articles/nyt-medium-vs-hard/" },
  ]);
  const features = homeCopy.features
    .map((feature) => {
      const links = techniqueCount > 0 ? feature.links || [] : [];
      return `<h3>${escapeHtml(feature.title)}</h3>
        <p>${applyLinks(feature.text, links)}</p>`;
    })
    .join("\n");
  const links = [
    { href: "/?daily", text: "Play today's daily" },
    { href: "/skills/", text: "Practice a technique" },
  ];
  if (techniqueCount > 0) {
    links.push({ href: "/techniques/", text: `See all ${techniqueCount} techniques` });
  }
  links.push(
    {
      href: "/how-difficulty-works/",
      text: "How these levels are graded",
    },
    {
      href: "/articles/nyt-medium-vs-hard/",
      text: "Why NYT Medium feels harder than Hard",
    }
  );
  const linkList = links
    .map((link) => `<li><a href="${escapeHtml(link.href)}">${escapeHtml(link.text)}</a></li>`)
    .join("");
  const faq = homeCopy.faq
    .map(
      (item) => `<div class="home-faq-item"><dt>${escapeHtml(item.question)}</dt><dd>${applyLinks(item.answer, item.links || [])}</dd></div>`
    )
    .join("");
  return `<h2>${escapeHtml(homeCopy.introHeading)}</h2>
        <p>${intro}</p>
        <div class="home-features">
        ${features}
        </div>
        <ul class="home-links">${linkList}</ul>
        <dl class="home-faq">${faq}</dl>`;
}

export function faqJsonLd() {
  return {
    "@type": "FAQPage",
    mainEntity: homeCopy.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
