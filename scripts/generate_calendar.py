#!/usr/bin/env python3
"""Generate one research-backed week of Instagram content and write it to Google Sheets."""

import html
import json
import os
import re
import random
import sys
import time
from datetime import date, datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from urllib.parse import urlparse
from zoneinfo import ZoneInfo
import xml.etree.ElementTree as ET

import requests
from google.oauth2 import service_account
from googleapiclient.discovery import build

WIB = ZoneInfo("Asia/Jakarta")
MODEL_DEFAULT = "gemini-3.5-flash-lite"
NEWS_RSS = "https://news.google.com/rss/search"
CALENDAR_TAB = "Content Calendar"
REFERENCE_TAB = "Reference Library"
DAYS_ID = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
POSTING_TIMES = ["09:00", "12:15", "15:30", "18:45", "20:30"]
POST_FORMATS = ["Reels", "Carousel", "Feed (single image)"]
QUERIES = [
    "site:hbr.org leadership teams manager workplace when:365d",
    "site:gallup.com workplace manager employee engagement when:365d",
    "site:sloanreview.mit.edu leadership teamwork organization when:365d",
    "site:ccl.org leadership delegation feedback emotional intelligence when:365d",
    "site:shrm.org leadership workplace managers teams when:365d",
    "site:mckinsey.com/featured-insights leadership organization people when:365d",
    "site:atlassian.com/blog teamwork collaboration workplace when:365d",
    "site:apa.org workplace stress leadership teams when:365d",
    "site:greatergood.berkeley.edu empathy emotional intelligence work when:365d",
    "leadership team effectiveness workplace communication delegation research when:365d",
    "manager employee engagement emotional intelligence workplace study when:365d",
]
CAL_HEADERS = [
    "Publish Date", "Day", "Posting Time (WIB)", "Posts Per Day", "Format",
    "Content Pillar", "Topic", "Hook / Cover Text", "Production Plan / Slide Outline",
    "Caption Draft", "CTA", "Hashtags", "Reference 1 Title", "Reference 1 Publisher",
    "Reference 1 Published Date", "Reference 1 URL", "Reference 1 Summary",
    "Reference 2 Title", "Reference 2 Publisher", "Reference 2 Published Date",
    "Reference 2 URL", "Reference 2 Summary", "Creator Example Title", "Creator/Publisher", "Platform", "Example Content URL", "How to Adapt the Format", "Original Angle (Not a Copy)",
    "Fact-check Notes", "Status", "Generated At (WIB)"
]
REF_HEADERS = ["Reference ID", "Article Title", "Publisher", "Published Date", "Article URL", "Summary / Snippet", "Search Query", "Retrieved At (WIB)"]
CREATOR_TAB = "Creator Examples"
CREATOR_HEADERS = ["Example ID", "Content Title", "Creator/Publisher", "Platform", "Content URL", "Topic", "What to Study", "Retrieved At (WIB)"]
CREATOR_EXAMPLES = [
    {
        "id": "C1", "title": "A Smarter Way to Delegate: What to Keep vs. What to Hand Off",
        "creator": "Harvard Business Review", "platform": "LinkedIn post",
        "url": "https://www.linkedin.com/posts/harvard-business-review_a-smarter-way-to-delegate-what-to-keep-vs-activity-7377051137730056192-bHE0",
        "topic": "delegation, task ownership, leadership",
        "lesson": "Notice the direct promise, clear contrast, and practical framing. Create a different original hook and structure; do not copy wording."
    },
    {
        "id": "C2", "title": "Research on Delegating Shows How Uncomfortable We Are Making Choices for Others",
        "creator": "Harvard Business Review", "platform": "LinkedIn post",
        "url": "https://www.linkedin.com/posts/harvard-business-review_research-on-delegating-shows-how-uncomfortable-activity-7441976077155008512-M3Y5",
        "topic": "decision delegation, control, trust",
        "lesson": "Study how a research idea is converted into a concise question for professionals. Verify facts from a primary source before making claims."
    },
    {
        "id": "C3", "title": "How to Tell If You're Delegating Too Much — and What to Do About It",
        "creator": "Harvard Business Review", "platform": "LinkedIn post",
        "url": "https://www.linkedin.com/posts/harvard-business-review_how-to-tell-if-youre-delegating-too-much-activity-7496901240375853056-lCfM",
        "topic": "manager visibility, delegation, communication",
        "lesson": "Study the diagnostic framing: recognizable symptoms followed by a useful corrective direction. Do not reuse the exact title."
    },
    {
        "id": "C4", "title": "As Your Team Gets Bigger, Your Leadership Style Has to Adapt",
        "creator": "Harvard Business Review", "platform": "LinkedIn post",
        "url": "https://www.linkedin.com/posts/harvard-business-review_as-your-team-gets-bigger-your-leadership-activity-7185955843236855811-PaP0",
        "topic": "team growth, manager effectiveness, leadership",
        "lesson": "Study the clear contrast between a familiar situation and a leadership implication. Develop a distinct Indonesian workplace angle."
    },
    {
        "id": "C5", "title": "How to Delegate",
        "creator": "Harvard Business Review", "platform": "Publisher podcast/article",
        "url": "https://hbr.org/podcast/2023/09/how-to-delegate",
        "topic": "delegation, expectations, ownership",
        "lesson": "Use the expert discussion as a source for the structure of a practical explanation, then develop a fresh local scenario."
    },
    {
        "id": "C6", "title": "One Simple Leadership Skill Nobody Teaches (But Everyone Needs)",
        "creator": "Simon Sinek", "platform": "Publisher article",
        "url": "https://simonsinek.com/stories/one-simple-leadership-skill-nobody-teaches",
        "topic": "leadership, curiosity, communication",
        "lesson": "Study how a common workplace frustration opens a story before the lesson is explained. Do not imitate the author’s voice."
    }
]
HEADERS = {"User-Agent": "ArnoldWeeklyContentPlanner/1.0"}

