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
    'site:hbr.org leadership teams managers workplace when:365d',
    'site:gallup.com workplace manager employee engagement when:365d',
    'site:sloanreview.mit.edu leadership teamwork organization when:365d',
    'site:ccl.org leadership delegation feedback emotional intelligence when:365d',
    'site:shrm.org leadership workplace managers teams when:365d',
    'site:mckinsey.com/featured-insights leadership organization people when:365d',
    'site:atlassian.com/blog teamwork collaboration workplace when:365d',
    'site:apa.org workplace stress leadership teams when:365d',
    'site:greatergood.berkeley.edu empathy emotional intelligence work when:365d',
    'leadership team effectiveness workplace communication delegation research when:365d'
  ]
};

const CAL_HEADERS = [
  'Publish Date','Day','Daily Count / Slot','Posting Time (WIB)','Format','Content Pillar','Topic','Hook / Cover Text',
  'Production Plan / Slide Outline','Caption Draft','CTA','Hashtags',
  'Research Ref 1 Title','Research Ref 1 Publisher','Research Ref 1 Date','Research Ref 1 URL','Research Ref 1 Summary',
  'Research Ref 2 Title','Research Ref 2 Publisher','Research Ref 2 Date','Research Ref 2 URL','Research Ref 2 Summary',
  'Creator Example Title','Creator / Publisher','Platform','Creator Example URL','How to Adapt the Example',
  'Original Angle (Not a Copy)','Fact-check Notes','Status','Generated At (WIB)'
];
const REF_HEADERS = ['Reference ID','Article Title','Publisher','Published Date','Article URL','Summary / Snippet','Search Query','Retrieved At (WIB)'];
const EXAMPLE_HEADERS = ['Example ID','Content Title','Creator / Publisher','Platform','Content URL','Topic','What to Study','Added At (WIB)'];

