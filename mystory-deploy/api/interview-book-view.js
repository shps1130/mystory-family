// api/interview-book-view.js
// The public page for a shared interview book, served at /story/:id.
//
// Unauthenticated by design — the buyer chose to share this link. Access is
// controlled by visibility = 'link' plus an unguessable share_id, which is
// the same model as an unlisted document. It is not a secret: anyone the
// link is forwarded to can read it, and the share page says so in the UI
// that creates it.
//
// Everything interpolated below goes through esc(). The memoir equivalent
// did not, which turned an open save endpoint into stored XSS on the
// apex domain.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const headers = {
  'apikey': SUPABASE_SERVICE_KEY,
  'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
};

function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Drafts come back as prose with blank-line paragraph breaks.
function paragraphs(text, opts = {}) {
  const { indent = true } = opts;
  return String(text || '')
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
    .map((p, i) => {
      const ti = indent && i > 0 ? '1.4em' : '0';
      return `<p style="text-indent:${ti}">${esc(p).replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');
}

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id || !/^[a-zA-Z0-9]{6,40}$/.test(id)) {
    return res.status(400).send('Missing or invalid book id');
  }

  try {
    const bookRes = await fetch(
      `${SUPABASE_URL}/rest/v1/interview_books` +
      `?share_id=eq.${encodeURIComponent(id)}` +
      `&visibility=eq.link` +
      `&select=project_id`,
      { headers }
    );
    const books = await bookRes.json();
    if (!books?.length) return res.status(404).send('Book not found');

    const projectId = books[0].project_id;

    const [projRes, convRes] = await Promise.all([
      fetch(
        `${SUPABASE_URL}/rest/v1/interview_projects` +
        `?id=eq.${encodeURIComponent(projectId)}` +
        `&select=subject_name,buyer_name,foreword_text,foreword_details`,
        { headers }
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/interview_conversations` +
        `?project_id=eq.${encodeURIComponent(projectId)}` +
        `&approved=eq.true` +
        `&select=conversation_number,title,draft,recorded_on,recorded_where` +
        `&order=conversation_number.asc`,
        { headers }
      ),
    ]);

    const project = (await projRes.json())?.[0];
    const conversations = (await convRes.json()) || [];

    if (!project) return res.status(404).send('Book not found');

    const subjectName =
      project.foreword_details?.subject_full_name ||
      project.subject_name ||
      'A Life';

    const html = renderBook({ project, subjectName, conversations });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Shared links get forwarded around families for years. Let them cache
    // briefly but stay revocable within the hour if the buyer unshares.
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300');
    // The page contains no scripts and loads no third-party code.
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:"
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    return res.status(200).send(html);
  } catch (err) {
    console.error('interview-book-view error:', err);
    return res.status(500).send('Could not load this book');
  }
}

function renderBook({ project, subjectName, conversations }) {
  const foreword = project.foreword_text;

  const sections = conversations
    .filter(c => c.draft && c.draft.trim())
    .map(c => `
      <section class="chapter">
        <div class="chapter-head">
          <div class="chapter-num">${esc(numberWord(c.conversation_number))}</div>
          <h2>${esc(c.title || `Conversation ${c.conversation_number}`)}</h2>
        </div>
        <div class="prose">${paragraphs(c.draft)}</div>
      </section>`)
    .join('\n');

  const forewordBlock = foreword
    ? `
      <section class="chapter foreword">
        <div class="chapter-head">
          <div class="chapter-num">Foreword</div>
          <h2>As told to ${esc(
            project.foreword_details?.interviewer_full_name ||
            project.buyer_name || 'family'
          )}</h2>
        </div>
        <div class="prose">${paragraphs(foreword, { indent: false })}</div>
      </section>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(subjectName)}</title>
<meta name="robots" content="noindex, nofollow">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Lato:wght@300;400&display=swap" rel="stylesheet">
<style>
  :root { --ink:#1F1B16; --muted:#6B6257; --rule:#D8CDBC; --paper:#FBF8F3; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { background:var(--paper); color:var(--ink);
         font-family:'EB Garamond', Georgia, serif; -webkit-font-smoothing:antialiased; }
  .sheet { max-width:34em; margin:0 auto; padding:5rem 1.5rem 6rem; }

  .titlepage { text-align:center; padding-bottom:4rem; margin-bottom:4rem;
               border-bottom:1px solid var(--rule); }
  .titlepage h1 { font-size:clamp(2.2rem,6vw,3.2rem); font-weight:400;
                  font-style:italic; line-height:1.15; margin-bottom:1rem; }
  .titlepage .kicker { font-family:'Lato',sans-serif; font-size:.7rem;
                       letter-spacing:.22em; text-transform:uppercase;
                       color:var(--muted); }

  .chapter { margin-bottom:4.5rem; }
  .chapter-head { margin-bottom:2rem; }
  .chapter-num { font-family:'Lato',sans-serif; font-size:.68rem;
                 letter-spacing:.22em; text-transform:uppercase;
                 color:var(--muted); margin-bottom:.5rem; }
  .chapter h2 { font-size:1.75rem; font-weight:500; line-height:1.25; }

  .prose p { font-size:1.12rem; line-height:1.78; margin-bottom:1.1rem;
             hyphens:auto; }
  .foreword .prose p { font-size:1.02rem; color:var(--muted); font-style:italic; }

  .colophon { text-align:center; padding-top:3rem; border-top:1px solid var(--rule);
              font-family:'Lato',sans-serif; font-size:.78rem; color:var(--muted);
              line-height:1.9; }

  /* ---- Print: 6x9in trim, the standard hardcover memoir size ---- */
  @page {
    size: 6in 9in;
    /* Wider inner margin leaves room for the gutter once it's bound. */
    margin: 0.75in 0.6in 0.8in 0.85in;
  }
  @media print {
    body { background:#fff; }
    .sheet { max-width:none; margin:0; padding:0; }
    .titlepage { page-break-after:always; border-bottom:none;
                 padding-top:2.5in; }
    .chapter { page-break-before:always; margin-bottom:0; }
    .chapter h2 { page-break-after:avoid; }
    .prose p { font-size:11.5pt; line-height:1.62; orphans:3; widows:3; }
    .foreword .prose p { font-size:10.5pt; }
    .colophon { page-break-before:always; padding-top:3in; }
    a { text-decoration:none; color:inherit; }
  }
</style>
</head>
<body>
<div class="sheet">

  <div class="titlepage">
    <div class="kicker">A Life in Her Own Words</div>
    <h1>${esc(subjectName)}</h1>
  </div>

  ${forewordBlock}
  ${sections}

  <div class="colophon">
    Preserved with MyStory.Family
  </div>

</div>
</body>
</html>`;
}

function numberWord(n) {
  return ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'][n] || `Chapter ${n}`;
}
