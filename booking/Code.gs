/**
 * Sumatra Orangutan Hiking — booking web app
 *
 * This file does two jobs:
 *   GET  — busy days from the operator calendar, as a JSON array of YYYY-MM-DD
 *   POST — email the operator and send the visitor a short auto-reply
 *
 * DEPLOY (manual — do this in the Google account that owns the calendar)
 * 1. Open https://script.google.com and create a project.
 * 2. Paste this whole file into Code.gs, replacing the sample.
 * 3. Project Settings → Time zone → Asia/Jakarta. The calendar should use
 *    Asia/Jakarta as well, so all-day events land on the right date.
 * 4. Confirm this Google account can see the calendar in CALENDAR_ID
 *    (open Google Calendar and make sure that calendar is listed).
 * 5. In the editor, choose the function doGet and click Run. Approve
 *    Calendar and Gmail when Google asks. A successful run returns a
 *    JSON array (it may be empty).
 * 6. Deploy → New deployment → type: Web app.
 *      Execute as: Me
 *      Who has access: Anyone
 *      (not "Anyone with a Google account" — visitors are not signed in)
 * 7. Copy the URL that ends in /exec.
 * 8. In the website, replace PASTE_APPS_SCRIPT_WEB_APP_URL_HERE in
 *    js/booking.js with that URL.
 * 9. Open the /exec URL in a browser. You should see a JSON array of
 *    dates, with no event titles.
 *
 * After later edits: Deploy → Manage deployments → pencil → Version:
 * New version → Deploy. The /exec URL stays the same.
 *
 * CORS: a Web app deployed as Anyone sends the headers the static site
 * needs. ContentService cannot set them itself. The page posts JSON with
 * a text/plain content type so the browser does not send a preflight.
 *
 * The response is busy dates only. Do not add titles, locations, or
 * descriptions — this URL is public.
 *
 * A consumer Gmail account can send about 100 messages a day. Each
 * request sends two (operator + visitor).
 */

const CALENDAR_ID = "0ce660ab58544e239f4e7ce6d7aae62cbe1c6e049e3b10976b7890ec2edad6e9@group.calendar.google.com";
const OPERATOR_EMAIL = "sumatraorangutanhiking@gmail.com";
const TZ = "Asia/Jakarta";

const TREKS = [
  "Easy Trek (4hr, €35)",
  "Relax Trek (1 day, €60)",
  "Orangutan Trek (2D1N, €110)",
  "Explore Trek (3D2N, €155)",
  "Adventure Trek (4D3N, €240)",
  "Adventure Long Trek (5D4N, €310)",
  "Not sure yet"
];

function doGet() {
  return json_(busyDates_());
}

function doPost(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error("Missing request body");
  }

  var data = JSON.parse(e.postData.contents);
  if (clean_(data.website)) {
    return json_({ ok: true });
  }

  var trek = clean_(data.trek);
  var name = clean_(data.name);
  var email = clean_(data.email);
  var message = clean_(data.message);
  var date = clean_(data.date);
  var party = Number(data.partySize);

  if (TREKS.indexOf(trek) === -1) throw new Error("Unknown trek");
  if (!name || name.length > 120) throw new Error("Name");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) throw new Error("Email");
  if (typeof data.partySize === "string" && !/^\d+$/.test(data.partySize)) throw new Error("Party size");
  if (party !== Math.floor(party) || party < 1 || party > 99) throw new Error("Party size");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Date");
  if (message.length > 2000) throw new Error("Message");

  var operatorBody = [
    "New trek request",
    "",
    "Trek: " + trek,
    "Name: " + name,
    "Email: " + email,
    "Party size: " + party,
    "Preferred start date: " + date,
    "Message: " + (message || "(none)"),
    "",
    "No payment has been taken. Confirm availability and arrange payment by email.",
    "The date above is the requested start. Check the full length of the trek against the calendar."
  ].join("\n");

  GmailApp.sendEmail(OPERATOR_EMAIL, "Trek request: " + trek + " — " + name + " — " + date, operatorBody, {
    replyTo: OPERATOR_EMAIL,
    name: "Sumatra Orangutan Hiking"
  });

  var visitorBody = [
    "Hello " + name + ",",
    "",
    "We received your trek request (" + trek + ", starting " + date + ", " + party + " people).",
    "",
    "We'll email you within 24–48 hours to confirm availability and arrange payment. No payment has been taken yet.",
    "",
    "Sumatra Orangutan Hiking",
    OPERATOR_EMAIL,
    "+62 851-8807-7037"
  ].join("\n");

  GmailApp.sendEmail(email, "We received your trek request", visitorBody, {
    replyTo: OPERATOR_EMAIL,
    name: "Sumatra Orangutan Hiking"
  });

  return json_({ ok: true });
}

function busyDates_() {
  var calendar = CalendarApp.getCalendarById(CALENDAR_ID);
  if (!calendar) throw new Error("Calendar not found");

  var startKey = dayKey_(new Date());
  var endKey = addMonthsKey_(startKey, 6);
  var rangeStart = keyToDate_(startKey);
  var rangeEnd = keyToDate_(shiftKey_(endKey, 1));
  var events = calendar.getEvents(rangeStart, rangeEnd);
  var seen = {};

  events.forEach(function (event) {
    var first = dayKey_(event.getStartTime());
    var last = dayKey_(event.getEndTime());
    if (Utilities.formatDate(event.getEndTime(), TZ, "HH:mm:ss") === "00:00:00") {
      last = shiftKey_(last, -1);
    }
    if (last < first) last = first;
    if (first < startKey) first = startKey;
    if (last > endKey) last = endKey;
    if (last < first) return;

    var cursor = first;
    var guard = 0;
    while (cursor <= last && guard < 400) {
      if (cursor >= startKey && cursor <= endKey) seen[cursor] = true;
      cursor = shiftKey_(cursor, 1);
      guard++;
    }
  });

  return Object.keys(seen).sort();
}

function dayKey_(date) {
  return Utilities.formatDate(date, TZ, "yyyy-MM-dd");
}

function addMonthsKey_(key, months) {
  var parts = key.split("-");
  var utc = new Date(Date.UTC(
    Number(parts[0]),
    Number(parts[1]) - 1 + months,
    Number(parts[2]),
    12, 0, 0
  ));
  return Utilities.formatDate(utc, TZ, "yyyy-MM-dd");
}

function shiftKey_(key, days) {
  var parts = key.split("-");
  var utc = new Date(Date.UTC(
    Number(parts[0]),
    Number(parts[1]) - 1,
    Number(parts[2]) + days,
    12, 0, 0
  ));
  return Utilities.formatDate(utc, TZ, "yyyy-MM-dd");
}

function keyToDate_(key) {
  var parts = key.split("-");
  return new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), -7, 0, 0));
}

function clean_(value) {
  return String(value == null ? "" : value).replace(/[\r\n]+/g, " ").trim();
}

function json_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