// Public example links checked before being added. Learn the format; do not copy the content.
const EXAMPLES = [
  {id:'CE01',title:'A Smarter Way to Delegate: What to Keep vs. What to Hand Off',creator:'Harvard Business Review',platform:'LinkedIn post',url:'https://www.linkedin.com/posts/harvard-business-review_a-smarter-way-to-delegate-what-to-keep-vs-activity-7377051137730056192-bHE0',topic:'Delegation, task ownership, leadership',lesson:'Notice the direct promise and practical contrast; make a new Indonesian workplace angle.'},
  {id:'CE02',title:'Research on Delegating Shows How Uncomfortable We Are Making Choices for Others',creator:'Harvard Business Review',platform:'LinkedIn post',url:'https://www.linkedin.com/posts/harvard-business-review_research-on-delegating-shows-how-uncomfortable-activity-7441976077155008512-M3Y5',topic:'Delegation, decision ownership, trust',lesson:'Study how a research idea is framed as a concise professional question. Verify claims against the primary source.'},
  {id:'CE03',title:'How to Tell If You’re Delegating Too Much — and What to Do About It',creator:'Harvard Business Review',platform:'LinkedIn post',url:'https://www.linkedin.com/posts/harvard-business-review_how-to-tell-if-youre-delegating-too-much-activity-7404573157266980864-uza9',topic:'Delegation, management, communication',lesson:'Study the diagnostic structure: recognizable symptoms followed by corrective direction. Do not reuse the title.'},
  {id:'CE04',title:'As Your Team Gets Bigger, Your Leadership Style Has to Adapt',creator:'Harvard Business Review',platform:'LinkedIn post',url:'https://www.linkedin.com/posts/harvard-business-review_as-your-team-gets-bigger-your-leadership-activity-7194834344987742208-dQO2',topic:'Team growth, manager effectiveness, leadership',lesson:'Study the link between a familiar situation and a leadership implication; develop a different example.'},
  {id:'CE05',title:'How to Delegate',creator:'Harvard Business Review',platform:'HBR podcast / article',url:'https://hbr.org/podcast/2023/09/how-to-delegate',topic:'Delegation, clarity, expectations',lesson:'Use the expert discussion to inform a useful explanation, then develop an original practical framework.'},
  {id:'CE06',title:'One Simple Leadership Skill Nobody Teaches (But Everyone Needs)',creator:'Simon Sinek',platform:'Publisher article',url:'https://simonsinek.com/stories/one-simple-leadership-skill-nobody-teaches',topic:'Leadership, curiosity, communication',lesson:'Study how a common professional frustration opens a story; do not imitate the author’s voice.'}
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
  const now = Utilities.formatDate(new Date(), CFG.TZ, 'yyyy-MM-dd HH:mm:ss') + ' WIB';
  const rows = [];

  posts.forEach(function (post, index) {
    const slot = pending[index];
    if (!post || typeof post !== 'object') throw new Error('Post ' + (index + 1) + ' is not valid JSON.');
    const ids = Array.isArray(post.reference_ids) ? post.reference_ids : [post.reference_ids];
    const chosen = ids.map(function (id) { return sourceMap[String(id || '').trim()]; }).filter(Boolean).slice(0, 2);
    if (!chosen.length) throw new Error('Post ' + (index + 1) + ' has no valid public research reference.');
    const example = exampleMap[String(post.example_id || '').trim()] || chooseExample_(String(post.topic || '') + ' ' + String(post.hook || ''));
    const tagList = Array.isArray(post.hashtags) ? post.hashtags : String(post.hashtags || '').split(/\s+/);
    const tags = tagList.map(function (t) { return String(t || '').trim(); }).filter(Boolean).slice(0, 5)
      .map(function (t) { return t.charAt(0) === '#' ? t : '#' + t.replace(/^#+/, ''); }).join(' ');
    const r1 = chosen[0], r2 = chosen[1] || {};

    rows.push([
      slot.date, slot.day, slot.dailyCount + ' post/hari — slot ' + slot.postNumber + '/' + slot.dailyCount,
      slot.time + ' WIB', slot.format, String(post.pillar || 'Education'), String(post.topic || ''),
      String(post.hook || ''), String(post.production_plan || ''), String(post.caption || ''),
      String(post.cta || ''), tags,
      r1.title || '', r1.publisher || '', r1.publishedDate || '', r1.url || '', r1.summary || '',
      r2.title || '', r2.publisher || '', r2.publishedDate || '', r2.url || '', r2.summary || '',
      example.title, example.creator, example.platform, example.url, String(post.example_adaptation || example.lesson),
      String(post.original_angle || ''), String(post.fact_check_notes || ''),
      'DRAFT — REVIEW BEFORE POSTING', now
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
    const formats = shuffle_(CFG.FORMATS.slice(), rng).slice(0, count);
    times.forEach(function (time, index) {
      slots.push({date: iso, day: weekdays[day.getUTCDay()], time: time, format: formats[index], dailyCount: count, postNumber: index + 1});
    });
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
  const key = PropertiesService.getScriptProperties().getProperty(CFG.API_KEY_PROP);
  const sources = refs.slice(0, 35).map(function (r, i) {
    return {id: 'R' + (i + 1), title: r.title, publisher: r.publisher, published_date: r.publishedDate, url: r.url, summary: String(r.summary || '').slice(0, 800)};
  });
  const examples = EXAMPLES.map(function (e) {
    return {id:e.id,title:e.title,creator:e.creator,platform:e.platform,url:e.url,topic:e.topic,lesson:e.lesson};
  });
  const system = [
    'You are an Indonesian editorial strategist for executive coach and leadership trainer Arnold Bolang.',
    'Niche: leadership, team performance, manager effectiveness, delegation, communication, emotional intelligence, workplace behavior, executive presence, and productivity.',
    'Create useful content for Indonesian professionals and managers. Do not copy another creator’s wording or mimic an exact voice.',
    'Use only research references and example IDs supplied in the input. Never invent article URLs, publishers, dates, statistics, studies, quotations, testimonials, client stories, or first-person experiences for Arnold.',
    'Each post must cite 1–2 valid research reference IDs and select exactly one creator example ID. If the source summary is thin, avoid detailed factual claims.',
    'Adapt each source into an original Indonesian workplace angle, not a translation of the source headline. Each post needs a realistic workplace scenario, one clear insight and a practical takeaway.',
    'Return valid JSON only: {"posts":[...]} with exactly one post per supplied slot, in the same order. There can be 7–21 posts.',
    'Each post fields: topic, pillar, hook, production_plan, caption, cta, hashtags (array of 3–5), reference_ids (array of 1–2 IDs), example_id, example_adaptation, original_angle, fact_check_notes.',
    'Pillars: Education, Point of View, Proof of Work, Personal Perspective.',
    'Reels: 25–40-second outline, 0–3 second hook, insight, concrete example, takeaway, shot direction.',
    'Carousel: cover plus 5–7 slides, one point each, final slide useful CTA. Feed single-image: visual concept, short in-image statement and caption angle.',
    'Caption: Indonesian, roughly 80–150 words, strong opening, useful explanation, takeaway and natural CTA; no unverified claims.',
    'A source URL is an article/research reference or a format example, not necessarily an Instagram post. Do not fabricate content details.'
  ].join('\n');
  const prompt = {
    niche: 'Arnold Bolang — leadership coach and trainer',
    schedule_slots: slots,
    public_research_references: sources,
    public_creator_content_examples: examples,
    instructions: [
      'Return exactly one original post for every slot in the exact order.',
      'Do not change date, time, format or slot number.',
      'Use only provided reference IDs and choose one provided creator example ID.',
      'Avoid repeating the same topic or hook. No fake statistics, testimonials or personal stories.',
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
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.posts) || parsed.posts.length !== slots.length) throw new Error('Gemini returned an unexpected number of posts. Expected ' + slots.length + '.');
  return parsed.posts;
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
        all.push({
          title:title,url:link,
          publisher:source ? cleanText_(source.getText()) : publisherFromUrl_(link),
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
  const cell = sheet.getRange(1,1).getDisplayValue();
  if (sheet.getLastRow()===0 || !cell) sheet.getRange(1,1,1,headers.length).setValues([headers]);
  else {
    const current = sheet.getRange(1,1,1,headers.length).getDisplayValues()[0];
    const missing = headers.filter(function (h) { return current.indexOf(h)<0; });
    if (missing.length) throw new Error('Tab "'+name+'" has different headers. Use a new blank spreadsheet or rename that old tab; existing data will not be overwritten.');
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
    'Content Calendar':[105,85,170,125,150,155,240,280,380,460,220,190,300,180,120,350,420,300,180,120,350,420,310,190,160,360,340,320,320,210,175],
    'Reference Library':[105,320,200,120,390,450,300,175],
    'Creator Examples':[110,340,230,190,420,280,420,175]
  };
  (widths[sheet.getName()]||[]).forEach(function (w,i) { sheet.setColumnWidth(i+1,w); });
}

function populateExamples_(ss) {
  const sheet = ss.getSheetByName(CFG.EXAMPLES) || getSheetWithHeaders_(ss,CFG.EXAMPLES,EXAMPLE_HEADERS);
  const last = sheet.getLastRow();
  const urls = last>1 ? sheet.getRange(2,5,last-1,1).getDisplayValues().flat() : [];
  const known = {}; urls.forEach(function (u) { if (u) known[u]=true; });
  const now = Utilities.formatDate(new Date(),CFG.TZ,'yyyy-MM-dd HH:mm:ss')+' WIB';
  const rows = [];
  EXAMPLES.forEach(function (e) {
    if (known[e.url]) return;
    rows.push([e.id,e.title,e.creator,e.platform,e.url,e.topic,e.lesson,now]); known[e.url]=true;
  });
  if (rows.length) sheet.getRange(sheet.getLastRow()+1,1,rows.length,EXAMPLE_HEADERS.length).setValues(rows);
  styleSheet_(sheet);
}

function chooseExample_(text) {
  const s = String(text||'').toLowerCase();
  if (/deleg|mendeleg|ownership|tugas/.test(s)) return EXAMPLES[0];
  if (/tim|team|manager|pemimpin|kepemimpinan/.test(s)) return EXAMPLES[3];
  if (/komunikasi|feedback|emosi|curiosity/.test(s)) return EXAMPLES[5];
  return EXAMPLES[1];
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
