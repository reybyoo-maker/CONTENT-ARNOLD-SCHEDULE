/**
 * Arnold Bolang weekly Instagram content planner.
 * Runs inside the Google Sheet with Apps Script + Gemini API key only.
 * No Service Account, Google Sheets API setup, GitHub Actions, or server.
 */
const CFG = {
  TZ: 'Asia/Jakarta',
  INITIAL_DATE: '2026-10-21',
  MODEL: 'gemini-3.5-flash-lite',
  API_KEY_PROP: 'GEMINI_API_KEY',
  NEXT_DATE_PROP: 'ARNOLD_NEXT_START_DATE',
  SHEET_ID_PROP: 'ARNOLD_SPREADSHEET_ID',
  CALENDAR: 'Content Calendar',
  RESEARCH: 'Reference Library',
  EXAMPLES: 'Creator Examples',
  TIMES: ['09:00', '12:15', '15:30', '18:45', '20:30'],
  FORMATS: ['Reels', 'Carousel', 'Feed (single image)'],
  QUERIES: [
    // Search Arnold's public professional identity first; use only public, linkable material.
    'Arnold Priadi Bolang leadership coach manager team workplace when:365d',
    'site:linkedin.com/posts/arnold-priadi-bolang leadership team manager when:365d',
    // Trusted leadership, people-management, organizational-behavior and workplace-research publishers.
    'site:gallup.com/workplace manager team engagement workplace leadership when:365d',
    'site:ccl.org leadership manager feedback delegation emotional intelligence when:365d',
    'site:hbr.org leadership manager team delegation feedback workplace when:365d',
    'site:sloanreview.mit.edu leadership managers teams culture execution when:365d',
    'site:shrm.org leadership management employee relations team when:365d',
    'site:cipd.org people management leadership evidence managers workplace when:365d',
    'site:ddi.com research frontline leadership manager effectiveness when:365d',
    'site:mckinsey.com leadership frontline managers organizational health workplace when:365d',
    'site:apa.org workplace stress leadership managers teams when:365d',
    'site:rework.withgoogle.com teams effectiveness psychological safety when:365d',
    'leadership manager delegation feedback workplace case study real company when:365d',
    'Indonesian leadership supervisor team communication workplace case study when:365d'
  ]
};

const CAL_HEADERS = [
  'Publish Date','Day','Daily Count / Slot','Posting Time (WIB)','Format','Content Pillar','Topic','Hook / Cover Text',
  'Production Plan / Slide Outline','Caption Draft','CTA','Hashtags',
  'Research Ref 1 Title','Research Ref 1 Publisher','Research Ref 1 Date','Research Ref 1 URL','Research Ref 1 Summary',
  'Research Ref 2 Title','Research Ref 2 Publisher','Research Ref 2 Date','Research Ref 2 URL','Research Ref 2 Summary',
  'Creator Example Title','Creator / Publisher','Platform','Creator Example URL','How to Adapt the Example',
  'Original Angle (Not a Copy)','Fact-check Notes','Status','Generated At (WIB)',
  'Workplace Scenario / Case (with source status)','Carousel Slide Copy (per slide)','Creator Example Format Match'
];
const REF_HEADERS = ['Reference ID','Article Title','Publisher','Published Date','Article URL','Summary / Snippet','Search Query','Retrieved At (WIB)'];
const EXAMPLE_HEADERS = ['Example ID','Content Title','Creator / Publisher','Platform','Content URL','Topic','What to Study','Added At (WIB)','Best Format Match'];