def clean(value):
    value = re.sub(r"<[^>]+>", " ", value or "")
    return re.sub(r"\s+", " ", html.unescape(value)).strip()

def pub_date(value):
    try:
        dt = parsedate_to_datetime(value)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).date().isoformat()
    except Exception:
        return ""

def resolve_link(url):
    if "news.google.com" not in url:
        return url
    try:
        r = requests.get(url, headers=HEADERS, timeout=7, allow_redirects=True, stream=True)
        final = r.url
        r.close()
        if final and "news.google.com" not in urlparse(final).netloc:
            return final
    except requests.RequestException:
        pass
    return url

def fetch_references():
    items, errors = [], []
    for query in QUERIES:
        try:
            r = requests.get(NEWS_RSS, params={"q": query, "hl": "en-US", "gl": "US", "ceid": "US:en"}, headers=HEADERS, timeout=22)
            r.raise_for_status()
            root = ET.fromstring(r.content)
            for node in root.findall("./channel/item")[:10]:
                title = clean(node.findtext("title"))
                link = clean(node.findtext("link"))
                source = node.find("source")
                publisher = clean(source.text if source is not None else "")
                publisher_url = source.attrib.get("url", "") if source is not None else ""
                if not publisher and publisher_url:
                    publisher = urlparse(publisher_url).netloc.replace("www.", "")
                if title and link:
                    items.append({
                        "title": title,
                        "url": link,
                        "publisher": publisher or "Publisher in linked article",
                        "published_date": pub_date(node.findtext("pubDate")),
                        "summary": clean(node.findtext("description"))[:1400] or "No summary supplied by feed; inspect the linked source before using factual claims.",
                        "query": query,
                    })
        except (requests.RequestException, ET.ParseError) as exc:
            errors.append(f"{query}: {exc}")
        time.sleep(0.25)

    deduped, seen = [], set()
    for ref in items:
        key = (ref["title"].lower(), ref["url"])
        if key not in seen:
            seen.add(key)
            deduped.append(ref)
    if len(deduped) < 8:
        raise RuntimeError(f"Only {len(deduped)} distinct public sources found. Refusing to generate unsupported content. Try again later. {errors[-3:]}")
    for ref in deduped[:28]:
        ref["url"] = resolve_link(ref["url"])
    result, urls = [], set()
    for ref in deduped:
        if ref["url"] not in urls:
            urls.add(ref["url"])
            result.append(ref)
    return result[:38]

