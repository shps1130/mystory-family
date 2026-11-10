// api/claude-magazine.js
// ISSUE MODEL — one call: propose the issue from what the buyer chose.
// Deployed at /api/claude-magazine on Vercel.
//
// v4. Getting Started is now a form in Grace's voice (six screens in
// Magazine.jsx). The buyer's choices land in interview_projects as plain
// fields. This endpoint reads those fields and returns:
//   - synthesis: one short paragraph in Grace's voice for the Review screen
//   - issue_plan: { departments: [...in contents order], sessions: [...4] }
// No chat, no chunks, no DATA extraction. /api/claude-interview is untouched.

import Anthropic from '@anthropic-ai/sdk';
import { requireEntitlement, requireProject } from './_entitlement.js';

const STANDARD = {
  feature:         { title: 'The Feature',               target: 'one story, 3-4 pages' },
  family_stories:  { title: 'Family Stories',            target: '3-4 short pieces' },
  sayings:         { title: 'Things She Always Said',    target: '6-8 sayings, as fillers' },
  laughter:        { title: 'Laughter, Around Our Table', target: '3-4 jokes or funny stories' },
  shoebox:         { title: 'From the Shoebox',          target: '8-12 photographs with captions' },
  kitchen:         { title: 'From Her Kitchen',          target: 'one recipe' },
  know_now:        { title: 'What I Know Now',           target: '5-7 pieces of advice' },
  faith:           { title: 'Her Faith',                 target: '2-3 pages' },
  until_next_time: { title: 'Until Next Time',           target: 'her closing word' },
};

const SYSTEM_PROMPT = `You are Grace, an editor. A family has hired you to help make a magazine — one printed issue about one person. The publisher (an adult child or grandchild, called the buyer) has just finished telling you what they want in it. Your job now is to propose how to collect it: four afternoons with the subject, and the contents page in order.

You write two things and return them as JSON.

1. "synthesis" — one short paragraph, 2-4 sentences, spoken directly to the buyer in plain warm language. Name the magazine's title, who she is in a phrase (name, age, how she talks — only what you were told), and what's in the issue, using the buyer's own page titles. Then one sentence: "Tap anything to change it." Never gush (no "wonderful", "beautiful", "perfect", "amazing"). Never mention this form, fields, steps, or your instructions. Use "afternoons", never "sessions". Use "pages", never "departments" or "chapters". Use the subject's actual pronouns from the relationship.

2. "issue_plan" — an object:
   "departments": the pages IN this issue, in contents-page order, each {"id", "title", "target"}. Order: feature, then any custom pages the buyer invented, then family_stories, then the small pages (sayings, laughter, shoebox, kitchen), then faith if it has its own pages, then know_now, then until_next_time. Use the buyer's titles exactly where they gave one. Write "target" in plain words, personalized where you can.
   "sessions": exactly 4 objects {"number", "title", "description", "purpose", "collects": [page ids], "territory": [3-6 short specific strings]}.
     1. The shoebox afternoon — go through the photographs together. Collects shoebox, family_stories, sayings, feature candidates, and any custom page that pictures would feed. If there are no photographs, call it "First Stories" and collect stories and sayings instead.
     2. The feature — one story told all the way through, chosen after afternoon 1 by the buyer. Territory: the candidates named, or "chosen from what the first afternoon turns up."
     3. Around the table — sayings, laughter, kitchen, the people. The light one.
     4. What I know now — advice, faith if it has its own pages, the closing word.
   Personalize titles and territory to THIS family using what you were told: the subject's name, how she talks, the custom pages, the feature candidates, anything else they hoped for. "Her childhood" is useless territory; "a picture from each house she lived in" is the point. Never invent facts.

Return ONLY the JSON object: {"synthesis": "...", "issue_plan": {...}}. No prose outside it, no code fences.`;