// Public example links checked before being added. Learn the format; do not copy the content.
// Reference type is explicit. Only format-verified examples can be assigned to a draft of that type.
const EXAMPLES = [
  {id:'AB01',title:'Professional profile — Coach, Facilitator and Trainer',creator:'Arnold Priadi Bolang (first-party profile)',platform:'LinkedIn profile',url:'https://id.linkedin.com/in/arnold-priadi-bolang-70252a6b',topic:'Leadership development, personal growth, creative communication, adaptive transformation',formatMatch:'Brand source only — not a format example',lesson:'PRIMARY PERSONAL-BRAND SOURCE. Align topics with Arnold’s public positioning. Do not invent credentials, clients, results or biographical details.'},
  {id:'AB02',title:'Managing Change with Emotional Intelligence at Quipper',creator:'Arnold Priadi Bolang (first-party public post)',platform:'LinkedIn feed post with image',url:'https://www.linkedin.com/posts/arnold-priadi-bolang-70252a6b_manajemenperubahan-kecerdasanemosional-activity-7306144835407597568-nuA7',topic:'Change management, emotional intelligence, manager development, workplace training',formatMatch:'Feed (single image)',lesson:'PUBLIC FIELD SOURCE. The public post describes a two-day training for Quipper managers. Use only disclosed information; do not invent results or confidential details.'},
  {id:'AB03',title:'From Executor to Planner — Supervisor Refreshment with United Tractors',creator:'Arnold Priadi Bolang (first-party public post)',platform:'LinkedIn feed post with image',url:'https://www.linkedin.com/posts/arnold-priadi-bolang-70252a6b_peopledevelopment-leadership-pdca-activity-7341061749959233536-Svqx',topic:'Supervisor development, PDCA, from executor to planner, team management',formatMatch:'Feed (single image)',lesson:'PUBLIC FIELD SOURCE. The post describes a supervisor development session involving PDCA. Do not invent participant outcomes or client details.'},
  {id:'AB04',title:'Empat Tipe Orang di Dalam Tim — public post discussing an Instagram Reel',creator:'Arnold Priadi Bolang (first-party public post)',platform:'LinkedIn post mentioning Instagram Reels',url:'https://www.linkedin.com/posts/arnold-priadi-bolang-70252a6b_empat-tipe-orang-di-dalam-tim-activity-7165911292552134656-SQ3I',topic:'Team composition, behavior, leadership and team development',formatMatch:'Brand source only — not a direct video link',lesson:'Useful for brand and topic context only. The link opens a LinkedIn post that mentions an Instagram Reel, not the original Reel video, so do not use it as a format-matched video example.'},
  {id:'AB05',title:'Leading Innovation for Sustainable Business Growth at NEXA',creator:'Arnold Priadi Bolang (first-party public post)',platform:'LinkedIn feed post with image',url:'https://www.linkedin.com/posts/arnold-priadi-bolang-70252a6b_training-leadership-business-activity-7166235153613176832-Fh2G',topic:'Leadership, innovation, defining direction, sustainable growth',formatMatch:'Feed (single image)',lesson:'PUBLIC FIELD SOURCE. The post describes a training session at NEXA. Use it for brand context without inventing business outcomes.'},

  {id:'CE01',title:'A Smarter Way to Delegate: What to Keep vs. What to Hand Off',creator:'Harvard Business Review',platform:'LinkedIn post',url:'https://www.linkedin.com/posts/harvard-business-review_a-smarter-way-to-delegate-what-to-keep-vs-activity-7377051137730056192-bHE0',topic:'Delegation, task ownership, leadership',formatMatch:'General reference only — format not verified',lesson:'Useful for understanding the delegation topic; not selected as a format example because the visual format has not been independently verified.'},
  {id:'CE02',title:'Research on Delegating Shows How Uncomfortable We Are Making Choices for Others',creator:'Harvard Business Review',platform:'LinkedIn post',url:'https://www.linkedin.com/posts/harvard-business-review_research-on-delegating-shows-how-uncomfortable-activity-7441976077155008512-M3Y5',topic:'Delegation, decision ownership, trust',formatMatch:'General reference only — format not verified',lesson:'Use the idea only after reviewing the linked primary research; not selected as a format example.'},
  {id:'CE03',title:'How to Tell If You’re Delegating Too Much — and What to Do About It',creator:'Harvard Business Review',platform:'LinkedIn post',url:'https://www.linkedin.com/posts/harvard-business-review_how-to-tell-if-youre-delegating-too-much-activity-7404573157266980864-uza9',topic:'Delegation, management, communication',formatMatch:'General reference only — format not verified',lesson:'Useful for topic discovery; not selected as a format example because the visual format has not been verified.'},
  {id:'CE04',title:'As Your Team Gets Bigger, Your Leadership Style Has to Adapt',creator:'Harvard Business Review',platform:'LinkedIn post',url:'https://www.linkedin.com/posts/harvard-business-review_as-your-team-gets-bigger-your-leadership-activity-7194834344987742208-dQO2',topic:'Team growth, manager effectiveness, leadership',formatMatch:'General reference only — format not verified',lesson:'Useful for topic discovery; do not treat it as format inspiration unless the actual content format is verified.'},
  {id:'CE05',title:'How to Delegate',creator:'Harvard Business Review',platform:'Podcast / article',url:'https://hbr.org/podcast/2023/09/how-to-delegate',topic:'Delegation, clarity, expectations',formatMatch:'General reference only — audio/article',lesson:'Use expert ideas as background after reviewing the source; this is not a matched Instagram post-format example.'},
  {id:'CE06',title:'One Simple Leadership Skill Nobody Teaches (But Everyone Needs)',creator:'Simon Sinek',platform:'Publisher article',url:'https://simonsinek.com/stories/one-simple-leadership-skill-nobody-teaches',topic:'Leadership, curiosity, communication',formatMatch:'General reference only — article',lesson:'Use for topic context only, not as a visual-format example.'},
  {id:'CE07',title:'How Great Leaders Inspire Action',creator:'TED / Simon Sinek',platform:'YouTube video',url:'https://www.youtube.com/watch?v=qp0HIF3SfI4',topic:'Leadership purpose, communication, inspiring action',formatMatch:'Reels / Video',lesson:'Actual leadership video reference. Study spoken delivery, opening and narrative structure; create an original 25–40-second Reel. This source is long-form video, not an Instagram Reel.'},
  {id:'CE08',title:'Why Good Leaders Make You Feel Safe',creator:'TED / Simon Sinek',platform:'YouTube video',url:'https://www.youtube.com/watch?v=lmyZMtPVodo',topic:'Leadership trust, psychological safety, team culture',formatMatch:'Reels / Video',lesson:'Actual leadership video reference. Study visual and speaking structure, then adapt one distinct idea into an original short-form video. This source is long-form video, not an Instagram Reel.'},
  {id:'CE09',title:'4 Ways to Delegate and Build Future Leaders',creator:'Dhiraj Baadkar',platform:'LinkedIn carousel',url:'https://www.linkedin.com/posts/dhiraj-baadkar-lifeandrelationshipcoach_4-practical-ways-to-delegate-activity-7472872931010875392-RjHl',topic:'Delegation, ownership, building future leaders',formatMatch:'Carousel',lesson:'The publisher explicitly describes this post as a carousel. Study slide progression and practical framing; write original slide copy.'},
  {id:'CE10',title:'Leadership, Delegation and Accountability — Five Questions',creator:'Jeff Hancher',platform:'LinkedIn carousel',url:'https://www.linkedin.com/posts/jeff-hancher_leadership-delegation-accountability-activity-7498344771346886656-0os7',topic:'Delegation, accountability, clarifying expectations',formatMatch:'Carousel',lesson:'The publisher explicitly describes this post as a carousel. Study its question-driven sequence; never copy the text.'}
];


function onOpen() {
  SpreadsheetApp.getUi().createMenu('Arnold Content Planner')
    .addItem('1. Setup API key + spreadsheet automation', 'setupArnoldAutomation')
    .addItem('2. Generate first week (21–27 Oct 2026)', 'generateFirstWeek')
    .addItem('3. Generate next week now', 'runWeeklyGeneration')
    .addItem('4. Test Gemini API key', 'testGeminiApi')
    .addItem('5. Check setup status', 'showAutomationStatus')
    .addToUi();
}

function setupArnoldAutomation() {
  const ui = SpreadsheetApp.getUi();
  const answer = ui.prompt('Connect Gemini API', 'Paste your API key from Google AI Studio. It is stored in Apps Script Properties, not in a sheet cell.', ui.ButtonSet.OK_CANCEL);
  if (answer.getSelectedButton() !== ui.Button.OK) return;
  const key = String(answer.getResponseText() || '').trim();
  if (!key) { ui.alert('API key kosong. Jalankan Setup lagi dan masukkan Gemini API key.'); return; }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Open Apps Script from Extensions → Apps Script inside the target spreadsheet.');
  ss.setSpreadsheetTimeZone(CFG.TZ);
  const props = PropertiesService.getScriptProperties();
  props.setProperty(CFG.API_KEY_PROP, key);
  props.setProperty(CFG.SHEET_ID_PROP, ss.getId());
  if (!props.getProperty(CFG.NEXT_DATE_PROP)) props.setProperty(CFG.NEXT_DATE_PROP, CFG.INITIAL_DATE);

  ensureSheets_(ss);
  populateExamples_(ss);
  createWeeklyTrigger_();
  ui.alert('Setup selesai. Sheet tabs dan trigger mingguan sudah dibuat. Pilih Arnold Content Planner → Generate first week untuk membuat kalender awal.');
}