def expected_dates(start):
    """Create a stable, date-seeded 1-3 posts/day schedule to avoid duplicates on reruns."""
    values = []
    for i in range(7):
        d = start + timedelta(days=i)
        rng = random.Random(int(d.strftime("%Y%m%d")))
        count = rng.randint(1, 3)
        selected_times = sorted(rng.sample(POSTING_TIMES, count))
        selected_formats = rng.sample(POST_FORMATS, count)
        for idx, (clock, fmt) in enumerate(zip(selected_times, selected_formats), start=1):
            values.append({
                "date": d.isoformat(),
                "day": DAYS_ID[d.weekday()],
                "time_wib": clock,
                "format": fmt,
                "posts_that_day": count,
                "post_number": idx,
                "frequency": f"{count} post per hari",
            })
    return values

def generate_posts(schedule, refs, examples):
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not key:
        raise RuntimeError("Missing GEMINI_API_KEY secret.")
    model = os.environ.get("GEMINI_MODEL", "").strip() or MODEL_DEFAULT
    ref_payload = [{
        "id": f"R{i}",
        "title": ref["title"],
        "publisher": ref["publisher"],
        "published_date": ref["published_date"],
        "url": ref["url"],
        "summary": ref["summary"][:850],
    } for i, ref in enumerate(refs, 1)]
    example_payload = [{k: e[k] for k in ("id", "title", "creator", "platform", "url", "topic", "lesson")} for e in examples]
    system = """
You are a research-backed Indonesian editorial strategist for executive coach and leadership trainer Arnold Bolang.
Niche: leadership, team performance, manager effectiveness, delegation, communication, emotional intelligence,
workplace behavior, executive presence, and productivity. Create original, useful content for Indonesian professionals.
Do not copy a source's wording or mimic another creator's voice.

FACT RULES: use only source IDs and URLs given in the input. Never invent article URLs, statistics, studies, quotes,
testimonials, client stories, or first-person experiences for Arnold. Every post must cite at least one supplied reference ID.
If source summaries are weak, use them only as topic inspiration and do not make specific factual claims. No generic empty
"tips" lists: each post needs a real workplace scenario, a clear insight, and a practical takeaway. Avoid unsupported claims.
Return valid JSON only: {"posts":[...]} with exactly one post for each supplied schedule slot, in exact slot order. The total number of posts varies between 7 and 21 according to the schedule. Each item needs:
topic, pillar, hook, production_plan, caption, cta, hashtags (3-5), reference_ids (1-2), example_id, example_adaptation, original_angle, fact_check_notes.
Pillars allowed: Education, Point of View, Proof of Work, Personal Perspective.
Reels production_plan: concise 25-40 sec beat sheet including hook, explanation, concrete example, takeaway, and shot direction.
Carousel production_plan: cover plus 5-7 slide outline, one point per slide, final slide has a useful CTA.
Feed production_plan: visual concept, short in-image statement, and caption angle.
Caption: Indonesian, 80-150 words, concrete first line, useful explanation, applicable takeaway, natural CTA.
The source links are articles/reports for inspection, not necessarily Instagram posts. Do not describe them as Instagram posts.
""".strip()
    prompt = {
        "schedule": schedule,
        "available_public_sources": ref_payload,
        "public_creator_content_examples": example_payload,
        "strict_requirements": [
            "Return exactly one original post per supplied schedule slot (7 to 21 posts total), in the exact supplied order.",
            "Reference IDs must be from the supplied list only; each post must cite 1-2 source IDs.",
            "Hooks short enough for cover design; avoid repetitive topics and formulations.",
            "Choose the best-fitting example_id from public_creator_content_examples for every post and briefly explain example_adaptation. Treat it as a format reference, never copy its words.",
            "Each day has a predetermined randomized count of 1-3 posts, at distinct WIB times. Use the supplied schedule as fixed; do not alter date, time, or format. These are drafts for human review, not instructions to auto-publish.",
            "Do not invent or imply unverified stats or customer proof."
        ],
    }
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    resp = requests.post(url, headers={"Content-Type": "application/json", "x-goog-api-key": key},
        json={"systemInstruction": {"parts": [{"text": system}]},
              "contents": [{"role": "user", "parts": [{"text": json.dumps(prompt, ensure_ascii=False)}]}],
              "generationConfig": {"temperature": 0.5, "responseMimeType": "application/json", "maxOutputTokens": 20000}},
        timeout=150)
    if not resp.ok:
        raise RuntimeError(f"Gemini API HTTP {resp.status_code}: {resp.text[:1300]}")
    body = resp.json()
    try:
        raw = "\n".join(p.get("text", "") for p in body["candidates"][0]["content"]["parts"] if p.get("text")).strip()
    except (KeyError, IndexError, TypeError) as exc:
        raise RuntimeError(f"Unexpected Gemini response: {json.dumps(body)[:1000]}") from exc
    fence = chr(96) * 3
    lines = raw.splitlines()
    if lines and lines[0].strip().startswith(fence):
        lines = lines[1:]
    if lines and lines[-1].strip() == fence:
        lines = lines[:-1]
    try:
        parsed = json.loads("\n".join(lines).strip())
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Gemini response was not valid JSON: {raw[:1500]}") from exc
    posts = parsed.get("posts")
    if not isinstance(posts, list) or len(posts) != len(schedule):
        raise RuntimeError(f"Gemini must return exactly {len(schedule)} posts to match the scheduled time slots; received {len(posts) if isinstance(posts, list) else 'invalid output'}.")
    return posts

