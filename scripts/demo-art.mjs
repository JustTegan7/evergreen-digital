/* =============================================================================
   demo-art.mjs, illustrated hero scenes and "personality" content for each demo.
   Imported by build-demos.mjs. Everything here is original artwork and invented
   sample copy for fictional businesses.
   ============================================================================= */

const wrap = (inner, extra = "") => `<svg class="scene" viewBox="0 0 480 456" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${inner}${extra}</svg>`;
const steam = (x, y) => `<path class="steam" d="M${x} ${y}c-10-14 10-20 0-34M${x + 18} ${y + 4}c-10-14 10-20 0-34" fill="none" stroke="var(--ink)" stroke-width="3" stroke-linecap="round" opacity=".35"/>`;

export const HERO_ART = {
  "coffee-shop": wrap(`
    <rect width="480" height="456" fill="var(--surface)"/>
    <rect x="50" y="46" width="210" height="190" rx="105" fill="#ffe2b0"/>
    <circle cx="155" cy="150" r="44" fill="#f4a64f"/>
    <path d="M50 150h210M155 46v190" stroke="var(--accent)" stroke-width="6" fill="none"/>
    <rect x="50" y="46" width="210" height="190" rx="105" fill="none" stroke="var(--accent)" stroke-width="8"/>
    <g stroke="var(--ink)" stroke-width="3"><path d="M330 0v66M410 0v90" opacity=".5"/></g>
    <path d="M303 106a27 27 0 0 1 54 0z" fill="var(--accent)"/><path d="M383 128a27 27 0 0 1 54 0z" fill="var(--accent)"/>
    <circle cx="330" cy="112" r="10" fill="#ffe9a8"/><circle cx="410" cy="134" r="10" fill="#ffe9a8"/>
    <rect y="318" width="480" height="138" fill="var(--accent)" opacity=".28"/>
    <rect y="318" width="480" height="10" fill="var(--accent)" opacity=".55"/>
    <ellipse cx="236" cy="372" rx="108" ry="18" fill="#fff"/><ellipse cx="236" cy="366" rx="108" ry="18" fill="#f6efe6"/>
    <path d="M160 270h152v34a76 66 0 0 1-152 0z" fill="#fff" stroke="var(--ink)" stroke-width="4"/>
    <path d="M312 284h18a26 26 0 0 1 0 52h-22" fill="none" stroke="var(--ink)" stroke-width="4"/>
    <ellipse cx="236" cy="272" rx="76" ry="14" fill="#7b4a2a"/><path d="M212 272c10-8 14 6 24-2s14 8 24-2" fill="none" stroke="#f1d3ab" stroke-width="3" stroke-linecap="round"/>
    ${steam(206, 244)}${steam(246, 238)}
    <g transform="rotate(-18 392 352)"><ellipse cx="392" cy="352" rx="52" ry="22" fill="#d9923b"/><path d="M356 346q10-12 20 0M376 340q10-12 20 0M396 340q10-12 20 0M414 346q8-10 16 0" fill="none" stroke="#a96a22" stroke-width="3"/></g>
    <path d="M40 456c-4-50 6-90 30-120 4 40-6 90-30 120zM70 456c10-34 34-56 64-62-8 34-30 56-64 62z" fill="#5f8a55" opacity=".9"/>`),

  salon: wrap(`
    <rect width="480" height="456" fill="var(--surface)"/>
    <path d="M110 420V150a110 110 0 0 1 220 0v270z" fill="#f7fbf9" stroke="var(--accent)" stroke-width="10"/>
    <path d="M140 140a80 80 0 0 1 80-80" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity=".9"/>
    <path d="M168 330q52-64 104 0" fill="none" stroke="var(--accent)" stroke-width="3" opacity=".25"/>
    <rect x="56" y="396" width="368" height="14" rx="7" fill="var(--accent)" opacity=".5"/>
    <g transform="translate(350 96)"><path d="M0 0v60" stroke="var(--ink)" stroke-width="3" opacity=".5"/><rect x="-24" y="60" width="48" height="40" rx="8" fill="var(--accent)"/><path d="M-4 60c-14-26-30-24-34-40M4 60c8-30 30-34 38-52M0 60c0-28 6-40 4-56" fill="none" stroke="#5f8a55" stroke-width="5" stroke-linecap="round"/></g>
    <g transform="translate(396 238) rotate(24)"><circle cx="0" cy="40" r="14" fill="none" stroke="var(--ink)" stroke-width="5"/><circle cx="28" cy="40" r="14" fill="none" stroke="var(--ink)" stroke-width="5"/><path d="M8 30 38-40M20 30-10-40" stroke="var(--ink)" stroke-width="5" stroke-linecap="round"/></g>
    <g transform="translate(60 300)"><rect width="22" height="90" rx="6" fill="#fff" stroke="var(--ink)" stroke-width="3"/><rect y="20" width="22" height="26" fill="var(--accent)"/><rect x="34" y="18" width="22" height="72" rx="6" fill="#fff" stroke="var(--ink)" stroke-width="3"/><rect x="34" y="40" width="22" height="22" fill="#e8b04a"/></g>
    <g fill="var(--accent)" opacity=".7"><path d="m236 92 4 11 11 4-11 4-4 11-4-11-11-4 11-4z"/><path d="m148 190 3 8 8 3-8 3-3 8-3-8-8-3 8-3z"/><path d="m292 246 3 8 8 3-8 3-3 8-3-8-8-3 8-3z"/></g>`),

  trades: wrap(`
    <rect width="480" height="456" fill="var(--surface)"/>
    <path d="M60 230 240 70l180 160z" fill="#fff" stroke="var(--ink)" stroke-width="6" stroke-linejoin="round"/>
    <rect x="92" y="230" width="296" height="190" fill="#fff" stroke="var(--ink)" stroke-width="6"/>
    <path d="M130 410V330M130 330h110v-60M240 330h110M350 330v-70" fill="none" stroke="var(--accent)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="240" cy="330" r="14" fill="#fff" stroke="var(--accent)" stroke-width="6"/>
    <path class="flame" d="M350 410c-24-16-18-38-4-52 2 14 10 16 14 10 8 14 14 28-10 42z" fill="#ff7a21"/>
    <path d="M130 270c-14 18-20 26-20 36a20 20 0 0 0 40 0c0-10-6-18-20-36z" fill="#38a8e8"/>
    <rect x="212" y="252" width="56" height="42" rx="4" fill="#cfe3f5" stroke="var(--ink)" stroke-width="4"/><path d="M240 252v42M212 273h56" stroke="var(--ink)" stroke-width="3"/>
    <g transform="translate(392 70) rotate(40)"><rect x="-8" y="0" width="16" height="130" rx="8" fill="var(--accent)"/><path d="M-26-30a26 26 0 0 1 52 0v26h-14v-18h-24v18h-14z" fill="var(--accent)"/></g>
    <path d="M70 436h340" stroke="var(--ink)" stroke-width="4" opacity=".4"/>`),

  "auto-detailing": wrap(`
    <rect width="480" height="456" fill="var(--surface)"/>
    <defs><linearGradient id="sh" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
    <ellipse cx="240" cy="376" rx="200" ry="22" fill="#000" opacity=".35"/>
    <path d="M44 330c0-30 16-40 42-46l56-62c10-10 22-14 36-14h104c18 0 30 6 42 18l48 52c30 4 60 10 60 40v26H44z" fill="var(--accent)"/>
    <path d="M150 226h66v54h-110zM232 226h72c12 0 20 4 28 12l30 42H232z" fill="#d7f0ff" opacity=".92"/>
    <path d="M44 330h392v30H44z" fill="#0b0d10" opacity=".35"/>
    <g fill="#14171c"><circle cx="146" cy="360" r="38"/><circle cx="350" cy="360" r="38"/></g>
    <g fill="#c9d4dd"><circle cx="146" cy="360" r="20"/><circle cx="350" cy="360" r="20"/></g>
    <g fill="#14171c"><circle cx="146" cy="360" r="7"/><circle cx="350" cy="360" r="7"/></g>
    <rect class="gleam" x="90" y="212" width="130" height="140" fill="url(#sh)" transform="skewX(-22)"/>
    <g fill="#fff" opacity=".85"><circle cx="70" cy="150" r="14"/><circle cx="104" cy="112" r="9"/><circle cx="410" cy="120" r="16"/><circle cx="386" cy="84" r="8"/><circle cx="430" cy="180" r="7"/></g>
    <g fill="var(--accent)"><path d="m96 70 4 12 12 4-12 4-4 12-4-12-12-4 12-4z"/><path d="m300 60 3 9 9 3-9 3-3 9-3-9-9-3 9-3z"/></g>`),

  church: wrap(`
    <rect width="480" height="456" fill="var(--surface)"/>
    <circle cx="240" cy="170" r="150" fill="#ffe7a8" opacity=".55"/>
    <g stroke="#f4c75a" stroke-width="6" stroke-linecap="round" opacity=".7"><path d="M240 20V-0M110 70 90 52M370 70l20-18M60 170H36M420 170h24"/></g>
    <path d="M110 420V250l130-84 130 84v170z" fill="#fff" stroke="var(--ink)" stroke-width="6" stroke-linejoin="round"/>
    <path d="M240 70v-40M222 48h36" stroke="var(--ink)" stroke-width="7" stroke-linecap="round"/>
    <path d="M206 166V108l34-34 34 34v58" fill="#fff" stroke="var(--ink)" stroke-width="6" stroke-linejoin="round"/>
    <circle cx="240" cy="228" r="26" fill="#9fd0e8" stroke="var(--ink)" stroke-width="5"/><path d="M214 228h52M240 202v52" stroke="var(--ink)" stroke-width="4"/>
    <path d="M208 420v-70a32 32 0 0 1 64 0v70z" fill="var(--accent)" stroke="var(--ink)" stroke-width="5"/>
    <g fill="#9fd0e8" stroke="var(--ink)" stroke-width="4"><rect x="132" y="290" width="30" height="56" rx="15"/><rect x="318" y="290" width="30" height="56" rx="15"/></g>
    <path d="M208 420 150 456M272 420l58 36" stroke="var(--accent)" stroke-width="10" opacity=".4"/>
    <g fill="#5f8a55"><circle cx="64" cy="380" r="34"/><circle cx="420" cy="384" r="38"/><rect x="60" y="400" width="8" height="30"/><rect x="416" y="410" width="8" height="26"/></g>
    <path d="M0 436h480" stroke="var(--ink)" stroke-width="4" opacity=".3"/>`),

  boutique: wrap(`
    <rect width="480" height="456" fill="var(--surface)"/>
    <path d="M30 40h420l-24 56H54z" fill="var(--accent)"/>
    <g fill="#fff" opacity=".9"><path d="M54 96q18 22 36 0zM126 96q18 22 36 0zM198 96q18 22 36 0zM270 96q18 22 36 0zM342 96q18 22 36 0z"/></g>
    <g fill="var(--bg)"><rect x="48" y="150" width="384" height="12" rx="4"/><rect x="48" y="262" width="384" height="12" rx="4"/><rect x="48" y="374" width="384" height="12" rx="4"/></g>
    <g><rect x="70" y="102" width="0" height="0"/>
      <rect x="74" y="108" width="40" height="42" rx="6" fill="#f2c9a0"/><rect x="74" y="108" width="40" height="12" rx="3" fill="#c8895a"/><path class="flame" d="M94 100c-6-8 0-14 0-14s6 6 0 14z" fill="#ffb347"/>
      <rect x="150" y="104" width="34" height="46" rx="10" fill="#9ec5b0"/><path d="M167 104V92M156 92c4 6 8 6 11 0 3 6 7 6 11 0" fill="none" stroke="#5f8a55" stroke-width="4" stroke-linecap="round"/>
      <rect x="230" y="116" width="54" height="34" rx="4" fill="#e8b4bc"/><rect x="246" y="110" width="22" height="10" rx="3" fill="#d58b9a"/>
      <circle cx="350" cy="130" r="20" fill="none" stroke="#c9a14a" stroke-width="5"/><circle cx="350" cy="106" r="5" fill="#c9a14a"/>
      <rect x="396" y="108" width="28" height="42" rx="5" fill="#f1e4c3"/></g>
    <g><rect x="76" y="214" width="46" height="48" rx="6" fill="#9ec5b0"/><rect x="146" y="226" width="40" height="36" rx="6" fill="#f2c9a0"/><rect x="214" y="206" width="30" height="56" rx="12" fill="#e8b4bc"/><rect x="274" y="222" width="56" height="40" rx="6" fill="#d9c3ee"/><rect x="360" y="212" width="48" height="50" rx="8" fill="#f1e4c3"/></g>
    <g><path d="M80 372c8-40 44-40 52 0z" fill="#b4566a" opacity=".85"/><rect x="176" y="326" width="44" height="48" rx="8" fill="#c9a14a" opacity=".85"/><rect x="262" y="338" width="68" height="36" rx="6" fill="#9ec5b0"/><circle cx="378" cy="344" r="26" fill="#f2c9a0"/></g>
    <g fill="#fff" stroke="var(--ink)" stroke-width="2"><rect x="96" y="274" width="26" height="14" rx="2"/><rect x="224" y="274" width="26" height="14" rx="2"/><rect x="334" y="386" width="26" height="14" rx="2"/></g>`),

  restaurant: wrap(`
    <rect width="480" height="456" fill="var(--surface)"/>
    <path d="M0 30Q240 90 480 30" fill="none" stroke="var(--ink)" stroke-width="3" opacity=".5"/>
    <g><path d="M30 44l20 8v34l-20 4z" fill="#e8b04a"/><path d="M84 58l22 6v38l-22-2z" fill="#e85a4f"/><path d="M142 70l22 4v38l-22-2z" fill="#5fb37a"/><path d="M206 76l24 2v40l-24-2z" fill="#e8b04a"/><path d="M270 74l22-2v40l-22 2z" fill="#e85a4f"/><path d="M332 68l22-4v40l-22 4z" fill="#5fb37a"/><path d="M394 58l22-6v40l-22 6z" fill="#e8b04a"/><path d="M440 48l18-8v34l-18 8z" fill="#e85a4f"/></g>
    <ellipse cx="240" cy="360" rx="184" ry="34" fill="var(--accent)" opacity=".28"/>
    <ellipse cx="240" cy="330" rx="170" ry="52" fill="#f6efdc"/><ellipse cx="240" cy="326" rx="140" ry="40" fill="none" stroke="var(--accent)" stroke-width="4"/>
    <g><path d="M150 330a56 56 0 0 1 112 0z" fill="#e8c27a"/><path d="M170 322q10-30 36-26" fill="none" stroke="#c99a3e" stroke-width="3"/><path d="M212 332a52 52 0 0 1 104 0z" fill="#f0d08e"/>
       <circle cx="190" cy="308" r="9" fill="#5fb37a"/><circle cx="224" cy="300" r="8" fill="#e85a4f"/><circle cx="270" cy="306" r="9" fill="#5fb37a"/><circle cx="290" cy="318" r="7" fill="#e85a4f"/></g>
    <g transform="translate(66 250)"><path d="M0 70C0 30 14 8 40 0 38 36 26 62 0 70z" fill="#5fb37a"/><path d="M10 64 34 12" stroke="#2f7a4d" stroke-width="3"/></g>
    <g transform="translate(386 232) rotate(24)"><path d="M0 0c-20 6-26 34-14 56 6-2 8-8 10-14 4 8 12 10 20 6 8-26 2-46-16-48z" fill="#e85a4f"/><rect x="-6" y="-12" width="14" height="14" rx="4" fill="#2f7a4d"/></g>
    <g transform="translate(92 172)"><path d="M0 0h18v54H0z" fill="#f6efdc"/><path class="flame" d="M9-6c-8-10 0-18 0-18s8 8 0 18z" fill="#ffb347"/></g>
    <circle cx="410" cy="170" r="28" fill="#9ccf6a"/><path d="M382 170h56M410 142v56" stroke="#6fa83e" stroke-width="3"/>`),

  "game-store": wrap(`
    <rect width="480" height="456" fill="var(--surface)"/>
    <g stroke="var(--accent)" stroke-width="2" opacity=".35" fill="none"><path d="M0 330h480M0 360h480M0 396h480M0 440h480"/><path d="M240 300 20 456M240 300 100 456M240 300 180 456M240 300 300 456M240 300 380 456M240 300 460 456M240 300 240 456"/></g>
    <g fill="var(--accent)"><rect x="132" y="70" width="12" height="12"/><rect x="204" y="70" width="12" height="12"/><rect x="144" y="82" width="12" height="12"/><rect x="192" y="82" width="12" height="12"/><rect x="132" y="94" width="84" height="12"/><rect x="120" y="106" width="108" height="12"/><rect x="120" y="118" width="12" height="12"/><rect x="144" y="118" width="60" height="12"/><rect x="216" y="118" width="12" height="12"/><rect x="120" y="130" width="12" height="12"/><rect x="216" y="130" width="12" height="12"/><rect x="156" y="142" width="12" height="12"/><rect x="180" y="142" width="12" height="12"/></g>
    <g fill="#ffd84a"><rect x="308" y="86" width="10" height="10"/><rect x="338" y="86" width="10" height="10"/><rect x="318" y="96" width="30" height="10"/><rect x="298" y="106" width="70" height="10"/><rect x="308" y="116" width="10" height="10"/><rect x="338" y="116" width="10" height="10"/></g>
    <rect x="94" y="206" width="292" height="118" rx="48" fill="#2b2f6b" stroke="var(--accent)" stroke-width="6"/>
    <path d="M150 234v60M120 264h60" stroke="#eef0ff" stroke-width="12" stroke-linecap="round"/>
    <circle cx="320" cy="248" r="14" fill="#ff5d73"/><circle cx="352" cy="276" r="14" fill="#4ad0a6"/><circle cx="288" cy="276" r="14" fill="#ffd84a"/><circle cx="320" cy="304" r="0" fill="#fff"/>
    <g transform="translate(34 330)"><rect width="56" height="74" rx="6" fill="#4a3fbf"/><rect x="8" y="10" width="40" height="30" rx="4" fill="#9a8cff"/><rect x="14" y="52" width="28" height="6" rx="3" fill="#eef0ff"/></g>
    <g transform="translate(100 346)"><rect width="56" height="74" rx="6" fill="#d94a6a"/><rect x="8" y="10" width="40" height="30" rx="4" fill="#ff9db0"/><rect x="14" y="52" width="28" height="6" rx="3" fill="#eef0ff"/></g>
    <g transform="translate(366 330) rotate(12)"><rect width="64" height="64" rx="14" fill="#fff"/><g fill="#14173a"><circle cx="18" cy="18" r="5"/><circle cx="46" cy="18" r="5"/><circle cx="32" cy="32" r="5"/><circle cx="18" cy="46" r="5"/><circle cx="46" cy="46" r="5"/></g></g>`),
};