function generateFirstWeek() {
  requireSetup_();
  generateWeek_(CFG.INITIAL_DATE);
  const props = PropertiesService.getScriptProperties();
  const next = props.getProperty(CFG.NEXT_DATE_PROP) || CFG.INITIAL_DATE;
  if (next <= CFG.INITIAL_DATE) props.setProperty(CFG.NEXT_DATE_PROP, addDaysIso_(CFG.INITIAL_DATE, 7));
  SpreadsheetApp.getUi().alert('Kalender 21–27 Oktober sudah diproses. Periksa tab Content Calendar.');
}

function runWeeklyGeneration() {
  requireSetup_();
  const props = PropertiesService.getScriptProperties();
  const start = props.getProperty(CFG.NEXT_DATE_PROP) || CFG.INITIAL_DATE;
  const today = Utilities.formatDate(new Date(), CFG.TZ, 'yyyy-MM-dd');
  // If the first week was generated manually before the first Wednesday trigger,
  // do not generate the following week early.
  if (start > today) {
    Logger.log('Next calendar starts on ' + start + '; skipping early weekly trigger on ' + today + '.');
    return;
  }
  generateWeek_(start);
  props.setProperty(CFG.NEXT_DATE_PROP, addDaysIso_(start, 7));
}

function generateWeek_(startIso) {
  const ss = getSpreadsheet_();
  ensureSheets_(ss);
  populateExamples_(ss);
  const slots = buildSchedule_(startIso);
  const reelCount = slots.filter(function (slot) { return slot.format === 'Reels'; }).length;
  if (reelCount !== 1) throw new Error('Each seven-day calendar must contain exactly one Reels post; found ' + reelCount + '.');
  const calendar = ss.getSheetByName(CFG.CALENDAR);
  const existing = existingSlotKeys_(calendar);
  const pending = slots.filter(function (s) { return !existing.has(s.date + '|' + s.time); });

  const refs = collectReferences_();
  appendReferences_(ss.getSheetByName(CFG.RESEARCH), refs);
  if (!pending.length) { Logger.log('All date/time slots already exist. No duplicate calendar rows added.'); return; }

  const posts = generatePosts_(pending, refs);
  if (posts.length !== pending.length) throw new Error('Gemini returned ' + posts.length + ' posts, but ' + pending.length + ' were required. No calendar rows were written.');

  const sourceMap = {};
  refs.forEach(function (r, i) { sourceMap['R' + (i + 1)] = r; });
  const exampleMap = {};
  EXAMPLES.forEach(function (e) { exampleMap[e.id] = e; });
  validateDraftPosts_(posts, pending, sourceMap, exampleMap);
  const now = Utilities.formatDate(new Date(), CFG.TZ, 'yyyy-MM-dd HH:mm:ss') + ' WIB';
  const rows = [];

  posts.forEach(function (post, index) {
    const slot = pending[index];
    if (!post || typeof post !== 'object') throw new Error('Post ' + (index + 1) + ' is not valid JSON.');
    const ids = Array.isArray(post.reference_ids) ? post.reference_ids : [post.reference_ids];
    const chosen = ids.map(function (id) { return sourceMap[String(id || '').trim()]; }).filter(Boolean).slice(0, 2);
    if (!chosen.length) throw new Error('Post ' + (index + 1) + ' has no valid public research reference.');
    const example = exampleMap[String(post.example_id || '').trim()];
    if (!example || !exampleSupportsFormat_(example, slot.format)) {
      throw new Error('Post ' + (index + 1) + ' selected a content reference that does not match ' + slot.format + '. No calendar rows were written.');
    }
    const tagList = Array.isArray(post.hashtags) ? post.hashtags : String(post.hashtags || '').split(/\s+/);
    const tags = tagList.map(function (t) { return String(t || '').trim(); }).filter(Boolean).slice(0, 5)
      .map(function (t) { return t.charAt(0) === '#' ? t : '#' + t.replace(/^#+/, ''); }).join(' ');
    const r1 = chosen[0], r2 = chosen[1] || {};
    const caseSourceId = String(post.case_source_id || '').trim();
    const caseSource = sourceMap[caseSourceId] ||
      (caseSourceId.indexOf('AB') === 0 ? exampleMap[caseSourceId] : null);
    const caseLabel = String(post.case_type || '') === 'documented_case'
      ? 'KASUS NYATA — cek ulang detail pada sumber publik: '
      : 'SIMULASI SITUASI LAPANGAN — bukan klaim kejadian nyata: ';
    const caseNotes = caseLabel + String(post.case_or_field_scenario || '') +
      (caseSource ? '\nSumber kasus: ' + (caseSource.title || '') + '\n' + caseSource.url : '');

    rows.push([
      slot.date, slot.day, slot.dailyCount + ' post/hari — slot ' + slot.postNumber + '/' + slot.dailyCount,
      slot.time + ' WIB', slot.format, String(post.pillar || 'Leadership in Practice'), String(post.topic || ''),
      String(post.hook || ''), String(post.production_plan || ''), String(post.caption || ''),
      String(post.cta || ''), tags,
      r1.title || '', r1.publisher || '', r1.publishedDate || '', r1.url || '', r1.summary || '',
      r2.title || '', r2.publisher || '', r2.publishedDate || '', r2.url || '', r2.summary || '',
      example.title, example.creator, example.platform, example.url, String(post.example_adaptation || example.lesson),
      String(post.original_angle || ''), String(post.fact_check_notes || ''),
      'DRAFT — REVIEW BEFORE POSTING', now, caseNotes, formatCarouselSlides_(post, slot.format), example.formatMatch
    ]);
  });

  if (rows.length) {
    calendar.getRange(calendar.getLastRow() + 1, 1, rows.length, CAL_HEADERS.length).setValues(rows);
    calendar.getRange(2, 1, Math.max(calendar.getLastRow() - 1, 1), CAL_HEADERS.length).setWrap(true).setVerticalAlignment('top');
    Logger.log('Added ' + rows.length + ' post drafts for ' + startIso + ' through ' + addDaysIso_(startIso, 6) + '.');
  }
}

function buildSchedule_(startIso) {
  const slots = [];
  const weekdays = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const start = parseIsoDate_(startIso);
  for (let i = 0; i < 7; i++) {
    const day = new Date(start.getTime() + i * 86400000);
    const iso = Utilities.formatDate(day, 'UTC', 'yyyy-MM-dd');
    const rng = seededRandom_(Number(iso.replace(/-/g, '')));
    const count = 1 + Math.floor(rng() * 3);
    const times = shuffle_(CFG.TIMES.slice(), rng).slice(0, count).sort();
    times.forEach(function (time, index) {
      // Reels is assigned once per whole week below; individual days only use Carousel/Feed here.
      const format = rng() < 0.55 ? 'Carousel' : 'Feed (single image)';
      slots.push({date: iso, day: weekdays[day.getUTCDay()], time: time, format: format, dailyCount: count, postNumber: index + 1});
    });
  }
  if (!slots.length) throw new Error('No schedule slots could be created for ' + startIso + '.');
  const weeklyRng = seededRandom_(Number(String(startIso).replace(/-/g, '')) ^ 0x5A17C0DE);
  const reelIndex = Math.floor(weeklyRng() * slots.length);
  slots[reelIndex].format = 'Reels';
  if (slots.filter(function (slot) { return slot.format === 'Reels'; }).length !== 1) {
    throw new Error('The weekly schedule must contain exactly one Reels slot.');
  }
  return slots;
}

function seededRandom_(seed) {
  let state = seed >>> 0;
  return function () {
    state = (state + 0x6D2B79F5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle_(array, rng) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = array[i]; array[i] = array[j]; array[j] = temp;
  }
  return array;
}

function generatePosts_(slots, refs) {
  // Keep each Gemini request small so it is less likely to omit posts or truncate long carousel copy.
  const batchSize = 3;
  const batchPosts = [];
  for (let start = 0; start < slots.length; start += batchSize) {
    const batch = slots.slice(start, start + batchSize);
    const posts = generatePostsBatchWithRetry_(batch, refs, 2);
    Array.prototype.push.apply(batchPosts, posts);
  }
  if (batchPosts.length !== slots.length) {
    throw new Error('Internal batch generation mismatch: expected ' + slots.length +
      ' posts, received ' + batchPosts.length + '. No calendar rows were written.');
  }
  return batchPosts;
}

function generatePostsBatchWithRetry_(slots, refs, maxAttempts) {
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const posts = generatePostsBatch_(slots, refs);
      if (Array.isArray(posts) && posts.length === slots.length) return posts;
      throw new Error('Expected ' + slots.length + ' posts, received ' +
        (posts && posts.length !== undefined ? posts.length : 'no posts') + '.');
    } catch (e) {
      lastError = e;
      Logger.log('Gemini batch failed (' + slots.length + ' slot(s), attempt ' + attempt + '/' +
        maxAttempts + '): ' + e.message);
    }
  }

  // If a multi-slot request still misses posts after retrying, fall back to one slot per request.
  // This keeps the full calendar intact while preventing one long response from blocking all drafts.
  if (slots.length > 1) {
    Logger.log('Falling back to individual slot generation for ' + slots.length + ' slot(s).');
    const recovered = [];
    slots.forEach(function (slot) {
      const one = generatePostsBatchWithRetry_([slot], refs, 2);
      Array.prototype.push.apply(recovered, one);
    });
    return recovered;
  }

  throw new Error('Could not generate content for ' + slots[0].date + ' (' + slots[0].format +
    ') after ' + maxAttempts + ' attempts. Last error: ' +
    String(lastError && lastError.message || 'unknown Gemini response error') +
    '. No calendar rows were written. Open Apps Script → Executions for details.');
}

function generatePostsBatch_(slots, refs) {
  const key = PropertiesService.getScriptProperties().getProperty(CFG.API_KEY_PROP);
  const sources = refs.slice(0, 35).map(function (r, i) {
    return {id: 'R' + (i + 1), title: r.title, publisher: r.publisher, published_date: r.publishedDate, url: r.url, summary: String(r.summary || '').slice(0, 800)};
  });
  const examples = EXAMPLES.map(function (e) {
    return {id:e.id,title:e.title,creator:e.creator,platform:e.platform,url:e.url,topic:e.topic,lesson:e.lesson,format_match:e.formatMatch};
  });
  const system = [
    'You are the Indonesian editorial strategist for Arnold Priadi Bolang, a coach, facilitator and trainer. Build content aligned with his real, public professional positioning, not a generic influencer brand.',
    'PRIMARY NICHE: practical leadership, manager effectiveness, team performance, delegation, accountability, feedback, workplace communication, emotional intelligence, conflict, supervisor development, executive presence, decision-making, and productivity through better people management.',
    'EDITORIAL PRIORITY: at least 80% of posts must directly concern leadership, people management, teams or real workplace practice. AI/tool content is optional and limited to at most ONE post per 7-day batch; do not force AI into unrelated topics.',
    'Use Arnold personal-brand sources to understand publicly visible themes and real public field examples. Use public client/training context only when the supplied source explicitly supports it. Never invent Arnold’s experiences, clients, quotes, credentials, results or private details.',
    'Research must be reputable and linkable. Use only supplied research references and supplied public examples. Never invent URLs, publishers, dates, statistics, study results, quotations, testimonials or case-study facts. If a reference snippet is weak, avoid a specific factual claim and flag what must be checked in the full source.',
    'Every post must have 1–2 valid research reference IDs and exactly one supplied example_id from that specific slot’s allowed_creator_examples. The example format must exactly match the slot format. Never choose a general/article/profile reference as a content-format example.',
    'Every hook / cover text must be exactly 4–9 words, counted as words separated by spaces. This is a hard rule for Reels, Carousel and Feed. Avoid long explanatory hooks.',
    'For every post, choose case_type: documented_case only when supplied public references support the specific case and provide a valid case_source_id (R1... or AB01...); otherwise use illustrative_scenario and clearly present it as an example/simulation, not a true event.',
    'For Carousel posts, output exactly 7 carousel_slides objects. Each object has slide_number (1–7), role, slide_text, visual_direction. These must be READY-TO-USE on-slide sentences, not an outline or labels such as “explain the problem”. Slide 1 role is cover and its slide_text must exactly equal hook. Slides 2–6 each contain 1–2 concise, concrete sentences. Slide 7 role is CTA and contains a useful, natural call to action. Use the roles: cover, situation_lapangan, kesalahan_umum, analisis, respons_pemimpin, contoh_penerapan, CTA. Include a short visual direction per slide.',
    'For non-Carousel posts, carousel_slides must be an empty array.',
    'Reels: give a 25–40 second speaking script/production_plan with 0–3 second hook, scene-by-scene beats, concrete workplace example, takeaway and shot direction. Do not return only a vague outline.',
    'Feed (single image): include a short visual concept and a concise in-image statement; keep the full explanation in caption.',
    'Caption: Bahasa Indonesia, about 80–150 words, useful professional tone, clear insight, practical step and natural CTA. Avoid fake first-person anecdotes from Arnold.',
    'Pillars should fit: Leadership in Practice, Manager Toolkit, Team Performance, Delegation & Accountability, Communication & Emotional Intelligence, Workplace Case, Arnold Public Field Insight, or Professional Productivity. Do not use AI as a pillar unless the post genuinely requires it.',
    'Return valid JSON only: {"posts":[...]} with exactly one post per supplied slot, in the same order. Keep the response complete; never omit a slot or shorten required carousel slide copy.',
    'Required post fields: topic, pillar, hook, production_plan, carousel_slides, caption, cta, hashtags (array of 3–5), reference_ids (array of 1–2 valid R IDs), example_id, example_format_match, example_adaptation, original_angle, case_type, case_or_field_scenario, case_source_id (R ID or AB ID for documented cases, otherwise empty string), fact_check_notes.',
    'The research reference should support factual claims. A first-party Arnold post may be selected as case_source_id when the post refers specifically to a public example from Arnold. Do not imply that an external creator’s post is evidence of Arnold’s experience.',
    'Every schedule slot includes allowed_creator_examples filtered to the same format. Select example_id only from that list, and set example_format_match to the selected example’s exact format_match metadata.',
    'The full seven-day calendar has exactly one Reels slot. This request contains only a subset of that calendar: do not change or reassign the supplied format, and do not assume that this subset must contain a Reels slot.',
    'A Reels reference must open a video, a Carousel reference must explicitly be a carousel, and a Feed reference must be a single-image/static feed post. Do not substitute articles, profiles, or unverified-format posts.',
    'Source links are references to verify, not permission to copy. Create original explanations, examples, and slide sentences.'
  ].join('\n');
  const prompt = {
    niche: 'Arnold Priadi Bolang — coach, facilitator and trainer; practical leadership and people development',
    schedule_slots: slots.map(function (slot) {
      return {
        date: slot.date, day: slot.day, time: slot.time, format: slot.format,
        dailyCount: slot.dailyCount, postNumber: slot.postNumber,
        allowed_creator_examples: examples.filter(function (example) {
          return exampleSupportsFormat_(example, slot.format);
        }).map(function (example) {
          return {id:example.id,title:example.title,creator:example.creator,platform:example.platform,url:example.url,
            format_match:example.format_match,topic:example.topic,lesson:example.lesson};
        })
      };
    }),
    editorial_priorities: {
      min_share_leadership_people_management_and_workplace_practice: '80%',
      ai_related_posts: 'Prefer 0 AI-related posts. Do not make AI a topic in this generation batch; focus on leadership and workplace practice.',
      real_cases: 'Use only when a supplied reputable/public source supports the detail',
      otherwise: 'Use a clearly labelled illustrative workplace scenario, never present it as a true client story',
      field_focus: 'Manager and supervisor decisions, team friction, feedback conversations, delegation, accountability, performance, change and communication'
    },
    arnold_personal_brand_sources: examples.filter(function (e) { return e.id.indexOf('AB') === 0; }).map(function (e) {
      return {id:e.id,title:e.title,url:e.url,topic:e.topic,lesson:e.lesson};
    }),
    public_research_references: sources,
    instructions: [
      'Return exactly one original post for every slot in the exact order.',
      'Do not change date, time, format or slot number.',
      'Every hook must be exactly 4–9 words.',
      'For Carousel, deliver seven fully written slides, not just an outline; each slide needs actual on-slide copy.',
      'Use a reputable supplied R research reference for each post and choose the example_id only from that slot’s allowed_creator_examples.',
      'For the selected example, output example_format_match and make it exactly equal to the slot format family.',
      'Reels must use a direct video example, Carousel must use an identified carousel, Feed must use a static/single-image post. Do not use an article, profile or unverified-format post as a content format reference.',
      'The full seven-day calendar contains exactly one Reels slot, but this API request may contain only a subset. Do not change the specific format on any supplied slot. Do not force a Reels post into a subset with no Reels slot.',
      'At least 80% of topics must be leadership/people management/workplace practice. Prefer zero AI-related posts; do not make AI the topic of any post in this batch.',
      'Use documented cases only when source-backed; otherwise label the scenario as illustrative.',
      'Avoid repeating the same topic or hook. No fake statistics, testimonials or invented Arnold experiences.',
      'Drafts only. Do not publish to Instagram.'
    ]
  };

  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' + CFG.MODEL + ':generateContent';
  const response = UrlFetchApp.fetch(endpoint, {
    method: 'post', contentType: 'application/json', headers: {'x-goog-api-key': key},
    payload: JSON.stringify({
      systemInstruction: {parts:[{text:system}]},
      contents: [{role:'user',parts:[{text:JSON.stringify(prompt)}]}],
      generationConfig: {temperature:0.5,responseMimeType:'application/json',maxOutputTokens:20000}
    }),
    muteHttpExceptions: true
  });
  const status = response.getResponseCode(), text = response.getContentText();
  if (status < 200 || status >= 300) throw new Error('Gemini HTTP ' + status + '. Check API key, model and quota. ' + text.slice(0, 800));
  const body = JSON.parse(text);
  if (!body.candidates || !body.candidates[0] || !body.candidates[0].content) throw new Error('Gemini returned no content. Check Apps Script Executions and API quota.');
  const raw = (body.candidates[0].content.parts || []).map(function (p) { return p.text || ''; }).join('').trim();
  let parsed;
  try {
    parsed = parseGeminiJson_(raw);
  } catch (firstParseError) {
    Logger.log('Gemini output was invalid JSON; asking Gemini to repair the JSON format. First parse error: ' + firstParseError.message);
    parsed = repairGeminiJson_(endpoint, key, raw, firstParseError);
  }
  if (!Array.isArray(parsed.posts) || parsed.posts.length !== slots.length) {
    throw new Error('Gemini returned an unexpected number of posts. Expected ' + slots.length + ', received ' +
      (parsed.posts && parsed.posts.length !== undefined ? parsed.posts.length : 'no posts') +
      '. Re-run the generator; no calendar rows were written.');
  }
  return parsed.posts;
}

function parseGeminiJson_(text) {
  let value = String(text || '').trim();
  value = value.replace(/^\uFEFF/, '');
  value = value.replace(/^\x60\x60\x60(?:json)?\s*/i, '').replace(/\s*\x60\x60\x60\s*$/, '');
  return JSON.parse(value);
}

function repairGeminiJson_(endpoint, apiKey, invalidText, originalError) {
  // Retry once if the model returned malformed JSON despite responseMimeType=application/json.
  const repairInstruction = [
    'You are a strict JSON syntax repair tool.',
    'Repair the supplied text into syntactically valid JSON.',
    'Do not summarize, remove posts, or change the meaning of the content.',
    'Return one JSON object only, with the same top-level "posts" array and all posts preserved.',
    'Every object property name must use double quotes.',
    'Use double quotes for all string values. Escape quotation marks and newlines correctly.',
    'Remove trailing commas and comments. Do not wrap the output in Markdown fences.',
    'Do not invent or modify any URLs or source reference IDs.'
  ].join('\n');
  const repairPayload = {
    systemInstruction: {parts: [{text: repairInstruction}]},
    contents: [{role: 'user', parts: [{text: 'Repair this malformed JSON. Original parser error: ' +
      String(originalError && originalError.message || 'invalid JSON') +
      '\n\nMALFORMED JSON START\n' + String(invalidText || '').slice(0, 60000) + '\nMALFORMED JSON END'}]}],
    generationConfig: {temperature: 0, responseMimeType: 'application/json', maxOutputTokens: 20000}
  };
  const response = UrlFetchApp.fetch(endpoint, {
    method: 'post',
    contentType: 'application/json',
    headers: {'x-goog-api-key': apiKey},
    payload: JSON.stringify(repairPayload),
    muteHttpExceptions: true
  });
  const status = response.getResponseCode();
  const text = response.getContentText();
  if (status < 200 || status >= 300) {
    throw new Error('Gemini returned malformed JSON and the repair request failed with HTTP ' + status +
      '. First parse error: ' + (originalError && originalError.message || 'invalid JSON') +
      '. Details: ' + text.slice(0, 500));
  }
  let body;
  try {
    body = JSON.parse(text);
  } catch (e) {
    throw new Error('Gemini JSON-repair response was not valid API JSON: ' + e.message);
  }
  if (!body.candidates || !body.candidates[0] || !body.candidates[0].content) {
    throw new Error('Gemini could not repair the generated JSON. Check Apps Script → Executions and try generating again.');
  }
  const repairedText = (body.candidates[0].content.parts || []).map(function (p) { return p.text || ''; }).join('').trim();
  try {
    return parseGeminiJson_(repairedText);
  } catch (e) {
    Logger.log('JSON repair still failed: ' + e.message + '. Repaired response preview: ' + repairedText.slice(0, 600));
    throw new Error('Gemini generated malformed JSON twice. First error: ' +
      (originalError && originalError.message || 'invalid JSON') +
      '. Repair error: ' + e.message +
      '. Please run the generator again. No calendar rows were written.');
  }
}

function exampleSupportsFormat_(example, format) {
  if (!example) return false;
  const match = String(example.formatMatch || example.format_match || '').trim();
  if (format === 'Reels') return match === 'Reels / Video';
  if (format === 'Carousel') return match === 'Carousel';
  if (format === 'Feed (single image)') return match === 'Feed (single image)';
  return false;
}

function countWords_(text) {
  const value = String(text || '').trim();
  return value ? value.split(/\s+/).filter(Boolean).length : 0;
}

function validateDraftPosts_(posts, slots, sourceMap, exampleMap) {
  const errors = [];
  slots.forEach(function (slot, index) {
    const post = posts[index] || {};
    const hook = String(post.hook || '').trim();
    const hookWords = countWords_(hook);
    const label = 'Post ' + (index + 1) + ' (' + slot.date + ' ' + slot.format + ')';
    if (hookWords < 4 || hookWords > 9) errors.push(label + ': hook has ' + hookWords + ' words; required 4–9.');
    if (!String(post.topic || '').trim()) errors.push(label + ': topic is empty.');
    if (!String(post.case_or_field_scenario || '').trim()) errors.push(label + ': workplace case/scenario is empty.');
    const refIds = Array.isArray(post.reference_ids) ? post.reference_ids : [];
    if (!refIds.some(function (id) { return Boolean(sourceMap[String(id || '').trim()]); })) {
      errors.push(label + ': no valid public research reference ID.');
    }
    const exampleId = String(post.example_id || '').trim();
    const chosenExample = exampleMap[exampleId];
    if (!chosenExample) {
      errors.push(label + ': missing or invalid example_id.');
    } else if (!exampleSupportsFormat_(chosenExample, slot.format)) {
      errors.push(label + ': example_id ' + exampleId + ' is not a verified reference for ' + slot.format + '.');
    }
    if (chosenExample && String(post.example_format_match || '').trim() !== String(chosenExample.formatMatch || '')) {
      errors.push(label + ': example_format_match must match the selected example’s verified format metadata.');
    }
    const caseType = String(post.case_type || '').trim();
    const caseSourceId = String(post.case_source_id || '').trim();
    const caseSource = sourceMap[caseSourceId] || exampleMap[caseSourceId];
    if (caseType !== 'documented_case' && caseType !== 'illustrative_scenario') {
      errors.push(label + ': case_type must be documented_case or illustrative_scenario.');
    }
    if (caseType === 'documented_case' && !caseSource) {
      errors.push(label + ': documented case requires a valid case_source_id; use illustrative_scenario otherwise.');
    }
    if (caseType === 'illustrative_scenario' && caseSourceId) {
      errors.push(label + ': illustrative scenario must not claim a source-backed case_source_id.');
    }
    if (slot.format === 'Carousel') {
      const slides = Array.isArray(post.carousel_slides) ? post.carousel_slides : [];
      if (slides.length !== 7) {
        errors.push(label + ': carousel must contain exactly 7 fully written slides.');
      } else {
        if (String(slides[0].role || '').toLowerCase() !== 'cover') errors.push(label + ': carousel slide 1 role must be cover.');
        if (String(slides[6].role || '').toLowerCase() !== 'cta') errors.push(label + ': carousel slide 7 role must be CTA.');
        slides.forEach(function (slide, slideIndex) {
          if (!String(slide.slide_text || '').trim()) errors.push(label + ': slide ' + (slideIndex + 1) + ' has no final on-slide copy.');
          if (!String(slide.visual_direction || '').trim()) errors.push(label + ': slide ' + (slideIndex + 1) + ' has no visual direction.');
        });
        if (String(slides[0].slide_text || '').trim() !== hook) {
          errors.push(label + ': slide 1 copy must exactly match the 4–9-word hook.');
        }
      }
    } else if (Array.isArray(post.carousel_slides) && post.carousel_slides.length) {
      errors.push(label + ': non-Carousel post must have an empty carousel_slides array.');
    }
  });
  const aiPostCount = posts.filter(function (post) {
    const topicAndPillar = String(post.topic || '') + ' ' + String(post.pillar || '');
    return /\bAI\b|artificial intelligence|kecerdasan buatan|ChatGPT|generative AI|GenAI/i.test(topicAndPillar);
  }).length;
  if (aiPostCount > 1) {
    errors.push('Weekly editorial mix: found ' + aiPostCount + ' AI-focused post(s); the limit is one per 7-day batch.');
  }
  if (errors.length) {
    throw new Error('Draft validation stopped before any calendar rows were written.\n' +
      errors.slice(0, 12).join('\n') +
      (errors.length > 12 ? '\n…and ' + (errors.length - 12) + ' more issue(s).' : '') +
      '\nRun the generator again; if it repeats, review Apps Script → Executions.');
  }
}

function formatCarouselSlides_(post, format) {
  if (format !== 'Carousel') return '';
  const slides = Array.isArray(post.carousel_slides) ? post.carousel_slides : [];
  return slides.map(function (slide, index) {
    const number = Number(slide.slide_number) || (index + 1);
    const role = String(slide.role || 'slide').replace(/_/g, ' ').toUpperCase();
    return 'SLIDE ' + number + ' — ' + role + '\n' +
      String(slide.slide_text || '').trim() +
      (slide.visual_direction ? '\nArahan visual: ' + String(slide.visual_direction).trim() : '');
  }).join('\n\n');
}

function collectReferences_() {
  const all = [], seen = {};
  CFG.QUERIES.forEach(function (query) {
    const url = 'https://news.google.com/rss/search?q=' + encodeURIComponent(query) + '&hl=en-US&gl=US&ceid=US:en';
    try {
      const response = UrlFetchApp.fetch(url,{muteHttpExceptions:true,followRedirects:true});
      if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) return;
      const root = XmlService.parse(response.getContentText()).getRootElement();
      const channel = root.getChild('channel');
      if (!channel) return;
      channel.getChildren('item').slice(0,10).forEach(function (item) {
        const title = xmlText_(item,'title'), link = xmlText_(item,'link');
        if (!title || !link) return;
        const key = title.toLowerCase() + '|' + link;
        if (seen[key]) return;
        seen[key] = true;
        const source = item.getChild('source');
        const publisher = source ? cleanText_(source.getText()) : publisherFromUrl_(link);
        if (!isTrustedReference_(publisher, link, query)) return;
        all.push({
          title:title,url:link,
          publisher:publisher,
          publishedDate:parseRssDate_(xmlText_(item,'pubDate')),
          summary:cleanText_(xmlText_(item,'description')) || 'No short snippet supplied. Review the full linked article before making factual claims.',
          query:query
        });
      });
    } catch (e) { Logger.log('RSS query skipped: ' + query + ' — ' + e.message); }
    Utilities.sleep(120);
  });
  if (all.length < 8) throw new Error('Only ' + all.length + ' public articles were found. Stopped instead of inventing references. Try again later.');
  return all.slice(0,35);
}

function isTrustedReference_(publisher, url, query) {
  const p = String(publisher || '').toLowerCase();
  const u = String(url || '').toLowerCase();
  const q = String(query || '').toLowerCase();
  // LinkedIn is accepted only for searches explicitly targeting Arnold's public professional material.
  if (/arnold priadi bolang|linkedin\.com\/posts\/arnold-priadi-bolang/.test(q) &&
      /linkedin|arnold priadi bolang/.test(p + ' ' + u)) return true;
  return /harvard business review|hbr\.org|gallup|mit sloan|sloan management review|center for creative leadership|\bccl\b|shrm|mckinsey|atlassian|american psychological association|\bapa\b|greater good|berkeley|cipd|chartered institute of personnel|ddi|google rework|deloitte|stanford|harvard business school|\bhbs\b|world economic forum|weforum|nature\.com|frontiersin|pubmed|nih\.gov|national institutes of health|sloanreview\.mit\.edu|rework\.withgoogle\.com/.test(p + ' ' + u);
}

function appendReferences_(sheet, refs) {
  const last = sheet.getLastRow();
  const currentUrls = last > 1 ? sheet.getRange(2,5,last-1,1).getDisplayValues().flat() : [];
  const known = {};
  currentUrls.forEach(function (u) { if (u) known[u]=true; });
  const now = Utilities.formatDate(new Date(),CFG.TZ,'yyyy-MM-dd HH:mm:ss') + ' WIB';
  const rows = [];
  refs.forEach(function (r) {
    if (known[r.url]) return;
    known[r.url] = true;
    rows.push(['REF-'+String(last+rows.length).padStart(4,'0'),r.title,r.publisher,r.publishedDate,r.url,r.summary,r.query,now]);
  });
  if (rows.length) sheet.getRange(sheet.getLastRow()+1,1,rows.length,REF_HEADERS.length).setValues(rows);
}

function existingSlotKeys_(sheet) {
  const n = sheet.getLastRow()-1;
  const rows = n > 0 ? sheet.getRange(2,1,n,4).getDisplayValues() : [];
  const result = new Set();
  rows.forEach(function (r) {
    const d = normalizeDate_(r[0]), match = String(r[3]||'').match(/(\d{1,2}:\d{2})/);
    if (!d || !match) return;
    const p = match[1].split(':');
    result.add(d+'|'+p[0].padStart(2,'0')+':'+p[1]);
  });
  return result;
}

function ensureSheets_(ss) {
  const sheets = [
    getSheetWithHeaders_(ss,CFG.CALENDAR,CAL_HEADERS),
    getSheetWithHeaders_(ss,CFG.RESEARCH,REF_HEADERS),
    getSheetWithHeaders_(ss,CFG.EXAMPLES,EXAMPLE_HEADERS)
  ];
  sheets.forEach(styleSheet_);
}

function getSheetWithHeaders_(ss,name,headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  }
  const cell = sheet.getRange(1,1).getDisplayValue();
  if (sheet.getLastRow()===0 || !cell) {
    sheet.getRange(1,1,1,headers.length).setValues([headers]);
  } else {
    const current = sheet.getRange(1,1,1,headers.length).getDisplayValues()[0];
    for (let i = 0; i < headers.length; i++) {
      if (current[i] === headers[i]) continue;
      if (!current[i] && current.slice(i).every(function (value) { return !value; })) {
        sheet.getRange(1,i+1).setValue(headers[i]);
        continue;
      }
      throw new Error('Tab "'+name+'" has a different header at column '+(i+1)+'. Existing data was not overwritten. Check the header row or use a new blank spreadsheet.');
    }
  }
  return sheet;
}