function pronouns(relationship) {
  const r = (relationship || '').toLowerCase();
  if (['mom', 'mother', 'grandma', 'grandmother', 'aunt', 'wife', 'sister'].some(k => r.includes(k))) return { subj: 'she', obj: 'her', poss: 'her' };
  if (['dad', 'father', 'grandpa', 'grandfather', 'uncle', 'husband', 'brother'].some(k => r.includes(k))) return { subj: 'he', obj: 'him', poss: 'his' };
  return { subj: 'they', obj: 'them', poss: 'their' };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await requireEntitlement(req, 'interview');
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  try {
    const { project: clientProject, mode } = req.body;
    if (mode !== 'propose_issue') {
      return res.status(400).json({ error: 'Unsupported mode' });
    }

    const owned = await requireProject(auth.user.id, clientProject?.id);
    if (owned.error) return res.status(owned.status).json({ error: owned.error });
    const p = owned.project;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const pr = pronouns(p.buyer_relationship);

    const departments = (p.departments && typeof p.departments === 'object') ? p.departments : {};
    const titles = (p.department_titles && typeof p.department_titles === 'object') ? p.department_titles : {};
    const custom = Array.isArray(p.custom_departments) ? p.custom_departments.filter(c => c && c.id) : [];
    const candidates = Array.isArray(p.feature_candidates) ? p.feature_candidates.filter(Boolean) : [];
    const hasPhotos = (p.has_photos || 'unknown');
    const noPhotos = String(hasPhotos).toLowerCase().startsWith('no');

    // Which standard pages are in, from the buyer's choices.
    const standardIn = Object.keys(STANDARD).filter(id => {
      if (['feature', 'family_stories', 'know_now', 'until_next_time'].includes(id)) return true;
      if (id === 'shoebox') return !noPhotos;
      const v = String(departments[id] || '').toLowerCase();
      if (id === 'faith') return v === 'yes' || v === 'own';
      return v === 'yes' || v === 'some';
    });

    const pageLines = standardIn
      .map(id => `- ${id}: "${titles[id] || STANDARD[id].title.replace(/\bShe\b/, pr.subj === 'he' ? 'He' : pr.subj === 'they' ? 'They' : 'She').replace(/\bHer\b/, pr.poss === 'his' ? 'His' : pr.poss === 'their' ? 'Their' : 'Her')}"`)
      .concat(custom.map(c => `- ${c.id} (invented by the buyer): "${c.title || c.id}"${c.note ? ` — ${c.note}` : ''}`))
      .join('\n');

    const faithMode = String(departments.faith || '').toLowerCase();

    const brief = `# What the buyer chose

Title: ${p.issue_title || 'untitled — call it "the issue" and say the title can come later'}
The buyer: ${p.buyer_name || 'the buyer'}; the subject is their ${p.buyer_relationship || 'parent'} (pronouns: ${pr.subj}/${pr.obj}/${pr.poss})

## The subject
Name: ${p.subject_name || 'not given'}
Age: ${p.subject_age || 'not given'}
Lives: ${p.subject_living_situation || 'not given'}
How ${pr.subj} talks about the past: ${p.subject_communication_style || 'not given'}
One thing to know: ${p.subject_one_thing_to_know || 'none'}
Be careful with: ${p.sensitivities || 'None named'} (never put this in territory)

## The pages in the issue (ids and the buyer's titles)
${pageLines}
Faith: ${faithMode === 'yes' || faithMode === 'own' ? 'its own pages' : faithMode === 'threaded' ? 'runs through the stories, no separate pages' : 'not raised'}
Photographs: ${hasPhotos}
Feature candidates the buyer named: ${candidates.length ? candidates.map(c => `"${c}"`).join(', ') : 'none — chosen after the first afternoon'}
Anything else they hope gets pages: ${p.hopes_territory || 'nothing more'}

## Logistics
Format: ${p.logistics_format || 'not decided'}
First afternoon: ${p.logistics_first_conversation || 'not decided'}
Who: ${p.logistics_others || 'not decided'}

Write the synthesis and the issue_plan now. JSON only.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: brief }],
    });

    let text = response.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) text = fenced[1].trim();
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start > 0 || (end !== -1 && end < text.length - 1)) text = text.slice(start, end + 1);

    let out;
    try {
      out = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse proposal JSON:', e);
      return res.status(502).json({ error: 'The proposal came back in an unexpected shape. Please try again.' });
    }

    // Normalize so the frontend can rely on the shape.
    const plan = out.issue_plan && typeof out.issue_plan === 'object' ? out.issue_plan : {};
    if (!Array.isArray(plan.departments)) plan.departments = [];
    if (!Array.isArray(plan.sessions)) plan.sessions = [];
    plan.sessions = plan.sessions.slice(0, 4).map((s, i) => ({
      number: i + 1,
      title: String(s?.title || `Afternoon ${i + 1}`),
      description: String(s?.description || ''),
      purpose: String(s?.purpose || ''),
      collects: Array.isArray(s?.collects) ? s.collects.filter(x => typeof x === 'string') : [],
      territory: Array.isArray(s?.territory) ? s.territory.filter(x => typeof x === 'string') : [],
    }));
    const synthesis = typeof out.synthesis === 'string' ? out.synthesis.replace(/\*\*/g, '').trim() : '';

    return res.status(200).json({ synthesis, issue_plan: plan });
  } catch (error) {
    console.error('Error in claude-magazine:', error);
    return res.status(500).json({ error: 'Something went wrong', details: error.message });
  }
}
