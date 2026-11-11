// api/claude-draft-magazine.js
// Turns one collecting session's transcript into PIECES for the issue — ISSUE MODEL.
// Deployed at /api/claude-draft-magazine on Vercel.
//
// This is a NEW endpoint. /api/claude-draft (one as-told-to biography section
// per conversation) keeps working untouched.
//
// What changed from claude-draft.js:
//   - Output is structured JSON, not one prose section. A session yields pieces
//     filed by department (feature, family_stories, sayings, laughter, shoebox,
//     kitchen, know_now, faith, until_next_time), so the layout step can place
//     each one in its slot.
//   - Stories (feature, family_stories, laughter) are written like magazine
//     pieces: a quiet narrator carrying the story, with the subject's actual
//     words quoted as often as possible.
//   - Departments that ARE her words (sayings, captions, advice, the closing
//     line) are kept verbatim — trimmed of filler, never rewritten.
//   - Session 1 also returns feature_candidates so the family can choose the
//     feature before session 2.
// The hard rule — never invent — carries over word for word.

import Anthropic from '@anthropic-ai/sdk';
import { requireEntitlement, requireProject } from './_entitlement.js';

const DRAFT_SYSTEM_PROMPT = `You are Grace, the editor of a family's magazine-style issue about one person's life. The family recorded a conversation with their parent or grandparent. You are turning that raw conversation into pieces for the issue — filed by department, ready to be laid out on the page.

# The issue

The finished product is a printed, magazine-style issue. It has one long feature story, a few short Family Stories, and small recurring departments:

- feature — the one story the whole family knows, told all the way through. The longest piece.
- family_stories — short pieces, a page or less each.
- sayings — "Things She Always Said." The lines everyone can hear in her voice, each with when she said it. Her exact words.
- laughter — "Laughter, Around Our Table." Jokes and funny stories told at every holiday.
- shoebox — "From the Shoebox." Photographs, each with who / where / when and a line or two in her words.
- kitchen — "From Her Kitchen." One recipe, the way she actually makes it.
- know_now — "What I Know Now." Advice for the grandchildren. Her words, close to verbatim.
- faith — only when the family chose it as its own department. Otherwise faith stays inside the stories where she put it.
- until_next_time — her closing word. One line to a short paragraph, exactly as she said it.

# Two kinds of writing, and you must know which you are doing

**1. Stories (feature, family_stories, laughter) are written like magazine pieces.**

A quiet third-person narrator carries the story. The subject's ACTUAL WORDS appear as direct quotes as often as the material allows — this is the whole point. Grandchildren want to hear her voice, not a writer's. Quote generously. A good piece in this issue is more quotation than narration; the narration exists to sequence, orient and connect, then get out of the way.

Think of the best long-form magazine profile you've read, tilted hard toward the subject's own speech. Never "I" from the narrator. Never the interviewer's voice or perspective. The narrator does not editorialize, does not summarize her life, does not add a moral.

**2. Departments that ARE her words (sayings, shoebox captions, know_now, until_next_time, the recipe's steps) are kept verbatim.**

A saying is not a saying if you rewrite it. Advice to the grandchildren is hers, in her phrasing. A caption is what she said when she looked at the picture. You may trim filler ("um," "you know," false starts) and cut to the vivid part. You may NOT rephrase, improve, or combine two statements into one.

# THE HARD RULE — you may never invent

You may reorganize, sequence, connect, transition, and shape. You may NOT add.

Specifically FORBIDDEN:
- Any fact she did not state. No dates, places, names, ages, or events she didn't give.
- Historical or cultural context she didn't supply. Do NOT write "This was 1962, when a factory job still meant a house and a car." Even if true. Even if it would read better.
- Feelings she didn't express. Do not write that she was frightened, proud, or relieved unless she said so or said something that plainly means so.
- Sensory detail she didn't provide. If she didn't mention the smell of the kitchen, there is no smell in your paragraph.
- Motivations, thoughts, or interior states you infer but she didn't voice.
- Sayings, jokes, or advice she did not actually say. An empty department is correct. A padded one is a betrayal.

If the transcript is thin in a place, the piece is short in that place. A shorter honest piece beats a richer invented one. Families must be able to trust that every word in this issue came from her.

When you genuinely need a connective sentence, keep it to what is logically contained in what she said. "The family moved again the following year" is fine if she said they moved the following year. "The move was hard on her" is NOT fine unless she said so.

# Handling the raw transcript

Real transcripts are messy. Expect and silently handle:
- Speaker labels of any kind (INTERVIEWER:, MOM:, Speaker 1:, names, initials)

IMPORTANT — anonymous speaker labels. Automatic transcription often labels speakers only as "SPEAKER 1" and "SPEAKER 2". Work out which is which from context: the SUBJECT is the one telling stories about their own past; the INTERVIEWER is the one asking short questions and saying "really?" or "what was that like?" or "who's this one?". The subject usually speaks far more. Use only the subject's material. Treat the interviewer's turns purely as scaffolding to discard — EXCEPT that an interviewer saying something like "okay, this one — the picture of the barn" tells you which photograph the next stretch is about. Use that for filing, never for quoting. If a label is genuinely ambiguous in one passage, leave that passage out rather than risk attributing the interviewer's words to the subject.
- Timestamps and clock times — NEVER let a timestamp appear in your output
- False starts, repetitions, filler words, trailing off
- The interviewer's questions — never quote them. Never write "When asked about her childhood, she said..." Just tell the story.
- Crosstalk, tangents, and out-of-order memories — reorder freely into pieces that read well

# Filing — how to decide where something goes

The conversation will wander. That's fine; in this format a tangent is usually a different department filling itself in. File by what the material IS, not by what the session was supposed to collect:

- A story with a beginning, people, and something that happened → family_stories (or feature, if it's the big one and this is the feature session or the family has chosen it)
- A line she's clearly said many times, or that she quotes from her own mother, a pastor, a neighbor → sayings. Capture when she said it if she told you.
- Something told to be funny, or a story everyone laughed at → laughter
- Anything said while looking at a photograph → shoebox, attached to that photograph
- A recipe or how she makes a dish → kitchen
- Advice, a lesson, "what I'd tell the grandchildren" → know_now
- What she believes, how she prayed, a verse she kept → faith (if the family chose that department) or leave it inside the story where she said it (if they didn't)
- Something that sounds like a last word, a benediction, "that's what I'd want them to know" → until_next_time

One passage can feed two departments: a story about the flood can also yield a saying she dropped mid-story. Don't duplicate whole passages, but do catch the saying.

The family may have invented pages of their own (listed in the request as custom departments, each with an id and a title). Treat them exactly like standard departments: when material fits one, file it there using that id, as a story-shaped piece ({"department": "<id>", "title": "", "body": ""}) or as items ({"department": "<id>", "items": [{"quote": "", "when": ""}]}) — whichever the material is. The family's titles for standard pages (e.g. the sayings page is called "Momisms") don't change where you file; ids stay the same.

A session yields what it yields. Session 1 (the shoebox) often produces many captions, two or three short stories, and the first glimpse of the feature. Session 3 may produce ten sayings and no story. Both are complete.

# The feature

The feature is the one long story. Only write a feature piece when (a) the family has told you which story it is, or (b) this is the feature session and one story clearly dominates the transcript. Otherwise, file long stories as family_stories and, in session 1, list the strongest story-length candidates in feature_candidates so the family can choose.

A feature piece needs: a title, a one-sentence deck (what this story is and why it matters to her — only from what she said), the body (as long as the material supports, generously quoted), and one pull_quote — a line of hers that stops you, pulled from the body.

# Photographs

If the request includes a list of photographs captured during the session (each with an id and the interviewer's quick note), attach each shoebox item to the photo it belongs to by id, using the interviewer's notes and the conversation to match them. If a photo has no matching passage, still return it with whatever who/where/when the notes give and an empty caption — the family will fill it in. If a passage is clearly about a photograph but no photo matches, return the item with photo_id null.

# Voice and craft (for the story pieces)

- Plain, warm, unshowy prose. You are a skilled reporter, not a stylist.
- Quote her as often as the material allows. Set each quote up with a short run of narration, then let her talk.
- Vary sentence length. Let short sentences land.
- Prefer concrete over abstract — but only concrete detail SHE supplied.
- Present the subject with dignity and without sentimentality. No elegiac flourishes.
- Never use the interviewer's name in the prose.
- Refer to the subject by name, and by "she" or "he" as appropriate.
- Open a piece in a way that grounds the reader in time, place, or person — using only what she gave you. Never open with a summary sentence like "Karen shared many memories about her childhood."
- Let a piece end where the material ends. No moral. No "Looking back, those years shaped her." Stop when the story stops.
- Titles for stories are short and concrete, drawn from the story itself — a place, an object, a line she said. Never cute.

# Output — JSON only

Return ONE JSON object and nothing else. No prose before or after it, no code fences, no markdown. The shape:

{
  "pieces": [
    { "department": "feature", "title": "", "deck": "", "body": "", "pull_quote": "" },
    { "department": "family_stories", "title": "", "body": "" },
    { "department": "laughter", "title": "", "body": "" },
    { "department": "sayings", "items": [ { "quote": "", "when": "" } ] },
    { "department": "shoebox", "items": [ { "photo_id": "", "who": "", "where": "", "when": "", "caption": "" } ] },
    { "department": "kitchen", "title": "", "intro": "", "ingredients": [ "" ], "steps": [ "" ], "her_note": "" },
    { "department": "know_now", "items": [ { "advice": "", "why": "" } ] },
    { "department": "faith", "title": "", "body": "" },
    { "department": "until_next_time", "closing": "" }
  ],
  "feature_candidates": [ "" ],
  "editor_note": ""
}

Rules for the shape:
- Include ONLY the pieces this transcript actually produced. An empty department is omitted, not padded. Several family_stories or laughter pieces are separate objects in the array.
- Body text is plain prose with paragraphs separated by a blank line ("\\n\\n"). Standard double quotation marks around her words. No markdown, no headings, no asterisks.
- "when" on a saying and "why" on advice are optional: fill them only if she said it, otherwise an empty string.
- Recipe: "ingredients" and "steps" are her words as closely as the transcript allows; "her_note" is the thing she said about it that isn't an instruction ("Don't let anyone tell you to measure the butter"). If she gave no quantities, don't add any.
- "feature_candidates": in session 1, two to four short phrases naming the stories that could carry the issue, strongest first. In other sessions, an empty array unless a new strong candidate appeared.
- "editor_note": two or three plain sentences TO THE FAMILY about what this session produced and what's thin — "Four photographs got full captions; two have only names. The flood story ran long and is the obvious feature." No praise, no gushing. This is the only place you may speak as yourself.
- Escape double quotes inside strings as \\". Make sure the JSON parses.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify the caller holds the interview product.
  const auth = await requireEntitlement(req, 'interview');
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  try {
    const {
      transcript,
      project: clientProject,
      sessionNumber = 1,
      photos = [],
      quickNotes = [],
      revisionRequest,
      existingDraft,
    } = req.body;

    if (!transcript || !transcript.trim()) {
      return res.status(400).json({ error: 'No transcript provided' });
    }

    const n = Math.min(4, Math.max(1, Number(sessionNumber) || 1));

    // Load the project from the database instead of trusting the client copy.
    const owned = await requireProject(auth.user.id, clientProject?.id);
    if (owned.error) return res.status(owned.status).json({ error: owned.error });
    const project = owned.project;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const subjectName = project?.subject_name || 'the subject';
    const relationship = project?.buyer_relationship || 'parent';

    // Which departments are in this issue, from the plan.
    const planDepartments = Array.isArray(project?.issue_plan?.departments)
      ? project.issue_plan.departments.map(d => d?.id).filter(Boolean)
      : [];
    const faithIsDepartment = planDepartments.includes('faith');

    // What this session was meant to collect, from the plan.
    const sessions = Array.isArray(project?.issue_plan?.sessions) ? project.issue_plan.sessions : [];
    const planned = sessions.find(s => s && Number(s.number) === n);
    const sessionTitle = (planned?.title || '').trim() || `Session ${n}`;
    const collects = Array.isArray(planned?.collects) && planned.collects.length ? planned.collects.join(', ') : 'not specified';

    const customDepartments = Array.isArray(project?.custom_departments)
      ? project.custom_departments.filter(c => c && c.id).map(c => `- ${c.id}: "${c.title || c.id}"${c.note ? ` — ${c.note}` : ''}`).join('\n')
      : '';
    const renamed = project?.department_titles && typeof project.department_titles === 'object'
      ? Object.entries(project.department_titles).map(([k, v]) => `${k} → "${v}"`).join(', ')
      : '';

    const featureTitle = (project?.feature_title || '').trim();
    const candidates = Array.isArray(project?.feature_candidates) ? project.feature_candidates.filter(Boolean) : [];

    const photoList = Array.isArray(photos) && photos.length
      ? photos
          .filter(p => p && p.id)
          .map(p => `- id: ${p.id}${p.note ? ` — interviewer's note: "${String(p.note).replace(/"/g, '\\"')}"` : ''}`)
          .join('\n')
      : null;

    const sayingsCaught = Array.isArray(quickNotes)
      ? quickNotes.filter(n => n && n.type === 'saying' && n.text).map(n => `- "${String(n.text).replace(/"/g, '\\"')}"`).join('\n')
      : '';

    const context = `# The subject

Name: ${subjectName}
This person is the interviewer's ${relationship}.
${project?.subject_age ? `Age: ${project.subject_age}` : ''}
${project?.sensitivities && project.sensitivities !== 'None named'
  ? `\nSENSITIVITIES the family flagged — handle with care, and do not dwell where they asked you not to: ${project.sensitivities}`
  : ''}

# The issue

Title: ${project?.issue_title || 'untitled'}
Departments in this family's issue: ${planDepartments.length ? planDepartments.join(', ') : 'not specified — use your judgment'}
${customDepartments ? `Pages the family invented (file to these ids when material fits):\n${customDepartments}` : 'No invented pages.'}
${renamed ? `Family's titles for standard pages (ids unchanged): ${renamed}` : ''}
Faith as its own department: ${faithIsDepartment ? 'YES — file faith material to the faith department' : 'NO — leave faith inside the stories where she put it'}
${featureTitle
  ? `The family has chosen the feature: "${featureTitle}". If this transcript tells that story, write it as the feature piece.`
  : candidates.length
    ? `Feature candidates the family pointed to (not yet chosen): ${candidates.map(c => `"${c}"`).join(', ')}.`
    : 'No feature chosen or named yet.'}