function styleSheet_(sheet) {
  const cols = sheet.getLastColumn();
  if (!cols) return;
  sheet.setFrozenRows(1); sheet.setRowHeight(1,42);
  sheet.getRange(1,1,1,cols).setBackground('#07162f').setFontColor('#ffffff').setFontWeight('bold').setWrap(true).setVerticalAlignment('middle');
  if (sheet.getLastRow()>1) sheet.getRange(2,1,sheet.getLastRow()-1,cols).setWrap(true).setVerticalAlignment('top');
  const widths = {
    'Content Calendar':[105,85,170,125,150,155,240,280,380,460,220,190,300,180,120,350,420,300,180,120,350,420,310,190,160,360,340,320,320,210,175,390,500,245],
    'Reference Library':[105,320,200,120,390,450,300,175],
    'Creator Examples':[110,340,230,190,420,280,420,175,255]
  };
  (widths[sheet.getName()]||[]).forEach(function (w,i) { sheet.setColumnWidth(i+1,w); });
}

function populateExamples_(ss) {
  const sheet = ss.getSheetByName(CFG.EXAMPLES) || getSheetWithHeaders_(ss,CFG.EXAMPLES,EXAMPLE_HEADERS);
  const last = sheet.getLastRow();
  const urls = last > 1 ? sheet.getRange(2,5,last-1,1).getDisplayValues().flat() : [];
  const rowByUrl = {};
  urls.forEach(function (url, index) { if (url) rowByUrl[url] = index + 2; });
  const now = Utilities.formatDate(new Date(),CFG.TZ,'yyyy-MM-dd HH:mm:ss')+' WIB';
  const rows = [];
  EXAMPLES.forEach(function (e) {
    if (rowByUrl[e.url]) {
      // Keep existing records and fill/update only the new format-match metadata column.
      sheet.getRange(rowByUrl[e.url],9).setValue(e.formatMatch);
      return;
    }
    rows.push([e.id,e.title,e.creator,e.platform,e.url,e.topic,e.lesson,now,e.formatMatch]);
    rowByUrl[e.url] = sheet.getLastRow() + rows.length;
  });
  if (rows.length) sheet.getRange(sheet.getLastRow()+1,1,rows.length,EXAMPLE_HEADERS.length).setValues(rows);
  styleSheet_(sheet);
}