/* Emoji "photos" for the tile grids, by demo key and block id */
export const TILE_EMOJI = {
  "salon.gallery": ["💇‍♀️", "✂️", "🧡", "💈", "✨", "🌿"],
  "trades.areas": ["🚰", "🏘️", "🛠️", "🌲", "🏡", "🔧"],
  "auto-detailing.results": ["🚙", "🚗", "🛻", "✨", "🧽", "🚘"],
  "boutique.new": ["🕯️", "🧺", "💍", "🌿", "🎁", "🧴"],
  "game-store.shop": ["🎮", "🕹️", "📼", "🎲", "🃏", "👾"],
};

/* Extra blocks woven into each page. `after` is a block id (or "strip"), `before` likewise. */
export const EXTRAS = {
  "coffee-shop": [
    { after: "strip", t: "banner", label: "Today's special", text: "Cedar cortado plus an almond croissant, $7.50, until the tray is empty." },
    { after: "strip", t: "ticker", items: ["Beans roasted every Tuesday", "The dog bowl is always full", "Regulars' mugs live on the wall", "Oat milk from the Skagit Valley", "Open mic every second Friday", "Best seat: the corner table"] },
    { before: "reviews", t: "story", id: "story", initials: "DW", name: "Dana Whitfield", role: "Owner and head roaster", eyebrow: "Our story", title: "Ten years of bad office coffee started this.",
      quote: "I wanted a place where the barista knows your order by the second visit and the mug on the wall has your name on it. So I built one, one cup at a time.", facts: ["Roasts every Tuesday at 5am", "Has a mug named Gerald", "Favorite bean: Ethiopian Guji"] },
    { before: "reviews", t: "team", eyebrow: "Behind the counter", title: "The people pouring your coffee", members: [["Theo", "Lead barista", "Pours a rosetta with his eyes closed."], ["Mina", "Baker", "Up at 3am and somehow cheerful."], ["Sam", "Weekend crew", "Knows every regular's dog by name."]] },
    { before: "order", t: "faq", eyebrow: "Quick answers", title: "Before you come in", items: [["Do you have oat and almond milk?", "Both, and there is no upcharge for oat."], ["Can I work from here?", "Yes. Free Wi-Fi, outlets at the long table, and a quiet corner for calls."], ["Do you do catering?", "Coffee boxes for 10 to 50 people with a day's notice."]] },
  ],
  salon: [
    { after: "strip", t: "banner", label: "This week", text: "New clients get a free scalp treatment with any color service." },
    { after: "strip", t: "ticker", items: ["Walk-ins welcome", "Tea or sparkling water at the chair", "Your playlist, your appointment", "Kid-friendly Saturdays", "Free parking out back", "Gift cards in store and online"] },
    { before: "reviews", t: "story", id: "story", initials: "MO", name: "Maya Ortiz", role: "Owner and lead stylist", eyebrow: "Our story", title: "Appointments should never feel rushed.",
      quote: "I opened Fern & Fade because I wanted real consults and a cut you can actually style at home. If you leave happy and we have not rushed you, we did our job.", facts: ["12 years behind the chair", "Trained in Portland", "Will talk plants all day"] },
    { before: "book", t: "faq", eyebrow: "Good to know", title: "Before your first visit", items: [["How do I book?", "Online any time. You will get a text to confirm and a reminder the day before."], ["Not sure what you want?", "Bring photos. We start every visit with a short consult, no charge."], ["Do you cut kids' hair?", "Yes, ages 12 and under, and Saturdays are the calmest."]] },
  ],
  trades: [
    { after: "strip", t: "banner", label: "This month", text: "Furnace tune-up for $89, with a new filter and a full safety check." },
    { after: "strip", t: "ticker", items: ["Licensed in Washington", "Background-checked techs", "Shoe covers on every job", "Photos of finished work", "Flat-rate pricing before we start", "A text when we are on the way"] },
    { before: "reviews", t: "story", id: "story", initials: "MH", name: "Mike Hartley", role: "Owner and master plumber", eyebrow: "Who answers the phone", title: "One-truck shop values, bigger crew.",
      quote: "My dad ran a one-truck shop in Everett. I still answer the same way: tell me what is wrong, and I will tell you what it costs before we touch a wrench.", facts: ["20 years in the trade", "Two kids, one very large truck", "Always carries spare shoe covers"] },
    { before: "reviews", t: "team", eyebrow: "The crew", title: "Faces you will recognize at the door", members: [["Luis", "Service tech", "Can find a leak by sound alone."], ["Aaliyah", "Dispatch", "Knows every back road in the county."], ["Mike", "Owner", "Still takes the 2am emergency calls."]] },
    { before: "quote", t: "faq", eyebrow: "Quick answers", title: "What people ask us first", items: [["Do you charge for estimates?", "No. Estimates are free and the price you get is the price you pay."], ["Do you work weekends?", "Emergency calls any day. Scheduled work Monday through Saturday."], ["Are you licensed and insured?", "Yes, both, and we are happy to send the paperwork."]] },
  ],
  "auto-detailing": [
    { after: "strip", t: "banner", label: "Booking now", text: "Three Saturday slots left this month. Ceramic coatings book two weeks out." },
    { after: "strip", t: "ticker", items: ["We bring our own water and power", "Waterless wash option", "Pet hair is not a problem", "Interior steam cleaning", "Paint correction done by hand", "Ceramic coatings by appointment"] },
    { before: "reviews", t: "story", id: "story", initials: "TB", name: "Tyler Brooks", role: "Owner and detailer", eyebrow: "The story", title: "It started in a friend's driveway.",
      quote: "I detailed my buddies' trucks on weekends until the weekends filled up. Now the driveway comes to you, and the work is the same: slow, careful, and a little obsessive.", facts: ["500+ cars and counting", "Hates swirl marks", "Keeps the cleanest van in the county"] },
    { before: "book", t: "faq", eyebrow: "Good to know", title: "Before we pull up", items: [["Do I need to be home?", "No. We just need access to the car and a spot to work."], ["How long does it take?", "About 90 minutes for Express, four hours for Full Detail."], ["Do you need my water or power?", "Never. The van carries both."]] },
  ],
  church: [
    { after: "strip", t: "banner", label: "Coming up", text: "Christmas Eve services on Dec 24 at 5 and 7pm. Bring a friend and a neighbor." },
    { after: "strip", t: "ticker", items: ["Coffee in the lobby", "Nursery open every service", "Greeters and easy parking", "Live stream every Sunday", "Come as you are", "Fast, safe kids' check-in"] },
    { before: "give", t: "story", id: "story", initials: "BA", name: "Pastor Ben Alvarez", role: "Lead pastor", eyebrow: "A word of welcome", title: "We are neighbors first.",
      quote: "We are not perfect people. We are neighbors who show up for each other, ask honest questions, and share a meal often. You do not have to have it figured out to belong here.", facts: ["Dad of three", "Plays guitar, badly", "Coffee first, sermon prep second"] },
    { before: "give", t: "team", eyebrow: "Meet the team", title: "Friendly faces on Sunday", members: [["Ben", "Lead pastor", "Reads the room better than the weather."], ["Grace", "Kids director", "Owns a closet full of puppets."], ["Marcus", "Worship leader", "Never met a hymn he could not groove."]] },
    { before: "give", t: "faq", eyebrow: "Good to know", title: "First time? Start here", items: [["What should I wear?", "Whatever you are comfortable in. Jeans are common."], ["What about my kids?", "Check-in is quick and safe for nursery through grade 5."], ["How long is the service?", "About 70 minutes, with coffee afterward."]] },
  ],
  boutique: [
    { after: "strip", t: "banner", label: "Holiday market", text: "Preview night on Dec 6. Newsletter subscribers get 20% off." },
    { after: "strip", t: "ticker", items: ["Free gift wrapping", "Every maker has a name tag", "Pickup ready in 2 hours", "Dogs welcome", "New arrivals every Thursday", "Gift cards in any amount"] },
    { before: "visit", t: "story", id: "story2", initials: "CD", name: "Claire Dubois", role: "Owner", eyebrow: "The woman behind the counter", title: "One folding table, sixty makers later.",
      quote: "It started with a box of candles from my neighbor. Now I can tell you something about every maker on these shelves, and that is the whole point.", facts: ["Wraps a gift in 90 seconds", "Smells every candle, always", "Favorite aisle: the jewelry case"] },
    { before: "news", t: "faq", eyebrow: "Good to know", title: "Shopping with us", items: [["Can I pick up in store?", "Yes, free, and usually ready within two hours."], ["Do you wrap gifts?", "Always, and it is free. Ask for the ribbon you like."], ["Do you ship?", "Flat-rate shipping on orders over $40."]] },
  ],
  restaurant: [
    { after: "strip", t: "banner", label: "Tonight", text: "Live mariachi trio 6 to 8pm. Birria plate special, $14." },
    { after: "strip", t: "ticker", items: ["Tortillas pressed by hand", "Salsas made every morning", "Abuela's mole recipe", "Kids eat free on Sundays", "Vegetarian and gluten-free options", "Catering for 10 to 200"] },
    { before: "visit", t: "story", id: "story", initials: "RM", name: "Rosa Mendez", role: "Owner and head cook", eyebrow: "Our story", title: "Everything here started in a kitchen in Michoacan.",
      quote: "My grandmother taught me every recipe on this menu. We just make them in bigger pots. If it tastes like home, that is the highest compliment.", facts: ["Open since 1998", "The mole takes three days", "Her tortilla press is older than the restaurant"] },
    { before: "visit", t: "team", eyebrow: "In the kitchen", title: "The family behind the food", members: [["Rosa", "Owner and head cook", "Tastes every pot before service."], ["Mateo", "Grill", "Can flip a tortilla without looking."], ["Lucia", "Front of house", "Remembers your table, your salsa, your birthday."]] },
    { before: "order", t: "faq", eyebrow: "Good to know", title: "Before you come in", items: [["Do you take reservations?", "For parties of six or more. Everyone else is first come, first served."], ["Gluten-free options?", "Yes. Corn tortillas are the default, and we mark the menu clearly."], ["How big can catering get?", "Trays for 10 to 200 guests, delivered hot."]] },
  ],
  "game-store": [
    { after: "strip", t: "banner", label: "This Friday", text: "Friday Night Cards. $5 entry, prizes for the top three." },
    { after: "strip", t: "ticker", items: ["Cash or credit for trade-ins", "30-day warranty on everything", "Test any game in store", "Retro Saturday free play", "Preorders open now", "Gift cards at the counter"] },
    { before: "quote", t: "story", id: "story", initials: "JN", name: "Jay Nakamura", role: "Owner and head collector", eyebrow: "Who runs the place", title: "It began with duplicate cartridges and a dorm room.",
      quote: "I want everyone who walks in to leave with a game they are excited about. If we cannot find it, we will order it. That is the whole business.", facts: ["Owns 400 consoles, honestly", "Speedruns on weekends", "Still has not beaten that one game"] },
    { before: "quote", t: "team", eyebrow: "The crew", title: "Staff who actually play", members: [["Jay", "Owner", "Can price a cartridge from across the room."], ["Riley", "Repair tech", "Has revived consoles you gave up on."], ["Sam", "Events host", "Runs the loudest, friendliest game night."]] },
    { before: "quote", t: "faq", eyebrow: "Good to know", title: "Buying, selling, trading", items: [["How do trade-ins work?", "Bring your games or send a quote request. We pay cash or store credit, and credit pays more."], ["Do you test what you sell?", "Every game and console, with a 30-day warranty."], ["Can I preorder?", "Yes, with a small deposit that goes toward the game."]] },
  ],
};