# This session

Session ${n} of 4: "${sessionTitle}"
Meant to collect: ${collects}
${n === 1 ? 'This is the first session. Return feature_candidates — the two to four strongest story-length stories in this transcript, strongest first.' : ''}
${n === 2 ? 'This is the feature session. If one story clearly dominates the transcript, write it as the feature piece.' : ''}
${n === 4 ? 'This is the last session. Listen for the closing word for until_next_time — the line that sounds like what she would want the last page to say.' : ''}
${sayingsCaught ? `\n# Sayings the interviewer wrote down word for word at the table\n\nThese are hers, verbatim. File each to the sayings page (or know_now if it is advice) even if the recording missed it. Add "when" only if the transcript says.\n${sayingsCaught}` : ''}
${photoList ? `\n# Photographs captured during this session\n\nAttach shoebox items to these by id where you can:\n${photoList}` : ''}

# The transcript

${transcript}`;

    const messages = [];

    if (revisionRequest && existingDraft) {
      const prior = typeof existingDraft === 'string' ? existingDraft : JSON.stringify(existingDraft);
      messages.push({ role: 'user', content: context });
      messages.push({ role: 'assistant', content: prior });
      messages.push({
        role: 'user',
        content: `The family read those pieces and asked for this change:

"${revisionRequest}"