function chooseExample_(text) {
  const s = String(text || '').toLowerCase();
  const options = EXAMPLES.filter(function (e) {
    return e.formatMatch === 'Feed (single image)' && /leadership|team|manager|deleg|feedback|komunikasi|emosi|tugas/.test(s);
  });
  return options.length ? options[0] : null;
}

function testGeminiApi() {
  const key = PropertiesService.getScriptProperties().getProperty(CFG.API_KEY_PROP);
  if (!key) { SpreadsheetApp.getUi().alert('API key belum tersimpan. Jalankan Setup terlebih dahulu.'); return; }
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/'+CFG.MODEL+':generateContent';
  const response = UrlFetchApp.fetch(url,{
    method:'post',contentType:'application/json',headers:{'x-goog-api-key':key},
    payload:JSON.stringify({contents:[{role:'user',parts:[{text:'Reply exactly: GEMINI API OK'}]}],generationConfig:{temperature:0,maxOutputTokens:20}}),
    muteHttpExceptions:true
  });
  const status=response.getResponseCode();
  SpreadsheetApp.getUi().alert(status>=200&&status<300
    ? 'Gemini API tersambung. Model: '+CFG.MODEL
    : 'Gemini HTTP '+status+'. Periksa key, model dan kuota. Detail: '+response.getContentText().slice(0,700));
}