def sheet_service():
    sheet_id = os.environ.get("GOOGLE_SHEET_ID", "").strip()
    raw = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON", "").strip()
    if not sheet_id:
        raise RuntimeError("Missing GOOGLE_SHEET_ID secret.")
    if not raw:
        raise RuntimeError("Missing GOOGLE_SERVICE_ACCOUNT_JSON secret.")
    try:
        info = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise RuntimeError("GOOGLE_SERVICE_ACCOUNT_JSON must be the full service-account JSON file.") from exc
    creds = service_account.Credentials.from_service_account_info(info, scopes=["https://www.googleapis.com/auth/spreadsheets"])
    return build("sheets", "v4", credentials=creds, cache_discovery=False), sheet_id

def ensure_tabs(service, sid):
    meta = service.spreadsheets().get(spreadsheetId=sid, fields="sheets(properties(sheetId,title))").execute()
    tabs = {s["properties"]["title"]: s["properties"]["sheetId"] for s in meta.get("sheets", [])}
    missing = [n for n in [CALENDAR_TAB, REFERENCE_TAB, CREATOR_TAB] if n not in tabs]
    if missing:
        service.spreadsheets().batchUpdate(spreadsheetId=sid, body={"requests": [
            {"addSheet": {"properties": {"title": n}}} for n in missing
        ]}).execute()
        meta = service.spreadsheets().get(spreadsheetId=sid, fields="sheets(properties(sheetId,title))").execute()
        tabs = {s["properties"]["title"]: s["properties"]["sheetId"] for s in meta.get("sheets", [])}
    return tabs

def values_get(service, sid, range_name):
    return service.spreadsheets().values().get(spreadsheetId=sid, range=range_name, valueRenderOption="FORMATTED_VALUE").execute().get("values", [])

def ensure_header(service, sid, tab, headers):
    values = values_get(service, sid, f"'{tab}'!A1:AZ1")
    if not values or not any(str(x).strip() for x in values[0]):
        service.spreadsheets().values().update(spreadsheetId=sid, range=f"'{tab}'!A1", valueInputOption="RAW", body={"values": [headers]}).execute()
    elif any(h not in values[0] for h in headers):
        raise RuntimeError(f"Tab {tab!r} has incompatible headers. Use a new blank spreadsheet or align its header row.")

def known_slots(service, sid):
    """Read previously planned date/time keys, rather than blocking the whole date."""
    rows = values_get(service, sid, f"'{CALENDAR_TAB}'!A2:C")
    result = set()
    for row in rows:
        if len(row) < 3 or not row[0] or not row[2]:
            continue
        value = str(row[0]).strip()
        normalized_date = ""
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
            normalized_date = value
        else:
            for fmt in ("%m/%d/%Y", "%d/%m/%Y", "%d %b %Y"):
                try:
                    normalized_date = datetime.strptime(value, fmt).date().isoformat()
                    break
                except ValueError:
                    continue
        time_match = re.search(r"(\d{1,2}:\d{2})", str(row[2]))
        if normalized_date and time_match:
            hour, minute = map(int, time_match.group(1).split(":"))
            result.add(f"{normalized_date}|{hour:02d}:{minute:02d}")
    return result

def known_urls(service, sid):
    return {str(row[0]).strip() for row in values_get(service, sid, f"'{REFERENCE_TAB}'!E2:E") if row and str(row[0]).strip()}