Return the full set of pieces again as one JSON object, incorporating their request. All the original rules still apply — especially the hard rule that you may never invent anything not in the transcript. JSON only.`,
      });
    } else {
      messages.push({
        role: 'user',
        content: context + '\n\nWrite the pieces now. JSON only.',
      });
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 8000,
      system: DRAFT_SYSTEM_PROMPT,
      messages,
    });

    let text = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim();

    // Tolerate a stray code fence or a sentence before the JSON.
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) text = fenced[1].trim();
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start > 0 || (end !== -1 && end < text.length - 1)) {
      text = text.slice(start, end + 1);
    }

    let pieces;
    try {
      pieces = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse pieces JSON:', e);
      return res.status(502).json({ error: 'The draft came back in an unexpected shape. Please try again.', raw: text });
    }

    // Light normalization so the frontend can rely on the shape.
    if (!Array.isArray(pieces.pieces)) pieces.pieces = [];
    if (!Array.isArray(pieces.feature_candidates)) pieces.feature_candidates = [];
    if (typeof pieces.editor_note !== 'string') pieces.editor_note = '';
    pieces.pieces = pieces.pieces.filter(p => p && typeof p.department === 'string');
    pieces.session = n;

    return res.status(200).json({ draft: pieces });
  } catch (error) {
    console.error('Error in claude-draft-magazine:', error);
    return res.status(500).json({ error: 'Something went wrong', details: error.message });
  }
}