function createWeeklyTrigger_() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction()==='runWeeklyGeneration') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('runWeeklyGeneration').timeBased()
    .onWeekDay(ScriptApp.WeekDay.WEDNESDAY).atHour(7).nearMinute(10).everyWeeks(1).inTimezone(CFG.TZ).create();
}

function showAutomationStatus() {
  const p=PropertiesService.getScriptProperties();
  const hasKey=Boolean(p.getProperty(CFG.API_KEY_PROP));
  const next=p.getProperty(CFG.NEXT_DATE_PROP)||CFG.INITIAL_DATE;
  const trigger=ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction()==='runWeeklyGeneration'; });
  SpreadsheetApp.getUi().alert('Gemini API key: '+(hasKey?'saved':'not saved')+'\nWeekly trigger: '+(trigger?'installed':'not installed')+'\nNext week begins: '+next+'\nTimezone: '+CFG.TZ);
}

function requireSetup_() {
  const p=PropertiesService.getScriptProperties();
  if (!p.getProperty(CFG.API_KEY_PROP)) throw new Error('Gemini API key missing. Run Setup from Arnold Content Planner menu.');
  if (!p.getProperty(CFG.SHEET_ID_PROP)) {
    const ss=SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error('Open the target spreadsheet and run Setup first.');
    p.setProperty(CFG.SHEET_ID_PROP,ss.getId());
  }
}