def style_sheets(service, sid, tabs):
    reqs = []
    for tab in (CALENDAR_TAB, REFERENCE_TAB, CREATOR_TAB):
        sheet_id = tabs[tab]
        reqs.extend([
            {"updateSheetProperties": {"properties": {"sheetId": sheet_id, "gridProperties": {"frozenRowCount": 1}}, "fields": "gridProperties.frozenRowCount"}},
            {"repeatCell": {"range": {"sheetId": sheet_id, "startRowIndex": 0, "endRowIndex": 1},
             "cell": {"userEnteredFormat": {"backgroundColor": {"red": 0.035, "green": 0.09, "blue": 0.22},
             "textFormat": {"foregroundColor": {"red": 1, "green": 1, "blue": 1}, "bold": True},
             "verticalAlignment": "MIDDLE", "wrapStrategy": "WRAP"}},
             "fields": "userEnteredFormat(backgroundColor,textFormat,verticalAlignment,wrapStrategy)"}},
            {"repeatCell": {"range": {"sheetId": sheet_id, "startRowIndex": 1},
             "cell": {"userEnteredFormat": {"verticalAlignment": "TOP", "wrapStrategy": "WRAP"}},
             "fields": "userEnteredFormat(verticalAlignment,wrapStrategy)"}},
            {"updateDimensionProperties": {"range": {"sheetId": sheet_id, "dimension": "ROWS", "startIndex": 0, "endIndex": 1},
             "properties": {"pixelSize": 44}, "fields": "pixelSize"}},
        ])
    try:
        service.spreadsheets().batchUpdate(spreadsheetId=sid, body={"requests": reqs}).execute()
    except Exception as exc:
        print(f"Warning: optional sheet formatting failed: {exc}", file=sys.stderr)