function getSpreadsheet_() {
  const id=PropertiesService.getScriptProperties().getProperty(CFG.SHEET_ID_PROP);
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function xmlText_(element,name) {
  const child=element.getChild(name);
  return child ? String(child.getText()||'').trim() : '';
}

function cleanText_(text) {
  return String(text||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ')
    .replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
}

function publisherFromUrl_(url) {
  const match=String(url||'').match(/^https?:\/\/(?:www\.)?([^/]+)/i);
  return match ? match[1] : '';
}

function parseRssDate_(text) {
  if (!text) return '';
  const d=new Date(text);
  return isNaN(d.getTime()) ? '' : Utilities.formatDate(d,'UTC','yyyy-MM-dd');
}

function parseIsoDate_(iso) {
  const p=String(iso).split('-').map(Number);
  if (p.length!==3||!p[0]||!p[1]||!p[2]) throw new Error('Use YYYY-MM-DD date format.');
  return new Date(Date.UTC(p[0],p[1]-1,p[2],12,0,0));
}

function addDaysIso_(iso,days) {
  const d=parseIsoDate_(iso); d.setUTCDate(d.getUTCDate()+days);
  return Utilities.formatDate(d,'UTC','yyyy-MM-dd');
}

function normalizeDate_(value) {
  const s=String(value||'').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d=new Date(s);
  return isNaN(d.getTime()) ? '' : Utilities.formatDate(d,'UTC','yyyy-MM-dd');
}