def main():
    start_text = os.environ.get("START_DATE", "").strip()
    if start_text:
        try:
            start = date.fromisoformat(start_text)
        except ValueError as exc:
            raise RuntimeError("START_DATE must use YYYY-MM-DD, such as 2026-10-21.") from exc
    else:
        start = datetime.now(WIB).date()
    run_time = datetime.now(WIB).strftime("%Y-%m-%d %H:%M:%S WIB")
    required_secrets = ["GOOGLE_SHEET_ID", "GOOGLE_SERVICE_ACCOUNT_JSON", "GEMINI_API_KEY"]
    missing_secrets = [name for name in required_secrets if not os.environ.get(name, "").strip()]
    if missing_secrets:
        raise RuntimeError("Missing GitHub Actions secrets: " + ", ".join(missing_secrets) + ". Add them in Settings > Secrets and variables > Actions before running.")
    planned_slots = expected_dates(start)
    daily_counts = {}
    for slot in planned_slots:
        daily_counts[slot["date"]] = slot["posts_that_day"]
    print(f"Researching {len(planned_slots)} planned posts for {start.isoformat()} through {(start + timedelta(days=6)).isoformat()} WIB.")
    print("Posting frequency by date: " + ", ".join(f"{d}={count}" for d, count in daily_counts.items()))

    refs = fetch_references()
    print(f"Found {len(refs)} public source references.")
    posts = generate_posts(planned_slots, refs, CREATOR_EXAMPLES)
    source_map = {f"R{i}": ref for i, ref in enumerate(refs[:38], 1)}

    service, sid = sheet_service()
    tabs = ensure_tabs(service, sid)
    ensure_header(service, sid, CALENDAR_TAB, CAL_HEADERS)
    ensure_header(service, sid, REFERENCE_TAB, REF_HEADERS)
    ensure_header(service, sid, CREATOR_TAB, CREATOR_HEADERS)
    present = known_slots(service, sid)
    rows = []
    for offset, post in enumerate(posts):
        if not isinstance(post, dict):
            raise RuntimeError(f"Post {offset + 1} is not a JSON object.")
        slot = planned_slots[offset]
        d = date.fromisoformat(slot["date"])
        fmt, clock = slot["format"], slot["time_wib"]
        slot_key = f"{d.isoformat()}|{clock}"
        if slot_key in present:
            print(f"Skipping {slot_key}; that posting slot already exists.")
            continue
        ids = post.get("reference_ids", [])
        if isinstance(ids, str):
            ids = [ids]
        valid = [source_map[x] for x in ids if x in source_map][:2] if isinstance(ids, list) else []
        if not valid:
            raise RuntimeError(f"Post {offset + 1} has no valid source reference.")
        r1 = valid[0]
        r2 = valid[1] if len(valid) > 1 else {}
        example_map = {ex["id"]: ex for ex in CREATOR_EXAMPLES}
        requested_example = str(post.get("example_id", "")).strip()
        example = example_map.get(requested_example)
        if example is None:
            topic_words = (str(post.get("topic", "")) + " " + str(post.get("hook", ""))).lower()
            if any(word in topic_words for word in ("deleg", "mendeleg", "ownership", "tugas")):
                example = example_map["C1"]
            elif any(word in topic_words for word in ("tim", "team", "manager", "pemimpin", "kepemimpinan")):
                example = example_map["C4"]
            elif any(word in topic_words for word in ("komunikasi", "feedback", "emosi", "curiosity")):
                example = example_map["C6"]
            else:
                example = example_map["C2"]
        tags = post.get("hashtags", [])
        if isinstance(tags, str):
            tags = tags.split()
        tags = [t if str(t).startswith("#") else "#" + str(t).lstrip("#") for t in tags[:5]]
        rows.append([
            d.isoformat(), DAYS_ID[d.weekday()], f"{clock} WIB",
            f'{slot["posts_that_day"]} post/hari — slot {slot["post_number"]}/{slot["posts_that_day"]}', fmt,
            str(post.get("pillar", "Education")), str(post.get("topic", "")), str(post.get("hook", "")),
            str(post.get("production_plan", "")), str(post.get("caption", "")), str(post.get("cta", "")),
            " ".join(tags), r1.get("title", ""), r1.get("publisher", ""), r1.get("published_date", ""),
            r1.get("url", ""), r1.get("summary", ""), r2.get("title", ""), r2.get("publisher", ""),
            r2.get("published_date", ""), r2.get("url", ""), r2.get("summary", ""),
            example["title"], example["creator"], example["platform"], example["url"],
            str(post.get("example_adaptation", example["lesson"])), str(post.get("original_angle", "")),
            str(post.get("fact_check_notes", "")),
            "DRAFT — REVIEW BEFORE POSTING", run_time
        ])
        present.add(slot_key)
    if rows:
        service.spreadsheets().values().append(spreadsheetId=sid, range=f"'{CALENDAR_TAB}'!A1",
            valueInputOption="RAW", insertDataOption="INSERT_ROWS", body={"values": rows}).execute()
        print(f"Wrote {len(rows)} new calendar rows.")
    else:
        print("All selected date/time slots already exist; no duplicate calendar rows added.")

    urls = known_urls(service, sid)
    ref_rows = []
    for i, ref in enumerate(refs, 1):
        if ref["url"] not in urls:
            ref_rows.append([f"REF-{len(urls) + len(ref_rows) + 1:04d}", ref["title"], ref["publisher"],
                ref["published_date"], ref["url"], ref["summary"], ref["query"], run_time])
            urls.add(ref["url"])
    if ref_rows:
        service.spreadsheets().values().append(spreadsheetId=sid, range=f"'{REFERENCE_TAB}'!A1",
            valueInputOption="RAW", insertDataOption="INSERT_ROWS", body={"values": ref_rows}).execute()
        print(f"Wrote {len(ref_rows)} source references.")
    example_rows = [[e["id"], e["title"], e["creator"], e["platform"], e["url"], e["topic"], e["lesson"], run_time] for e in CREATOR_EXAMPLES]
    current_example_urls = {str(row[0]).strip() for row in values_get(service, sid, f"'{CREATOR_TAB}'!E2:E") if row and str(row[0]).strip()}
    fresh_example_rows = [row for row in example_rows if row[4] not in current_example_urls]
    if fresh_example_rows:
        service.spreadsheets().values().append(spreadsheetId=sid, range=f"'{CREATOR_TAB}'!A1",
            valueInputOption="RAW", insertDataOption="INSERT_ROWS", body={"values": fresh_example_rows}).execute()
        print(f"Wrote {len(fresh_example_rows)} curated creator/content examples.")
    style_sheets(service, sid, tabs)
    print("Done. Review every draft and fact-check it before posting.")
    print(f"Spreadsheet: https://docs.google.com/spreadsheets/d/{sid}/edit")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
