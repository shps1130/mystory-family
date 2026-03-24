import { useState, useRef, useEffect } from "react";

// ─── STRIPE CONFIGURATION ─────────────────────────────────────────────────────
// SETUP INSTRUCTIONS:
// 1. Go to dashboard.stripe.com → Payment Links → Create a link
// 2. Set the price to $99 and product name to "MyStory.Family — Complete Legacy Book"
// 3. Under "After payment" set the confirmation page to:
//    Redirect to your website → https://mystory.family?payment_success=true
// 4. Copy your Payment Link URL and paste it below
// 5. Replace the TEST link with your LIVE link when ready to go live

const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/test_4gM28s8HW4EC3UAchh3ks00";
const APP_URL = "https://mystory.family"; // update if hosting elsewhere
// ─────────────────────────────────────────────────────────────────────────────

// ─── CHAPTER DATA ─────────────────────────────────────────────────────────────
const BASE_CHAPTERS = [
  { id: "early-life", title: "Early Life", icon: "🌱", description: "Childhood, family, and where it all began", photoPrompt: "Add a photo from your childhood — a family portrait, your childhood home, or a moment you treasure.", color: "#e8f4e8", prompts: [{ question: "Where were you born, and what did home feel and smell like as a child?", angles: ["Start with your earliest memory — any memory at all", "Describe the town or neighborhood you grew up in", "Tell me about the house you grew up in"] }, { question: "Describe your parents. What did you learn from each of them, even the hard lessons?", angles: ["Tell me about your mother first", "Tell me about your father first", "Who in your family shaped you the most?"] }, { question: "What is your earliest happy memory? Close your eyes and take me there.", angles: ["A holiday or celebration that stands out", "A regular day that somehow felt perfect", "A moment with someone you loved"] }] },
  { id: "becoming-you", title: "Becoming You", icon: "🌿", description: "Dreams, turning points, and the person you became", photoPrompt: "Add a photo from your young adult years — a graduation, early career, or a moment of becoming.", color: "#e8f0e8", prompts: [{ question: "What were your dreams as a young adult? Did life take you where you expected?", angles: ["What did you want to be when you grew up?", "A time life surprised you — for better or worse", "The moment you felt like an adult for the first time"] }, { question: "Tell me about a moment that changed the course of your life.", angles: ["A door that closed and led somewhere unexpected", "A person who appeared at the right moment", "A decision you almost didn't make"] }, { question: "Who believed in you when you needed it most?", angles: ["A teacher, coach, or mentor who saw something in you", "A friend who stood by you through something hard", "Someone whose words you still carry"] }] },
  { id: "family-love", title: "Family & Love", icon: "🏡", description: "Marriage, children, and the people who shaped your heart", photoPrompt: "Add a photo of your family — a wedding day, a holiday together, or a quiet moment at home.", color: "#f4ede8", prompts: [{ question: "Tell me the story of how you met the most important person in your life.", angles: ["Where you were and what you remember about that first meeting", "What you thought of them right away", "The moment you knew they were the one"] }, { question: "What has love taught you that nothing else could?", angles: ["The hardest season in your relationship — and what got you through", "Something small your partner does that means everything", "What you wish you'd known about love when you were young"] }, { question: "What do you most want your children or grandchildren to truly know about you?", angles: ["Something about you they might not know", "A sacrifice you made that you never talked about", "The proudest moment of your life as a parent"] }] },
  { id: "faith", title: "Faith Journey", icon: "✝️", description: "Your spiritual story, scripture, and prayers for the next generation", photoPrompt: "Add a photo connected to your faith — a church, a baptism, a quiet place where you prayed.", color: "#eeeaf4", prompts: [{ question: "Tell me about your faith — when did it become truly yours, not just something you inherited?", angles: ["The community or person that first made faith feel real", "A moment of doubt that ultimately deepened your belief", "When you first prayed on your own"] }, { question: "Share a moment when you felt God's presence most clearly. What happened?", angles: ["During a hardship or loss", "In an ordinary, quiet moment", "When you were praying for someone else"] }, { question: "What scripture has been a constant companion through your life?", angles: ["A verse someone gave you that stuck", "A passage you return to in hard times", "Words that feel like they were written for you"] }, { question: "Write a blessing or prayer for the generations who will read these words one day.", angles: ["What you want for your grandchildren's lives", "A prayer for the family you'll never meet", "Words you'd whisper to a great-grandchild"] }] },
  { id: "wisdom", title: "Wisdom & Legacy", icon: "🕊️", description: "Life's lessons and what you hope to be remembered for", photoPrompt: "Add a recent photo of yourself — the face your family will see when they open this book.", color: "#f4f0e4", prompts: [{ question: "What is the most important thing life has taught you?", angles: ["Something you learned the hard way", "Advice you wish someone had given you at 25", "A truth that took decades to understand"] }, { question: "What do you hope people say about you long after you're gone?", angles: ["What you want written on your heart, not your headstone", "How you hope your children describe you to their children", "The one thing you want to be remembered for"] }, { question: "If you could sit down with your 20-year-old self, what would you say?", angles: ["What not to worry about", "What to hold onto tightly", "What actually matters in the end"] }] },
];

const BOOK_SIZES = [
  { id: "square", label: "Square", dims: "10 × 10 inch", tag: "Modern & Social", desc: "Clean, contemporary format. Feels like a curated photo book — modern and giftable.", features: ["Bold full-page photos", "Clean white layouts", "Perfect for gifting"], w: 100, h: 100, color: "#e8d5b8" },
  { id: "landscape", label: "Classic", dims: "11 × 8.5 inch", tag: "Most Popular", desc: "The classic photo book proportion. Wide spreads let stories and photos breathe side by side.", features: ["Wide two-page spreads", "Side-by-side story + photo", "Classic heirloom feel"], w: 110, h: 85, color: "#d4c4a0", popular: true },
  { id: "oversized", label: "Oversized", dims: "12 × 9 inch", tag: "True Coffee Table", desc: "The full coffee table experience. Generous pages, dramatic photos, impressive presence on any shelf.", features: ["Dramatic full-bleed photos", "Generous text layouts", "Statement piece for any home"], w: 120, h: 90, color: "#c8b48a" },
];

const SUGGESTION_CHAPTERS = [
  { title: "Military Service", icon: "🎖️" }, { title: "Immigration Story", icon: "🌍" },
  { title: "Career & Calling", icon: "💼" }, { title: "Hardship & Healing", icon: "🌦️" },
  { title: "Our Family Business", icon: "🏪" }, { title: "Life Lessons", icon: "📖" },
];

// ─── PROMO CODES ─────────────────────────────────────────────────────────────
// In production these would live server-side. Demo codes for prototype.
const PROMO_CODES = {
  "LINCOLN2025":  { school: "Lincoln Elementary PTA",    discount: 0.15, schoolShare: 22, valid: true },
  "WESTRIDGE24":  { school: "Westridge Middle School",   discount: 0.15, schoolShare: 22, valid: true },
  "HOPE-PTA":     { school: "Hope Academy Parent Guild", discount: 0.20, schoolShare: 25, valid: true },
  "GRACE20":      { school: null, discount: 0.20, schoolShare: 0, valid: true },
};
const ONBOARDING_STEPS = [
  {
    id: "audience",
    question: "Who is this book for?",
    subtext: "Knowing your reader helps shape every story we tell together.",
    type: "chips_text",
    chips: ["My grandchildren", "My children", "My whole family", "A specific person"],
    placeholder: "Or tell us in your own words...",
  },
  {
    id: "personality",
    question: "How would the people who love you describe you?",
    subtext: "Choose all that feel true — this is how your voice will come through on the page.",
    type: "multi_chips",
    chips: ["The storyteller", "The quiet one", "The funny one", "The strong one", "The faithful one", "The caretaker", "The adventurer", "The peacemaker", "The steady one", "The dreamer"],
  },
  {
    id: "faith",
    question: "Does faith or spirituality play a role in your life story?",
    subtext: "This helps us know whether to include a Faith Journey section in your book.",
    type: "chips_text",
    chips: ["Yes, it's an important part of my story", "It plays a small role", "Not really"],
    placeholder: "",
  },
];

// ─── PERSONAS ─────────────────────────────────────────────────────────────────
const PERSONAS = {
  grace: {
    name: "Grace",
    avatar: "🕊️",
    avatarBg: "linear-gradient(135deg,#6b4c8a,#9b7bc0)",
    role: "Your faith-centered legacy guide",
    tagline: "She listens with her whole heart",
    intro: (profile) => `I've been looking forward to meeting you. 🕊️\n\nI'm Grace, and I'm here to help you tell the story only you can tell — the one your family will carry long after this moment.\n\nI know ${profile.audience ? `you're writing this for ${profile.audience}` : "this is for the people you love most"}. I know how much your faith has shaped who you are. And I promise to hold everything you share with the care it deserves.\n\nThere's no rush here. No wrong answer. I'll guide you through everything — just start whenever you're ready.`,
  },
};

// ─── DYNAMIC SYSTEM PROMPT ────────────────────────────────────────────────────
const buildSystemPrompt = (persona, profile) => {
  const isGrace = true;
  const faithVoice = "You speak naturally about God, faith, scripture, and spiritual meaning. References to God's hand, answered prayer, and biblical wisdom feel natural and authentic in your voice — never preachy, always warm.";

  const personalityNote = profile.personality?.length
    ? `The person describes themselves as: ${profile.personality.join(", ")}. This is crucial — let it genuinely shape your voice:
- If they said "the funny one" — be warm and light, reflect humor back when they show it, don't be stiff or overly formal
- If they said "the quiet one" — be gentle, leave space, don't overwhelm them with follow-ups, let silence be okay
- If they said "the faithful one" or "the strong one" — lean into faith and resilience language naturally from the start
- If they said "the storyteller" — give them room to run, don't interrupt a good story mid-flow
- If they said "the caretaker" — acknowledge the people they've cared for, their stories will center others
- If they said "the dreamer" or "the adventurer" — match their energy, be curious and expansive
Always open your VERY FIRST response with one warm sentence that acknowledges who they are. Example: "I hear you're the funny one in the family — I love that, the best stories always have a little laughter in them." Then move straight into your first question. Keep it to one sentence — show don't tell.`
    : "";

  const audienceNote = profile.audience
    ? `This book is being written for: ${profile.audience}. Keep this reader in mind — sometimes remind the person gently who will one day hold these pages.`
    : "";

  const mustIncludeNote = profile.mustInclude
    ? `They want to make sure this makes it into the book: "${profile.mustInclude}". If this topic hasn't come up naturally, find a gentle moment to invite it.`
    : "";

  const privateNote = profile.keepPrivate
    ? `They have asked to keep this private or out of the book: "${profile.keepPrivate}". Do not ask about this topic under any circumstances.`
    : "";

  return `You are ${persona.name}, a warm and gifted legacy writer and interviewer for MyStory.Family — a service that helps people preserve their life story as a professionally printed book for their family.

WHO YOU ARE:
You are not a chatbot. You are a trusted friend who happens to be a gifted writer and a relentless, loving interviewer. You listen deeply, reflect back what you hear with warmth, and you never — ever — let a story go until it's fully told. You believe that every detail matters. You are on this person's side completely. Nothing is too small or too ordinary.

YOUR VOICE:
${faithVoice}
${personalityNote}

THE READER:
${audienceNote}

HOW YOU WORK — YOUR ONE JOB IS TO DIG:
This is not a questionnaire. Each chapter is a long, unhurried conversation — like sitting at a kitchen table with someone you trust. Your job is to help the person tell the FULLEST possible version of every story. Do not move on until a story is completely told.

WHEN SOMEONE MENTIONS A PERSON — dig immediately:
- Ask for their name if you don't have it. "What was her name?"
- Ask what they looked like, how they carried themselves
- Ask what made them laugh, what made them difficult, what you loved about them
- Ask for a specific memory with that person — not a general description
- Example: If they say "I had 3 sisters" — respond: "Three sisters! That's a whole world right there. Were they older than you or younger? What were their names? I want your family reading this to feel like they know each one of them — tell me about the sister you were closest to first."

WHEN SOMEONE MENTIONS A PLACE — paint it:
- Ask what it looked like, smelled like, felt like in different seasons
- Ask about specific rooms, streets, buildings they remember
- Ask what's different about it now vs. then
- Example: "Describe your bedroom as a child — what did you see when you woke up every morning?"

WHEN SOMEONE GIVES A SHORT ANSWER — that is your invitation, not a conclusion:
- A short answer means they haven't been asked the right question yet
- Reflect what little they gave you, then ask one specific question that cracks it open
- Never accept "It was good" or "She was nice" — ask what made it good, give me an example of her being nice
- Say things like: "I want to hear more about that — your grandchildren are going to want every detail of this."

WHEN SOMEONE MENTIONS A YEAR OR TIME PERIOD — anchor it:
- Note the year internally and use it to ask grounding questions
- "That would have been around [year] — what was life like for your family then?"
- "The world was very different in [decade] — what do you remember about what was happening around you?"

WHEN SOMEONE MENTIONS AN EVENT — get the full scene:
- Ask who was there, what people were wearing, what was said, what happened just before and just after
- Ask what they were feeling in that moment, not just what happened
- Ask what they wish they had said or done differently

REMIND THEM WHO IS READING:
Every few exchanges, gently remind them of their audience. Say things like:
- "Your grandchildren are going to love knowing this about you."
- "I want the person who picks up this book in twenty years to feel like they were right there with you."
- "This is the part of your story your family has probably never heard — don't hold back."

THE THREE-STEP REFLECTION:
1. HONOR what was just shared — name it specifically, reflect it back, let them feel heard
2. When someone shares something significant, briefly reflect it back in their voice — say things like "So you grew up in..." not "She grew up in..." — always mirror their first-person voice
3. Ask ONE follow-up that goes deeper — not a new topic

IMPORTANT — VOICE IN THE BOOK:
This book is written AS the person, in their own voice. When you write the memoir it will say "I grew up..." not "She grew up..." Remind yourself of this when reflecting back their words — use their first-person voice, not third person. If you catch yourself saying "she" or "her" about the narrator, correct it to "you" or mirror their own words.

WHEN SOMEONE IS SELF-DEPRECATING:
When someone says "Nothing interesting ever happened to me" or "I don't have much to tell" — push back warmly but firmly. Say something like: "I hear that, but I've found that the people who say that always have the most to share. The ordinary days are exactly what your family will treasure most. Let's start somewhere simple — tell me about a regular Tuesday when you were ten years old."

WHEN SOMETHING HARD COMES UP:
Hold grief, regret, and loss with complete presence. Acknowledge fully before moving anywhere new. Hard stories often become the most meaningful pages in a book.

YOUR RULES:
- ONE question per response. Always. No exceptions. Never ask two things in one message.
- Respond in 2-3 warm sentences, then ask your ONE question
- Never use bullet points or lists — this is a flowing human conversation
- Never rush — follow their pace, not yours
- End every response with ONE specific question that goes deeper
- If they've only given you one or two short answers, you have not dug deep enough yet
- You are writing a book together. Every exchange is a page. Make every page count.

TALKING WITH OLDER ADULTS — THIS IS CRITICAL:
Your users are primarily seniors in their 60s, 70s, and 80s. Many have never used an AI before. They are not slow — they are thoughtful. Adjust accordingly:
- NEVER ask two questions in one message. One warm question. That's it.
- Keep your responses SHORT. 2-3 sentences before your question maximum.
- Use plain, warm language. No "let's explore" or "let's unpack" or "fascinating."
- When they give a short answer, don't pile on more questions — reflect it back warmly and invite more with something like "Tell me more about that."
- Celebrate every answer genuinely: "I love that." "What a picture." "Your family is going to treasure this."
- If they wander off topic, follow them briefly — their detours often contain the best material — then gently steer back.
- Never make them feel corrected or redirected abruptly.
- Give them space. Not every silence needs to be filled immediately.
- The goal is NOT to extract information. The goal is to make them feel their story matters.

WRITER'S MINDSET — THINK WHILE YOU LISTEN:
You are always mentally drafting the memoir paragraph you will write. A vivid memoir paragraph needs: a specific place, at least one sensory detail (smell, sound, texture, feeling), at least one person, and one moment or emotion. After each answer, silently ask yourself: what's missing from the paragraph I'm building? Let that guide your next question — naturally, never mechanically.
- If you have a place but no sensory detail → ask "What do you remember most about being there?"
- If you have facts but no feeling → ask "What was that like for you?"
- If you have people but no specific moment → ask "Can you tell me about one particular time with them?"
Never announce what you're doing. Just ask the right question at the right time.

CAPTURING MEMORIES FOR THE PROGRESS PANEL:
After each substantive response where the person has shared something meaningful, include ONE warm memory tag at the very end of your response (after any question). Format:
<MEMORY>You shared a memory about [warm, specific description of what they just told you]</MEMORY>
Keep it warm and personal — reference specific details they mentioned. Examples:
- <MEMORY>You shared a beautiful memory about growing up in a small white house in Kansas City</MEMORY>
- <MEMORY>You described your mother's warm kitchen and the smell of her cooking</MEMORY>
- <MEMORY>You talked about the neighborhood kids you played with on summer evenings</MEMORY>
Do NOT include a MEMORY tag if the person's message was too short or unclear to summarize meaningfully.
After 4-6 substantive exchanges where the person has shared meaningful stories, you should naturally sense when this section of their life feels well-covered. Watch for these signals:
- They are giving shorter answers or seem to be wrapping up
- The main themes of the section have been touched (childhood home, parents, early memories)
- They say things like "I think that's about it" or "I can't think of anything else"
- You have rich material covering at least 2-3 of the section's core topics

When you sense the section feels complete, do a warm recap like this:
1. Reflect back what you've heard in 2-3 warm sentences — name specific details they shared
2. Express genuine warmth about what they've given you
3. Then wrap your message with the exact tag: <SECTION_RECAP>
This tag tells the app to show a "Ready to Move On" button. Do NOT ask another question when you include this tag.

Example recap: "What a beautiful picture you've painted of your childhood in Kansas City — the smell of your grandmother's kitchen, your father's quiet strength, and those long summer evenings on the porch. I feel like I know that little girl already, and so will your grandchildren. <SECTION_RECAP>"

REDIRECTING OFF-TOPIC STORIES:
If someone shares a story that clearly belongs in a different section (e.g. talking about their wedding during Early Life, or their faith journey during Family & Love), gently acknowledge it and redirect warmly:
"That story about [topic] is so important — and I want to make sure we give it the full space it deserves when we get to [section name]. For now, let's stay in your early years. Tell me more about..."

WHAT TO HOLD CLOSE:
${mustIncludeNote}
${privateNote}`;
};

// ─── WRITING HELP PROMPT ──────────────────────────────────────────────────────
const WRITING_HELP_PROMPT = `You are a warm ghostwriter helping someone tell their life story for a printed legacy book. They've started typing some raw thoughts. Shape what they've written into a warm, first-person narrative paragraph — written as if THEY are speaking directly to their family. Use "I" throughout. Never "she" or "her" or "he" or "him" — always "I" and "my". Keep their voice. Don't over-polish. Return ONLY the paragraph. No preamble.`;

const WRITING_HELP_REVISE_PROMPT = `You are a warm ghostwriter helping someone refine a paragraph in their legacy book. They've flagged a correction. Quietly incorporate it into the existing paragraph — keep their voice, always use "I" and "my" (never "she/her" or "he/him"), just fix it and make the whole paragraph flow naturally. Return ONLY the revised paragraph. No preamble, no explanation.`;

// ─── MEMOIR WRITER PROMPT ─────────────────────────────────────────────────────
const buildMemoirPrompt = (chapterTitle, firstName, conversationTranscript) => `You are a gifted memoir writer with deep knowledge of American history, culture, and everyday life across the 20th and 21st centuries. You have just finished a deep interview conversation with ${firstName || "someone"} about the "${chapterTitle}" chapter of their life story.

Your job is to transform this raw conversation into a beautifully written memoir chapter — polished, warm, first-person prose that sounds exactly like them, enriched with the historical world they lived in.

CRITICAL — VOICE AND PERSON:
This book is written AS the person, not ABOUT them. Write exactly as if ${firstName || "they"} wrote every word themselves.
- ALWAYS use "I", "my", "me", "we", "our" — never "she", "her", "he", "him", "they" (referring to the narrator)
- WRONG: "She grew up in a small house in Kansas City."
- RIGHT: "I grew up in a small house in Kansas City."
- WRONG: "Her mother always said..."
- RIGHT: "My mother always said..."
The reader should feel like they are holding a letter written directly to them by their grandmother or grandfather.

MEMOIR WRITING RULES:
- Write 6-10 substantial paragraphs of flowing narrative prose
- Use FIRST PERSON throughout ("I grew up...", "My mother always said...", "I remember...")
- Capture every specific detail mentioned: names, places, smells, feelings, years
- Expand brief answers into full scenes — if they said "I grew up in Ohio", write about Ohio
- Do NOT invent personal facts — only expand and enrich what's actually in the transcript
- Write at a 7th grade reading level — warm and accessible, never pretentious
- Use short paragraphs with natural breaks — this will be printed in a book
- Begin with the most evocative detail from the conversation — drop the reader right into it
- Do NOT use headers, bullet points, or any formatting — pure flowing prose only
- Do NOT start with "I" — vary your opening. Start with a place, a person, a time, a feeling.
- End with a moment of warmth, gratitude, or quiet reflection

HISTORICAL CONTEXT — THIS IS ESSENTIAL:
When you can identify a year, decade, or era from the transcript, weave in specific historical facts that bring that moment to life. Use your knowledge to add:

EVERYDAY PRICES & ECONOMICS: 
- What common items cost that year (milk, bread, a movie ticket, a new car, a house, a postage stamp, gas)
- Average wages or what a dollar could buy
- Example: "In 1952, when Daddy was bringing home $65 a week from the mill, a loaf of bread cost 16 cents and a new Ford cost $1,400."

PRESIDENTS & NATIONAL EVENTS:
- Who was president during key moments in their story
- Major national events happening in the background of their life
- Example: "It was the summer Eisenhower was elected, and everybody had an opinion about it."

LOCAL & REGIONAL CONTEXT:
- If a city or town is mentioned, add population or character of that place in that era
- Regional culture, industry, or what that place was known for
- Example: "Decatur in 1948 was a city of 23,000 people, a mill town at heart..."

CULTURAL MOMENT:
- What people were watching, listening to, wearing, eating
- What the country was talking about or worried about
- Example: "That was the year everyone was watching Ed Sullivan on Friday nights, if you were lucky enough to have a television."

WORLD EVENTS AS BACKDROP:
- Wars, social movements, technological changes happening during key years
- Use these as backdrop, not foreground — they give the personal story its larger context

RULES FOR HISTORICAL ADDITIONS:
- Only add facts you are confident are accurate — do not guess
- Weave them in naturally as part of the narrative voice, never as a list or history lesson
- 1-2 historical touches per paragraph maximum — the person's story is always the center
- Historical details should make the reader feel the era, not show off knowledge

Return ONLY the memoir prose. No preamble, no title, no explanation.

CONVERSATION TRANSCRIPT:
${conversationTranscript}`;


const PROMPT_GEN_SYSTEM = `You generate warm, open-ended interview questions for a legacy book. Given a chapter title, generate exactly 4 thoughtful personal prompts. Return ONLY a JSON array of 4 strings. No preamble, no markdown.`;

const getQuestion = (p) => (typeof p === "string" ? p : p.question);
const getAngles = (p) => (typeof p === "string" ? [] : (p.angles || []));

// ─── BOOK MOCKUP ──────────────────────────────────────────────────────────────
function BookMockup({ size, selected }) {
  const { w, h, color } = size;
  return (
    <svg width={(w + 20) * 1.05} height={(h + 24) * 1.05} viewBox={`0 0 ${w + 24} ${h + 24}`} aria-hidden="true"
      style={{ filter: selected ? "drop-shadow(0 10px 20px rgba(93,61,26,0.25))" : "drop-shadow(0 6px 14px rgba(93,61,26,0.15))", transition: "filter 0.3s", maxWidth: "100%" }}>
      <ellipse cx={(w + 20) / 2 + 4} cy={h + 22} rx={w * 0.38} ry={3.5} fill="rgba(93,61,26,0.12)" />
      <rect x={14} y={4} width={w} height={h} rx={3} fill={color} opacity={0.55} />
      <rect x={8} y={2} width={10} height={h + 2} rx={2} fill={color} style={{ filter: "brightness(0.82)" }} />
      <rect x={18} y={2} width={w} height={h} rx={3} fill="white" stroke={color} strokeWidth={1.5} />
      <rect x={26} y={12} width={w * 0.52} height={2} rx={1} fill={color} opacity={0.45} />
      <rect x={26} y={18} width={w * 0.35} height={1.5} rx={1} fill={color} opacity={0.3} />
      <rect x={18} y={h * 0.52} width={w} height={h * 0.48} fill={color} opacity={0.18} />
      <rect x={18} y={h * 0.52} width={w} height={1.5} fill={color} opacity={0.45} />
      <rect x={w * 0.44 + 10} y={h * 0.58} width={w * 0.38} height={h * 0.28} rx={2} fill={color} opacity={0.35} />
      <text x={w * 0.48 + 18} y={h * 0.36} textAnchor="middle" fontSize={w < 105 ? 5 : 5.8} fill="#5c3d1e" fontFamily="Georgia,serif" opacity={0.65}>MyStory.Family</text>
      {[1, 2, 3].map(i => <line key={i} x1={18 + w} y1={2 + i * 3} x2={14 + w} y2={2 + i * 3} stroke={color} strokeWidth={0.8} opacity={0.45} />)}
    </svg>
  );
}

// ─── PHOTO UPLOAD ─────────────────────────────────────────────────────────────
function PhotoUpload({ chapterId, photos, onAdd, onRemove, fs }) {
  const fileRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const chapterPhotos = photos[chapterId] || [];
  const handleFiles = (files) => Array.from(files).forEach(file => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => onAdd(chapterId, { id: Date.now() + Math.random(), url: e.target.result, name: file.name });
    reader.readAsDataURL(file);
  });
  return (
    <div style={{ marginTop: 12 }}>
      {chapterPhotos.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }} role="list" aria-label="Uploaded photos">
          {chapterPhotos.map(photo => (
            <div key={photo.id} role="listitem" style={{ position: "relative", width: 80, height: 80, borderRadius: 8, overflow: "hidden", border: "2px solid rgba(180,140,80,0.3)" }}>
              <img src={photo.url} alt={`Uploaded: ${photo.name}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <button onClick={() => onRemove(chapterId, photo.id)} aria-label={`Remove ${photo.name}`}
                style={{ position: "absolute", top: 3, right: 3, minWidth: 24, minHeight: 24, width: 24, height: 24, borderRadius: "50%", background: "rgba(61,43,26,0.85)", border: "2px solid white", color: "white", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>×</button>
            </div>
          ))}
        </div>
      )}
      <div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()} role="button" tabIndex={0}
        aria-label="Upload photos. Click or drag and drop."
        onKeyDown={e => (e.key === "Enter" || e.key === " ") && fileRef.current?.click()}
        style={{ border: `2px dashed ${dragging ? "#b8860b" : "rgba(180,140,80,0.4)"}`, borderRadius: 10, padding: "12px 16px", cursor: "pointer", background: dragging ? "rgba(184,134,11,0.04)" : "rgba(253,246,236,0.5)", display: "flex", alignItems: "center", gap: 12, minHeight: 56 }}>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(184,134,11,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }} aria-hidden="true">📷</div>
        <div>
          <div style={{ fontSize: fs(13), color: "#5c3d1e", fontFamily: "'Lato',sans-serif", fontWeight: 500 }}>{chapterPhotos.length > 0 ? "Add more photos" : "Upload photos for this chapter"}</div>
          <div style={{ fontSize: fs(11), color: "#7a5c3a", fontFamily: "'Lato',sans-serif", marginTop: 1 }}>Click to browse or drag & drop · JPG, PNG</div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} aria-hidden="true" tabIndex={-1} />
      </div>
    </div>
  );
}

// ─── PRINT UPGRADE CARD ──────────────────────────────────────────────────────
// ─── PRINT ORDER AFTER PAY MODAL ─────────────────────────────────────────────
function PrintOrderAfterPayModal({ bookChoice, userEmail, userName, fs, tc, onClose }) {
  const [shipTo, setShipTo] = useState("me");
  const [fields, setFields] = useState({ name: userName || "", address: "", city: "", state: "", zip: "", country: "USA" });
  const [recipFields, setRecipFields] = useState({ name: "", address: "", city: "", state: "", zip: "", country: "USA" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const activeFields = shipTo === "me" ? fields : recipFields;
  const setActiveFields = shipTo === "me" ? setFields : setRecipFields;
  const copies = bookChoice === "print2" ? 2 : 1;

  const submit = async () => {
    const { name, address, city, state, zip } = activeFields;
    if (!name || !address || !city || !state || !zip) { setError("Please fill in all shipping fields."); return; }
    setLoading(true); setError("");
    try {
      await fetch("/api/email-print-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail, userName,
          option: `${copies} Printed ${copies === 1 ? "Copy" : "Copies"}`,
          price: copies === 1 ? 79 : 129,
          shipping: { ...activeFields, shipTo },
        }),
      });
      setSuccess(true);
    } catch { setError("Something went wrong. Please try again."); }
    setLoading(false);
  };

  if (success) return (
    <div style={{ textAlign: "center", padding: "8px 0" }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>✦</div>
      <p style={{ fontSize: fs(18), color: "#3d2b1a", fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", marginBottom: 8 }}>Order received!</p>
      <p style={{ fontSize: fs(13), color: "#7a6040", fontFamily: "'Lato',sans-serif", marginBottom: 20, lineHeight: 1.7 }}>We'll be in touch to confirm your shipping details once your book is complete.</p>
      <button onClick={onClose} style={{ background: "linear-gradient(135deg,#5c3d1e,#8b5e34)", color: "#fdf6ec", border: "none", padding: "14px 36px", borderRadius: 100, fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(17), cursor: "pointer", minHeight: 50 }}>
        Continue My Story ✦
      </button>
    </div>
  );

  return (
    <div>
      {/* Ship to selector */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {[["me","Ship to me"],["recipient","Ship to recipient"]].map(([id, label]) => (
          <button key={id} onClick={() => setShipTo(id)}
            style={{ flex: 1, padding: "11px", borderRadius: 10, border: `2px solid ${shipTo === id ? "#b8860b" : "rgba(180,140,80,0.25)"}`, background: shipTo === id ? "#fffdf5" : "white", fontFamily: "'Lato',sans-serif", fontSize: fs(13), fontWeight: 600, color: shipTo === id ? "#5c3d1e" : "#7a6040", cursor: "pointer", minHeight: 44 }}>
            {label}
          </button>
        ))}
      </div>
      {[["name","Full Name","text"],["address","Street Address","text"],["city","City","text"],["state","State","text"],["zip","ZIP Code","text"],["country","Country","text"]].map(([key, label, type]) => (
        <div key={key} style={{ marginBottom: 10 }}>
          <label style={{ display: "block", fontSize: fs(11), color: "#7a5c3a", fontFamily: "'Lato',sans-serif", fontWeight: 600, marginBottom: 4, letterSpacing: "0.5px" }}>{label}</label>
          <input type={type} value={activeFields[key] || ""} onChange={e => setActiveFields(p => ({ ...p, [key]: e.target.value }))}
            style={{ width: "100%", border: "1.5px solid rgba(180,140,80,0.3)", borderRadius: 8, padding: "10px 12px", fontFamily: "'Lato',sans-serif", fontSize: fs(14), color: "#3d2b1a", background: "#fffdf5", outline: "none", boxSizing: "border-box", minHeight: 44 }} />
        </div>
      ))}
      {error && <p style={{ fontSize: fs(13), color: "#c0392b", fontFamily: "'Lato',sans-serif", marginBottom: 10 }}>{error}</p>}
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button onClick={submit} disabled={loading}
          style={{ flex: 1, background: "linear-gradient(135deg,#5c3d1e,#8b5e34)", color: "#fdf6ec", border: "none", padding: "14px", borderRadius: 100, fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(17), cursor: loading ? "not-allowed" : "pointer", minHeight: 50, opacity: loading ? 0.7 : 1 }}>
          {loading ? "Placing order…" : `Confirm My Order ✦`}
        </button>
        <button onClick={onClose}
          style={{ background: "none", border: "1.5px solid rgba(180,140,80,0.3)", color: "#7a6040", fontFamily: "'Lato',sans-serif", fontSize: fs(13), padding: "14px 16px", borderRadius: 100, cursor: "pointer", minHeight: 50 }}>
          Skip for now
        </button>
      </div>
      <p style={{ fontSize: fs(11), color: "#a89070", fontFamily: "'Lato',sans-serif", textAlign: "center", marginTop: 10, lineHeight: 1.6 }}>
        You can also order a print copy any time from your completed book page
      </p>
    </div>
  );
}

function PrintUpgradeCard({ isLast, promoCode, promoInfo, fs, tc, highContrast, userEmail, userName }) {
  const [selected, setSelected] = useState(null);
  const [expanded, setExpanded] = useState(isLast);
  const [showShipping, setShowShipping] = useState(false);
  const [shippingFields, setShippingFields] = useState({ name: userName || "", address: "", city: "", state: "", zip: "", country: "USA" });
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderError, setOrderError] = useState("");

  const submitOrder = async () => {
    const { name, address, city, state, zip, country } = shippingFields;
    if (!name || !address || !city || !state || !zip) { setOrderError("Please fill in all shipping fields."); return; }
    setOrderLoading(true);
    setOrderError("");
    try {
      const selectedOption = PRINT_OPTIONS.find(o => o.id === selected);
      await fetch("/api/email-print-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail,
          userName: name,
          option: selectedOption?.label,
          price: discountedPrice(selectedOption?.price),
          shipping: { name, address, city, state, zip, country },
        }),
      });
      setOrderSuccess(true);
    } catch {
      setOrderError("Something went wrong. Please try again.");
    }
    setOrderLoading(false);
  };

  const PRINT_OPTIONS = [
    { id: "one", label: "1 Printed Copy", price: 79, desc: "Professionally bound, delivered to your door", icon: "📖" },
    { id: "two", label: "2 Printed Copies", price: 129, desc: "One for you, one to give", icon: "📚", popular: true },
    { id: "family", label: "Family Share Link", price: 19, desc: "Share the digital book with everyone", icon: "🔗" },
  ];

  const discount = promoInfo?.discount || 0;
  const schoolName = promoInfo?.school || null;

  const discountedPrice = (base) => discount ? Math.round(base * (1 - discount)) : base;
  const schoolShare = promoInfo?.schoolShare || 0;

  if (!expanded) {
    return (
      <div style={{ margin: "0 0 20px", padding: "14px 20px", background: "linear-gradient(135deg,rgba(184,134,11,0.08),rgba(93,61,26,0.05))", borderRadius: 12, border: "1px solid rgba(184,134,11,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }} aria-hidden="true">📖</span>
          <div>
            <div style={{ fontSize: fs(14), fontWeight: 600, color: tc("#3d2b1a","#1a0e00") }}>Want this as a printed book?</div>
            <div style={{ fontSize: fs(12), color: tc("#7a6040","#4a3020"), fontFamily: "'Lato',sans-serif" }}>Add a print copy any time — from $79</div>
          </div>
        </div>
        <button onClick={() => setExpanded(true)}
          style={{ background: "rgba(184,134,11,0.12)", border: "1.5px solid rgba(184,134,11,0.3)", color: "#7a5030", fontFamily: "'Lato',sans-serif", fontSize: fs(12), fontWeight: 600, padding: "8px 16px", borderRadius: 100, cursor: "pointer", whiteSpace: "nowrap", minHeight: 38 }}>
          See options →
        </button>
      </div>
    );
  }

  return (
    <div style={{ margin: "0 0 28px", background: "white", borderRadius: 16, border: "1.5px solid rgba(184,134,11,0.25)", boxShadow: "0 8px 32px rgba(93,61,26,0.1)", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#5c3d1e,#8b5e34)", padding: "20px 28px 18px" }}>
        {isLast
          ? <><div style={{ fontSize: fs(11), letterSpacing: "2px", textTransform: "uppercase", color: "rgba(253,246,236,0.65)", fontFamily: "'Lato',sans-serif", marginBottom: 6 }}>Your book is ready to print</div>
              <div style={{ fontSize: fs(22), fontWeight: 600, color: "#fdf6ec" }}>Turn your story into a printed heirloom</div>
              <div style={{ fontSize: fs(14), color: "rgba(253,246,236,0.75)", marginTop: 4, fontStyle: "italic" }}>Professionally bound, delivered to your door</div></>
          : <><div style={{ fontSize: fs(11), letterSpacing: "2px", textTransform: "uppercase", color: "rgba(253,246,236,0.65)", fontFamily: "'Lato',sans-serif", marginBottom: 6 }}>Pre-order your print copy</div>
              <div style={{ fontSize: fs(20), fontWeight: 600, color: "#fdf6ec" }}>Lock in your printed book now</div>
              <div style={{ fontSize: fs(13), color: "rgba(253,246,236,0.75)", marginTop: 4, fontStyle: "italic" }}>Charged when your book is complete — no rush</div></>
        }
        {schoolName && (
          <div style={{ marginTop: 10, background: "rgba(255,255,255,0.12)", borderRadius: 8, padding: "8px 14px", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }} aria-hidden="true">🏫</span>
            <span style={{ fontSize: fs(12), color: "rgba(253,246,236,0.9)", fontFamily: "'Lato',sans-serif" }}>
              <strong style={{ color: "#fdf6ec" }}>${schoolShare}</strong> from your purchase goes to {schoolName}
            </span>
          </div>
        )}
      </div>

      {/* Options */}
      <div style={{ padding: "20px 28px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }} role="group" aria-label="Print upgrade options">
          {PRINT_OPTIONS.map(opt => {
            const isSelected = selected === opt.id;
            const finalPrice = discountedPrice(opt.price);
            return (
              <button key={opt.id} onClick={() => setSelected(isSelected ? null : opt.id)}
                aria-pressed={isSelected}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 10, border: `${highContrast ? 3 : 2}px solid ${isSelected ? "#b8860b" : "rgba(180,140,80,0.22)"}`, background: isSelected ? "#fffdf5" : "white", cursor: "pointer", textAlign: "left", position: "relative", minHeight: 62 }}>
                {opt.popular && <div style={{ position: "absolute", top: -10, right: 14, background: "linear-gradient(135deg,#b8860b,#d4a843)", color: "#fdf6ec", fontSize: fs(10), fontFamily: "'Lato',sans-serif", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", padding: "3px 12px", borderRadius: 100 }}>Most Popular</div>}
                <div style={{ width: 36, height: 36, borderRadius: "50%", border: `2px solid ${isSelected ? "#b8860b" : "rgba(180,140,80,0.35)"}`, background: isSelected ? "#b8860b" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} aria-hidden="true">
                  {isSelected
                    ? <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="#fdf6ec" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    : <span style={{ fontSize: 16 }}>{opt.icon}</span>
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: fs(15), fontWeight: 600, color: tc("#3d2b1a","#1a0e00") }}>{opt.label}</div>
                  <div style={{ fontSize: fs(12), color: tc("#7a6040","#4a3020"), fontFamily: "'Lato',sans-serif", marginTop: 2 }}>{opt.desc}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {discount > 0 && <div style={{ fontSize: fs(11), color: "#a89070", fontFamily: "'Lato',sans-serif", textDecoration: "line-through" }}>${opt.price}</div>}
                  <div style={{ fontSize: fs(18), fontWeight: 600, color: isSelected ? "#b8860b" : tc("#3d2b1a","#1a0e00") }}>${finalPrice}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Discount callout */}
        {discount > 0 && (
          <div style={{ background: "rgba(184,134,11,0.08)", border: "1px solid rgba(184,134,11,0.25)", borderRadius: 8, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <span aria-hidden="true">🏷️</span>
            <span style={{ fontSize: fs(13), color: tc("#5c3d1e","#2a1000"), fontFamily: "'Lato',sans-serif" }}>
              Code <strong>{promoCode}</strong> applied — {Math.round(discount * 100)}% off print upgrades
            </span>
          </div>
        )}

        {/* Shipping address form — shown after selecting an option */}
        {showShipping ? (
          <div style={{ animation: "slideDown 0.25s ease forwards" }}>
            <div style={{ fontSize: fs(15), fontWeight: 600, color: tc("#3d2b1a","#1a0e00"), fontFamily: "'Cormorant Garamond',serif", marginBottom: 4 }}>
              Where should we send your book?
            </div>
            <p style={{ fontSize: fs(12), color: tc("#8b7355","#5c3d1e"), fontFamily: "'Lato',sans-serif", marginBottom: 14 }}>
              {PRINT_OPTIONS.find(o => o.id === selected)?.label} — ${discountedPrice(PRINT_OPTIONS.find(o => o.id === selected)?.price)}
            </p>
            {[["name","Full Name","text"],["address","Street Address","text"],["city","City","text"],["state","State","text"],["zip","ZIP Code","text"],["country","Country","text"]].map(([key, label, type]) => (
              <div key={key} style={{ marginBottom: 10 }}>
                <label style={{ display: "block", fontSize: fs(11), color: tc("#7a5c3a","#4a3020"), fontFamily: "'Lato',sans-serif", fontWeight: 600, marginBottom: 4, letterSpacing: "0.5px" }}>{label}</label>
                <input type={type} value={shippingFields[key] || ""} onChange={e => setShippingFields(p => ({ ...p, [key]: e.target.value }))}
                  style={{ width: "100%", border: "1.5px solid rgba(180,140,80,0.3)", borderRadius: 8, padding: "10px 12px", fontFamily: "'Lato',sans-serif", fontSize: fs(14), color: tc("#3d2b1a","#1a0e00"), background: "#fffdf5", outline: "none", boxSizing: "border-box", minHeight: 44 }} />
              </div>
            ))}
            {orderError && <p style={{ fontSize: fs(13), color: "#c0392b", fontFamily: "'Lato',sans-serif", marginBottom: 10 }}>{orderError}</p>}
            {orderSuccess ? (
              <div style={{ background: "rgba(184,134,11,0.08)", border: "1px solid rgba(184,134,11,0.25)", borderRadius: 10, padding: "16px", textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>✦</div>
                <p style={{ fontSize: fs(15), color: tc("#3d2b1a","#1a0e00"), fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", marginBottom: 4 }}>Order received!</p>
                <p style={{ fontSize: fs(13), color: tc("#6b5540","#3a2510"), fontFamily: "'Lato',sans-serif" }}>We'll be in touch at your email to confirm shipping details.</p>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button onClick={submitOrder} disabled={orderLoading}
                  style={{ flex: 1, background: "linear-gradient(135deg,#5c3d1e,#8b5e34)", color: "#fdf6ec", border: "none", padding: "14px", borderRadius: 100, fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(16), cursor: "pointer", minHeight: 50, transition: "all 0.2s" }}>
                  {orderLoading ? "Placing order…" : `Place My Order — $${discountedPrice(PRINT_OPTIONS.find(o => o.id === selected)?.price)} ✦`}
                </button>
                <button onClick={() => setShowShipping(false)}
                  style={{ background: "none", border: "1.5px solid rgba(180,140,80,0.3)", color: tc("#6b5540","#3a2510"), fontFamily: "'Lato',sans-serif", fontSize: fs(13), padding: "14px 16px", borderRadius: 100, cursor: "pointer", minHeight: 50 }}>
                  Back
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <button disabled={!selected} onClick={() => selected && setShowShipping(true)}
              style={{ width: "100%", background: selected ? "linear-gradient(135deg,#5c3d1e,#8b5e34)" : "rgba(139,94,52,0.15)", color: selected ? "#fdf6ec" : "#a89070", border: "none", padding: "16px", borderRadius: 100, fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(17), letterSpacing: 0.5, cursor: selected ? "pointer" : "not-allowed", transition: "all 0.2s", minHeight: 54 }}>
              {selected ? `Order ${PRINT_OPTIONS.find(o => o.id === selected)?.label} — $${discountedPrice(PRINT_OPTIONS.find(o => o.id === selected)?.price)} ✦` : "Select an option above"}
            </button>
            <p style={{ fontSize: fs(11), color: tc("#a89070","#6b5030"), fontFamily: "'Lato',sans-serif", textAlign: "center", marginTop: 10, lineHeight: 1.6 }}>
              We'll collect your shipping address on the next step
            </p>
          </>
        )}
        {!isLast && !showShipping && <button onClick={() => setExpanded(false)} style={{ display: "block", margin: "6px auto 0", background: "none", border: "none", color: tc("#a89070","#6b5030"), fontFamily: "'Lato',sans-serif", fontSize: fs(12), cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, minHeight: 36, padding: "4px 12px" }}>Not now</button>}
      </div>
    </div>
  );
}

// ─── CHAPTER PREVIEW ─────────────────────────────────────────────────────────
function ChapterPreview({ chapter, chapterIndex, chapterMessages, chapterPhotos, onContinue, onAddMore, nextChapterTitle, isLast, fs, tc, highContrast, promoCode, promoInfo, narrative, generatingNarrative, personaAvatarBg, personaAvatar, userEmail, userName }) {
  const chPhotos = chapterPhotos || [];
  const [editedNarrative, setEditedNarrative] = useState(null);
  const [editChat, setEditChat] = useState([]);
  const [editInput, setEditInput] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [showEditChat, setShowEditChat] = useState(false);
  const editEndRef = useRef(null);
  const displayNarrative = editedNarrative || narrative;

  useEffect(() => { editEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [editChat]);

  const sendEditMessage = async (text) => {
    const msg = text || editInput.trim();
    if (!msg || editLoading) return;
    setEditInput("");
    setEditLoading(true);

    const newChat = [...editChat, { role: "user", content: msg }];
    setEditChat(newChat);

    try {
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 3000,
          system: `You are Grace, a warm memoir editor helping someone refine their legacy book section. You have two jobs:

1. CONVERSATION — respond warmly and naturally to what they say. Ask clarifying questions if needed. Be encouraging.
2. REVISION — when you have enough to make a change, rewrite the full section incorporating their feedback.

The current memoir section is:
---
${displayNarrative}
---

When you revise the section, you MUST wrap the entire revised prose in <REVISED_SECTION> tags like this:
<REVISED_SECTION>
[full revised memoir prose here]
</REVISED_SECTION>

Then add a warm 1-2 sentence response after the tags explaining what you changed.

If you're asking a clarifying question and not yet ready to revise, just respond conversationally WITHOUT the tags. Always end your clarifying question with: "When you're happy, just say **'Yes, go ahead'** and I'll update your section right away." so the user knows exactly what to do next.

Keep their voice. Keep the warmth. Make it sound like them, not like a textbook.`,
          messages: newChat.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const responseText = data.content?.[0]?.text || "I'm here — tell me more about what you'd like to change.";

      // Check if Grace revised the section
      const revisedMatch = responseText.match(/<REVISED_SECTION>([\s\S]*?)<\/REVISED_SECTION>/);
      const displayResponse = responseText.replace(/<REVISED_SECTION>[\s\S]*?<\/REVISED_SECTION>/g, "").trim();

      if (revisedMatch) {
        setEditedNarrative(revisedMatch[1].trim());
      }

      setEditChat([...newChat, { role: "assistant", content: displayResponse || "I've updated your section — take a look above!" }]);
    } catch {
      setEditChat([...newChat, { role: "assistant", content: "I'm here. Tell me what you'd like to change." }]);
    }
    setEditLoading(false);
  };

  // Split narrative into paragraphs for book-like rendering
  const paragraphs = (displayNarrative || narrative || "")
    .split(/\n+/).map(p => p.trim()).filter(p => p.length > 0);

  // Interleave photos naturally — first photo after paragraph 2, second after paragraph 4
  const photoPositions = { 2: chPhotos[0], 4: chPhotos[1], 6: chPhotos[2] };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 32px", width: "100%", animation: "fadeUp 0.4s ease forwards" }} role="main">
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 36, marginBottom: 10 }} aria-hidden="true">✨</div>
        <h2 style={{ fontSize: fs(28), fontWeight: 600, color: tc("#3d2b1a","#1a0e00"), marginBottom: 6 }}>{chapter.title} — Complete</h2>
        <p style={{ fontSize: fs(16), color: "#6b5540", fontStyle: "italic", fontFamily: "'Cormorant Garamond',Georgia,serif" }}>
          {generatingNarrative ? "Writing this section…" : "Here's a glimpse of how this section will look in your book"}
        </p>
      </div>

      {/* Book page mockup */}
      <div style={{ background: "white", borderRadius: 16, boxShadow: "0 12px 48px rgba(93,61,26,0.14)", overflow: "hidden", marginBottom: 24, border: "1px solid rgba(180,140,80,0.15)" }}>

        {/* Chapter header */}
        <div style={{ background: chapter.color || "#f5ede0", padding: "18px 32px 16px", borderBottom: "1px solid rgba(180,140,80,0.15)", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 22 }} aria-hidden="true">{chapter.icon}</span>
          <div>
            <div style={{ fontSize: fs(11), letterSpacing: "2px", textTransform: "uppercase", color: "#7a5c3a", fontFamily: "'Lato',sans-serif", marginBottom: 2 }}>Chapter</div>
            <div style={{ fontSize: fs(22), fontWeight: 600, color: "#3d2b1a" }}>{chapter.title}</div>
          </div>
          <div style={{ marginLeft: "auto", fontSize: fs(11), color: "#8b7355", fontFamily: "'Lato',sans-serif" }}>MyStory.Family</div>
        </div>

        {/* Narrative body */}
        <div style={{ padding: "32px 40px" }}>
          {generatingNarrative ? (
            /* Writing animation */
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <div style={{ fontSize: 32, marginBottom: 20, animation: "pulse 1.5s ease-in-out infinite" }} aria-hidden="true">✦</div>
              <p style={{ fontSize: fs(18), color: "#6b5540", fontStyle: "italic", fontFamily: "'Cormorant Garamond',Georgia,serif", marginBottom: 10 }}>
                Writing this section…
              </p>
              <p style={{ fontSize: fs(13), color: "#a89070", fontFamily: "'Lato',sans-serif" }}>
                Almost done — we'll continue to the next section when it's ready
              </p>
              {/* Shimmer placeholder lines */}
              <div style={{ marginTop: 32, textAlign: "left" }}>
                {[100, 92, 97, 85, 100, 78, 94, 88, 100, 72].map((w, i) => (
                  <div key={i} style={{
                    height: 14, borderRadius: 7, marginBottom: 10,
                    width: `${w}%`,
                    background: "linear-gradient(90deg, rgba(180,140,80,0.1) 25%, rgba(180,140,80,0.2) 50%, rgba(180,140,80,0.1) 75%)",
                    backgroundSize: "200% 100%",
                    animation: `shimmer 1.8s ease-in-out infinite ${i * 0.1}s`,
                  }} />
                ))}
              </div>
            </div>
          ) : paragraphs.length > 0 ? (
            /* Memoir prose with photos interleaved */
            <div style={{ display: "flex", gap: 32 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {paragraphs.map((para, i) => (
                  <div key={i}>
                    <p style={{
                      fontSize: fs(16),
                      color: tc("#3d2b1a","#1a0e00"),
                      lineHeight: 2.0,
                      fontFamily: "'Cormorant Garamond',Georgia,serif",
                      marginBottom: 20,
                      textIndent: i === 0 ? 0 : "1.5em",
                    }}>
                      {para}
                    </p>
                    {/* Photo after certain paragraphs on mobile — inline */}
                    {chPhotos.length > 0 && photoPositions[i] && (
                      <div style={{ display: "none" }} className="mobile-photo">
                        <div style={{ borderRadius: 8, overflow: "hidden", aspectRatio: "4/3", border: "1px solid rgba(180,140,80,0.2)", marginBottom: 20 }}>
                          <img src={photoPositions[i].url} alt="Chapter photo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Photos column — desktop */}
              {chPhotos.length > 0 && (
                <div style={{ width: 180, flexShrink: 0 }}>
                  {chPhotos.slice(0, 3).map((photo, i) => (
                    <div key={photo.id} style={{ borderRadius: 8, overflow: "hidden", aspectRatio: "4/3", border: "1px solid rgba(180,140,80,0.2)", marginBottom: 14 }}>
                      <img src={photo.url} alt="Chapter photo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ))}
                  {chPhotos.length > 3 && <div style={{ fontSize: fs(12), color: "#a89070", fontFamily: "'Lato',sans-serif", textAlign: "center" }}>+{chPhotos.length - 3} more</div>}
                </div>
              )}
            </div>
          ) : (
            /* Fallback if narrative unavailable */
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <p style={{ fontSize: fs(15), color: "#a89070", fontStyle: "italic", lineHeight: 1.8 }}>
                Your section is ready. Continue to see the full formatted version in your book.
              </p>
            </div>
          )}
        </div>

        <div style={{ padding: "12px 32px", borderTop: "1px solid rgba(180,140,80,0.1)", display: "flex", justifyContent: "space-between", background: "rgba(253,246,236,0.5)" }}>
          <div style={{ fontSize: fs(11), color: "#c4a882", fontFamily: "'Lato',sans-serif", fontStyle: "italic" }}>
            {generatingNarrative ? "Writing this section…" : "Preview — final layout professionally formatted"}
          </div>
          <div style={{ fontSize: fs(11), color: "#c4a882", fontFamily: "'Lato',sans-serif" }}>1</div>
        </div>
      </div>

      {/* Print upgrade card — only show when narrative is ready */}
      {!generatingNarrative && chapterIndex > 0 && (
        <PrintUpgradeCard isLast={isLast} promoCode={promoCode} promoInfo={promoInfo} fs={fs} tc={tc} highContrast={highContrast} userEmail={userEmail} userName={userName} />
      )}

      {/* Talk to Grace about this section */}
      {!generatingNarrative && narrative && (
        <div style={{ background: "white", borderRadius: 16, marginBottom: 20, border: "1px solid rgba(180,140,80,0.15)", boxShadow: "0 4px 20px rgba(93,61,26,0.06)", overflow: "hidden" }}>

          {/* Header */}
          <div style={{ padding: "20px 24px", borderBottom: showEditChat ? "1px solid rgba(180,140,80,0.12)" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: personaAvatarBg || "linear-gradient(135deg,#6b4c8a,#9b7bc0)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{personaAvatar || "🕊️"}</div>
                <div>
                  <div style={{ fontSize: fs(15), fontWeight: 600, color: tc("#3d2b1a","#1a0e00"), fontFamily: "'Cormorant Garamond',serif" }}>
                    Talk to Grace about this section
                  </div>
                  <div style={{ fontSize: fs(12), color: tc("#8b7355","#5c3d1e"), fontFamily: "'Lato',sans-serif" }}>
                    She can rewrite, simplify, add detail, fix names — anything you need
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {!showEditChat && (
                  <button onClick={() => { setShowEditChat(true); if (editChat.length === 0) setEditChat([{ role: "assistant", content: `I've read your ${chapter.title} section. What would you like to change?\n\nTell me what feels off — or pick one of the suggestions below. When you're happy with my idea, just say "Yes, go ahead" and I'll update your section right away.` }]); }}
                    style={{ background: "rgba(184,134,11,0.08)", border: "1.5px solid rgba(184,134,11,0.3)", color: tc("#7a5030","#3d2b1a"), fontFamily: "'Lato',sans-serif", fontSize: fs(13), fontWeight: 600, padding: "10px 20px", borderRadius: 100, cursor: "pointer", minHeight: 44 }}>
                    ✦ Talk to Grace
                  </button>
                )}
                {editedNarrative && (
                  <button onClick={() => { setEditedNarrative(null); setEditChat([]); setShowEditChat(false); }}
                    style={{ background: "transparent", border: "1.5px solid rgba(180,140,80,0.2)", color: tc("#a89070","#6b5030"), fontFamily: "'Lato',sans-serif", fontSize: fs(12), padding: "10px 16px", borderRadius: 100, cursor: "pointer", minHeight: 44 }}>
                    Undo all changes
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Chat area */}
          {showEditChat && (
            <div>
              {/* How it works */}
              {editChat.length <= 1 && (
                <div style={{ padding: "14px 24px 0" }}>
                  <div style={{ background: "rgba(184,134,11,0.06)", border: "1px solid rgba(184,134,11,0.15)", borderRadius: 10, padding: "12px 16px", marginBottom: 10 }}>
                    <p style={{ fontSize: fs(13), color: tc("#6b5030","#3d2b1a"), fontFamily: "'Lato',sans-serif", lineHeight: 1.7, margin: 0 }}>
                      💡 <strong>How this works:</strong> Tell Grace what you'd like to change. She may ask a quick question — then say <strong>"Yes, go ahead"</strong> and she'll update your section automatically.
                    </p>
                  </div>
                </div>
              )}

              {/* Quick suggestion chips */}
              {editChat.length <= 1 && (
                <div style={{ padding: "14px 24px 0", display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {["Make it shorter", "Use simpler words", "Add more detail", "Fix a name or date", "Make it sound more like me"].map(suggestion => (
                    <button key={suggestion} onClick={() => sendEditMessage(suggestion)}
                      style={{ background: "rgba(184,134,11,0.06)", border: "1px solid rgba(184,134,11,0.2)", color: tc("#6b5030","#3d2b1a"), fontFamily: "'Lato',sans-serif", fontSize: fs(12), padding: "7px 14px", borderRadius: 100, cursor: "pointer", minHeight: 36 }}>
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              {/* Messages */}
              <div style={{ padding: "16px 24px", maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
                {editChat.map((msg, i) => (
                  <div key={i}>
                    <div style={{ display: "flex", gap: 10, flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
                      <div style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: msg.role === "user" ? 10 : 13, background: msg.role === "user" ? "linear-gradient(135deg,#b8860b,#d4a843)" : (personaAvatarBg || "linear-gradient(135deg,#6b4c8a,#9b7bc0)"), color: "#fdf6ec", fontFamily: "'Lato',sans-serif", fontWeight: 700 }}>
                        {msg.role === "user" ? "You" : (personaAvatar || "🕊️")}
                      </div>
                      <div style={{ maxWidth: "80%", padding: "12px 16px", borderRadius: msg.role === "user" ? "14px 4px 14px 14px" : "4px 14px 14px 14px", background: msg.role === "user" ? "linear-gradient(135deg,#5c3d1e,#7a5030)" : "#fdf6ec", color: msg.role === "user" ? "#fdf6ec" : tc("#3d2b1a","#1a0e00"), fontSize: fs(15), fontFamily: "'Cormorant Garamond',Georgia,serif", lineHeight: 1.8, border: msg.role === "assistant" ? "1px solid rgba(180,140,80,0.15)" : "none" }}>
                        {msg.content}
                        {msg.role === "assistant" && i === editChat.length - 1 && editedNarrative && (
                          <div style={{ marginTop: 8, fontSize: fs(12), color: "#b8860b", fontFamily: "'Lato',sans-serif", fontStyle: "normal" }}>✦ Section updated — scroll up to see the changes</div>
                        )}
                      </div>
                    </div>
                    {/* Yes go ahead button — show after Grace's non-final responses when no update yet */}
                    {msg.role === "assistant" && i === editChat.length - 1 && !editedNarrative && !editLoading && i > 0 && (
                      <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 10, paddingLeft: 40 }}>
                        <button onClick={() => sendEditMessage("Yes, go ahead")}
                          style={{ background: "linear-gradient(135deg,#b8860b,#d4a843)", color: "#fdf6ec", border: "none", borderRadius: 100, padding: "10px 22px", fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(15), cursor: "pointer", letterSpacing: 0.3, minHeight: 40, boxShadow: "0 3px 12px rgba(184,134,11,0.3)" }}>
                          ✦ Yes, go ahead
                        </button>
                        <span style={{ fontSize: fs(12), color: tc("#a89070","#6b5030"), fontFamily: "'Lato',sans-serif", alignSelf: "center", marginLeft: 12, fontStyle: "italic" }}>— tap when you're ready</span>
                      </div>
                    )}
                  </div>
                ))}
                {editLoading && (
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: personaAvatarBg || "linear-gradient(135deg,#6b4c8a,#9b7bc0)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>{personaAvatar || "🕊️"}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "12px 16px", background: "#fdf6ec", borderRadius: "4px 14px 14px 14px", border: "1px solid rgba(180,140,80,0.15)" }}>
                      {[0, 0.2, 0.4].map((d, i) => <div key={i} style={{ width: 6, height: 6, background: "#c9a87a", borderRadius: "50%", animation: `bounce 1.2s ${d}s infinite` }} />)}
                    </div>
                  </div>
                )}
                <div ref={editEndRef} />
              </div>

              {/* Input */}
              <div style={{ padding: "12px 24px 16px", borderTop: "1px solid rgba(180,140,80,0.1)", display: "flex", gap: 10, alignItems: "flex-end" }}>
                <textarea value={editInput} onChange={e => setEditInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendEditMessage(); } }}
                  placeholder="Tell Grace what you'd like to change..."
                  rows={1}
                  style={{ flex: 1, border: "1.5px solid rgba(180,140,80,0.25)", borderRadius: 10, padding: "10px 14px", fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(15), color: tc("#3d2b1a","#1a0e00"), background: "#fffdf5", outline: "none", resize: "none", lineHeight: 1.6, minHeight: 42, maxHeight: 100, overflowY: "auto" }} />
                <button onClick={() => sendEditMessage()} disabled={!editInput.trim() || editLoading}
                  style={{ width: 42, height: 42, borderRadius: "50%", background: editInput.trim() && !editLoading ? (personaAvatarBg || "linear-gradient(135deg,#6b4c8a,#9b7bc0)") : "rgba(139,94,52,0.2)", border: "none", cursor: editInput.trim() && !editLoading ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke="#fdf6ec" strokeWidth="2" strokeLinecap="round"/><path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#fdf6ec" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <button onClick={onContinue} disabled={generatingNarrative}
          style={{ background: generatingNarrative ? "rgba(139,94,52,0.3)" : "linear-gradient(135deg,#5c3d1e,#8b5e34)", color: "#fdf6ec", border: "none", padding: "18px 52px", borderRadius: 100, fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(18), letterSpacing: 1, cursor: generatingNarrative ? "not-allowed" : "pointer", boxShadow: generatingNarrative ? "none" : "0 4px 20px rgba(93,61,26,0.2)", minHeight: 56, transition: "all 0.3s" }}>
          {generatingNarrative ? "Writing this section…" : isLast ? "Complete My Legacy Story ✦" : `Continue to ${nextChapterTitle} →`}
        </button>
        {!generatingNarrative && (
          <button onClick={onAddMore} style={{ background: "transparent", border: "2px solid rgba(180,140,80,0.4)", color: "#6b4c2a", fontFamily: "'Lato',sans-serif", fontSize: fs(13), letterSpacing: "1px", textTransform: "uppercase", padding: "13px 28px", borderRadius: 100, cursor: "pointer", minHeight: 48 }}>
            ← Go back & add more to this section
          </button>
        )}
      </div>
    </div>
  );
}

// ─── BOOK SHARE CARD ─────────────────────────────────────────────────────────
function BookShareCard({ user, chapters, chapterNarratives, fs, tc, shareUrl, setShareUrl }) {
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const generateLink = async () => {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/book-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: user?.email,
          userName: `${user?.firstName || ""} ${user?.lastName || ""}`.trim(),
          chapters,
          chapterNarratives,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShareUrl(data.url);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setGenerating(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ background: "white", borderRadius: 20, padding: "36px", boxShadow: "0 12px 48px rgba(93,61,26,0.14)", border: "1px solid rgba(180,140,80,0.2)", marginBottom: 24 }}>
      <div style={{ fontSize: 36, marginBottom: 16, textAlign: "center" }} aria-hidden="true">📖</div>
      <h2 style={{ fontSize: fs(24), fontWeight: 400, color: tc("#3d2b1a","#1a0e00"), marginBottom: 10, textAlign: "center" }}>Your Legacy Book</h2>
      <p style={{ fontSize: fs(15), color: tc("#6b5540","#3a2510"), fontFamily: "'Lato',sans-serif", lineHeight: 1.7, marginBottom: 24, textAlign: "center" }}>
        Generate a beautiful link to your complete book — share it with family, save it to your phone, or send it by email.
      </p>

      {!shareUrl ? (
        <>
          <button onClick={generateLink} disabled={generating}
            style={{ width: "100%", background: generating ? "rgba(184,134,11,0.3)" : "linear-gradient(135deg,#b8860b,#d4a843)", color: "#fdf6ec", border: "none", padding: "20px", borderRadius: 100, fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(20), letterSpacing: 0.5, cursor: generating ? "not-allowed" : "pointer", boxShadow: generating ? "none" : "0 6px 28px rgba(184,134,11,0.35)", marginBottom: 12, minHeight: 62, transition: "all 0.2s" }}>
            {generating ? "Creating your book link…" : "✦ Create My Book Link"}
          </button>
          {error && <p style={{ fontSize: fs(13), color: "#c0392b", fontFamily: "'Lato',sans-serif", textAlign: "center" }}>{error}</p>}
          <p style={{ fontSize: fs(12), color: tc("#a89070","#6b5030"), fontFamily: "'Lato',sans-serif", lineHeight: 1.6, textAlign: "center" }}>
            Your book will be available at a private link only you can share
          </p>
        </>
      ) : (
        <div>
          <div style={{ background: "#fdf6ec", border: "1.5px solid rgba(184,134,11,0.3)", borderRadius: 12, padding: "14px 18px", marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
            <a href={shareUrl} target="_blank" rel="noreferrer"
              style={{ flex: 1, fontSize: fs(14), color: "#b8860b", fontFamily: "'Lato',sans-serif", wordBreak: "break-all", textDecoration: "none" }}>
              {shareUrl}
            </a>
            <button onClick={copyLink}
              style={{ background: copied ? "rgba(184,134,11,0.15)" : "rgba(184,134,11,0.08)", border: "1px solid rgba(184,134,11,0.3)", color: "#7a5030", fontFamily: "'Lato',sans-serif", fontSize: fs(12), fontWeight: 600, padding: "8px 14px", borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, minHeight: 36 }}>
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <a href={shareUrl} target="_blank" rel="noreferrer"
              style={{ flex: 1, display: "block", background: "linear-gradient(135deg,#b8860b,#d4a843)", color: "#fdf6ec", padding: "14px", borderRadius: 100, fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(17), textAlign: "center", textDecoration: "none", minHeight: 50, lineHeight: "22px" }}>
              ✦ View My Book
            </a>
            <button onClick={generateLink} disabled={generating}
              style={{ background: "none", border: "1.5px solid rgba(180,140,80,0.3)", color: tc("#6b5540","#3a2510"), fontFamily: "'Lato',sans-serif", fontSize: fs(12), padding: "14px 16px", borderRadius: 100, cursor: "pointer", whiteSpace: "nowrap" }}>
              Refresh link
            </button>
          </div>
          <p style={{ fontSize: fs(12), color: tc("#a89070","#6b5030"), fontFamily: "'Lato',sans-serif", lineHeight: 1.6, textAlign: "center" }}>
            Share this link with anyone — family can read your book on any device
          </p>
        </div>
      )}
    </div>
  );
}

// ─── BOOK EMAIL CARD ──────────────────────────────────────────────────────────
function BookEmailCard({ user, chapters, chapterNarratives, fs, tc, shareUrl }) {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const sendBook = async () => {
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/email-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: user?.email,
          userName: `${user?.firstName || ""} ${user?.lastName || ""}`.trim(),
          recipientEmail: recipientEmail.trim() || user?.email,
          shareUrl,
          chapters,
          chapterNarratives,
        }),
      });
      if (!res.ok) throw new Error("Send failed");
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setSending(false);
  };

  return (
    <div style={{ background: "white", borderRadius: 20, padding: "32px", boxShadow: "0 8px 32px rgba(93,61,26,0.08)", border: "1px solid rgba(180,140,80,0.15)", marginBottom: 24 }}>
      <div style={{ fontSize: 32, marginBottom: 14, textAlign: "center" }} aria-hidden="true">💌</div>
      <h2 style={{ fontSize: fs(22), fontWeight: 400, color: tc("#3d2b1a","#1a0e00"), marginBottom: 8, textAlign: "center" }}>Share Your Book by Email</h2>
      <p style={{ fontSize: fs(14), color: tc("#6b5540","#3a2510"), fontFamily: "'Lato',sans-serif", lineHeight: 1.7, marginBottom: 20, textAlign: "center" }}>
        Grace will write a personal letter introducing your book — then send the full story to you and your family in one beautiful email they can read and forward.
      </p>

      {sent ? (
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🕊️</div>
          <p style={{ fontSize: fs(17), color: tc("#3d2b1a","#1a0e00"), fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", margin: "0 0 6px" }}>
            Your book is on its way.
          </p>
          <p style={{ fontSize: fs(13), color: tc("#8b7355","#5c3d1e"), fontFamily: "'Lato',sans-serif" }}>
            Check your inbox — and forward it to everyone who should have this.
          </p>
        </div>
      ) : !showForm ? (
        <button onClick={() => setShowForm(true)}
          style={{ width: "100%", background: "linear-gradient(135deg,#5c3d1e,#8b5e34)", color: "#fdf6ec", border: "none", padding: "18px", borderRadius: 100, fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(18), cursor: "pointer", minHeight: 56 }}>
          ✦ Send My Book by Email
        </button>
      ) : (
        <div>
          <p style={{ fontSize: fs(13), color: tc("#6b5540","#3a2510"), fontFamily: "'Lato',sans-serif", marginBottom: 12 }}>
            We'll send it to <strong>{user?.email}</strong> automatically. Want to also send it to someone else?
          </p>
          <input type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)}
            placeholder="Family member's email (optional)"
            style={{ width: "100%", border: "1.5px solid rgba(180,140,80,0.3)", borderRadius: 10, padding: "12px 14px", fontFamily: "'Lato',sans-serif", fontSize: fs(14), color: tc("#3d2b1a","#1a0e00"), background: "#fffdf5", outline: "none", boxSizing: "border-box", marginBottom: 12, minHeight: 46 }} />
          {error && <p style={{ fontSize: fs(13), color: "#c0392b", fontFamily: "'Lato',sans-serif", marginBottom: 10 }}>{error}</p>}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={sendBook} disabled={sending}
              style={{ flex: 1, background: "linear-gradient(135deg,#5c3d1e,#8b5e34)", color: "#fdf6ec", border: "none", padding: "14px", borderRadius: 100, fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(17), cursor: sending ? "not-allowed" : "pointer", minHeight: 50, opacity: sending ? 0.7 : 1 }}>
              {sending ? "Grace is writing your letter…" : "Send My Book ✦"}
            </button>
            <button onClick={() => setShowForm(false)}
              style={{ background: "none", border: "1.5px solid rgba(180,140,80,0.3)", color: tc("#6b5540","#3a2510"), fontFamily: "'Lato',sans-serif", fontSize: fs(13), padding: "14px 18px", borderRadius: 100, cursor: "pointer", minHeight: 50 }}>
              Cancel
            </button>
          </div>
          <p style={{ fontSize: fs(11), color: tc("#a89070","#6b5030"), fontFamily: "'Lato',sans-serif", textAlign: "center", marginTop: 10, lineHeight: 1.6 }}>
            Grace will write a personal introduction — then send the full book as a beautiful email
          </p>
        </div>
      )}
    </div>
  );
}

// ─── FULL BOOK EDITOR ────────────────────────────────────────────────────────
function FullBookEditor({ chapters, chapterNarratives, setChapterNarratives, persona, personaAvatarBg, personaAvatar, fs, tc }) {
  const [chat, setChat] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [editsUsed, setEditsUsed] = useState(0);
  const EDIT_LIMIT = 3;
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  const fullBookText = chapters.map(ch => {
    const narrative = chapterNarratives[ch.id || ch.title] || "";
    return narrative ? `=== ${ch.title} ===\n${narrative}` : null;
  }).filter(Boolean).join("\n\n");

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");
    setLoading(true);
    const newChat = [...chat, { role: "user", content: msg }];
    setChat(newChat);

    try {
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          system: `You are Grace, a warm memoir editor. You have access to this person's complete legacy book. Your job is to make any additions or changes they request — adding a person, a memory, a detail — into the right section naturally.

THE COMPLETE BOOK:
${fullBookText}

HOW TO RESPOND:
1. Warmly acknowledge what they want to add
2. Make the change — weave it naturally into the right section
3. Return ONLY the updated section(s) wrapped in tags like this:
<UPDATED_SECTION id="early-life">
[full updated prose for this section]
</UPDATED_SECTION>

You can update multiple sections if needed. After the tags, add a warm 1-2 sentence note about what you changed.

If you need clarification before making a change, ask ONE question first without tags.`,
          messages: newChat.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const responseText = data.content?.[0]?.text || "I'm here — what would you like to add?";

      // Extract any updated sections
      const sectionMatches = [...responseText.matchAll(/<UPDATED_SECTION id="([^"]+)">([\s\S]*?)<\/UPDATED_SECTION>/g)];
      if (sectionMatches.length > 0) {
        setChapterNarratives(prev => {
          const updated = { ...prev };
          sectionMatches.forEach(([, id, prose]) => {
            updated[id] = prose.trim();
          });
          return updated;
        });
        setEditsUsed(prev => prev + 1);
      }

      const displayText = responseText.replace(/<UPDATED_SECTION[\s\S]*?<\/UPDATED_SECTION>/g, "").trim();
      setChat([...newChat, {
        role: "assistant",
        content: displayText || (sectionMatches.length > 0 ? "I've updated your book — you can download the new version above." : "I'm here — tell me what you'd like to add."),
        hasUpdates: sectionMatches.length > 0,
        updatedSections: sectionMatches.map(([, id]) => id),
      }]);
    } catch {
      setChat([...newChat, { role: "assistant", content: "I'm here. Tell me what you'd like to add or change." }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ background: "white", borderRadius: 20, overflow: "hidden", boxShadow: "0 8px 32px rgba(93,61,26,0.08)", border: "1px solid rgba(180,140,80,0.15)", marginBottom: 24 }}>
      {/* Header */}
      <div style={{ padding: "24px 28px", borderBottom: showChat ? "1px solid rgba(180,140,80,0.12)" : "none" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: personaAvatarBg || "linear-gradient(135deg,#6b4c8a,#9b7bc0)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{personaAvatar || "🕊️"}</div>
            <div>
              <div style={{ fontSize: fs(16), fontWeight: 600, color: tc("#3d2b1a","#1a0e00"), fontFamily: "'Cormorant Garamond',serif" }}>Ask Grace to update your book</div>
              <div style={{ fontSize: fs(12), color: tc("#8b7355","#5c3d1e"), fontFamily: "'Lato',sans-serif" }}>She can see your whole book and add anything across any section</div>
            </div>
          </div>
          {!showChat && (
            <button onClick={() => {
              setShowChat(true);
              if (chat.length === 0) setChat([{ role: "assistant", content: `I've read your entire book, ${"\u2014"} all five sections. It's beautiful. Is there anything you'd like to add? A person you forgot to mention, a memory that came back to you, a detail you want woven in somewhere? Just tell me and I'll find the right place for it.` }]);
            }}
              style={{ background: "rgba(184,134,11,0.08)", border: "1.5px solid rgba(184,134,11,0.3)", color: tc("#7a5030","#3d2b1a"), fontFamily: "'Lato',sans-serif", fontSize: fs(13), fontWeight: 600, padding: "10px 20px", borderRadius: 100, cursor: "pointer", minHeight: 44 }}>
              ✦ Talk to Grace
            </button>
          )}
        </div>
      </div>

      {showChat && (
        <div>
          {/* Quick suggestions */}
          {chat.length <= 1 && (
            <div style={{ padding: "14px 28px 0", display: "flex", flexWrap: "wrap", gap: 8 }}>
              {["Add a family member I forgot", "Add a memory from my childhood", "Add a detail about my faith", "My book is perfect as is"].map(s => (
                <button key={s} onClick={() => sendMessage(s)}
                  style={{ background: "rgba(184,134,11,0.06)", border: "1px solid rgba(184,134,11,0.2)", color: tc("#6b5030","#3d2b1a"), fontFamily: "'Lato',sans-serif", fontSize: fs(12), padding: "7px 14px", borderRadius: 100, cursor: "pointer", minHeight: 36 }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Messages */}
          <div style={{ padding: "16px 28px", maxHeight: 400, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
            {chat.map((msg, i) => (
              <div key={i} style={{ display: "flex", gap: 10, flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: msg.role === "user" ? 10 : 14, background: msg.role === "user" ? "linear-gradient(135deg,#b8860b,#d4a843)" : (personaAvatarBg || "linear-gradient(135deg,#6b4c8a,#9b7bc0)"), color: "#fdf6ec", fontFamily: "'Lato',sans-serif", fontWeight: 700 }}>
                  {msg.role === "user" ? "You" : (personaAvatar || "🕊️")}
                </div>
                <div style={{ maxWidth: "80%", padding: "12px 16px", borderRadius: msg.role === "user" ? "14px 4px 14px 14px" : "4px 14px 14px 14px", background: msg.role === "user" ? "linear-gradient(135deg,#5c3d1e,#7a5030)" : "#fdf6ec", color: msg.role === "user" ? "#fdf6ec" : tc("#3d2b1a","#1a0e00"), fontSize: fs(15), fontFamily: "'Cormorant Garamond',Georgia,serif", lineHeight: 1.8, border: msg.role === "assistant" ? "1px solid rgba(180,140,80,0.15)" : "none" }}>
                  {msg.content}
                  {msg.hasUpdates && (
                    <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(184,134,11,0.1)", borderRadius: 8, fontSize: fs(12), color: "#b8860b", fontFamily: "'Lato',sans-serif", fontStyle: "normal" }}>
                      ✦ Book updated — sections changed: {msg.updatedSections?.join(", ")}. Download a fresh PDF above.
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: personaAvatarBg || "linear-gradient(135deg,#6b4c8a,#9b7bc0)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{personaAvatar || "🕊️"}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "12px 16px", background: "#fdf6ec", borderRadius: "4px 14px 14px 14px", border: "1px solid rgba(180,140,80,0.15)" }}>
                  {[0, 0.2, 0.4].map((d, i) => <div key={i} style={{ width: 6, height: 6, background: "#c9a87a", borderRadius: "50%", animation: `bounce 1.2s ${d}s infinite` }} />)}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "12px 28px 20px", borderTop: "1px solid rgba(180,140,80,0.1)" }}>
            {editsUsed >= EDIT_LIMIT ? (
              <div style={{ background: "rgba(184,134,11,0.06)", border: "1px solid rgba(184,134,11,0.2)", borderRadius: 12, padding: "16px 20px", textAlign: "center" }}>
                <p style={{ fontSize: fs(15), color: tc("#5c4a35","#2a1a0a"), fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", lineHeight: 1.8, margin: "0 0 6px" }}>
                  You've used your 3 included revisions. Your book is beautiful as it is. 🕊️
                </p>
                <p style={{ fontSize: fs(12), color: tc("#a89070","#6b5030"), fontFamily: "'Lato',sans-serif", margin: 0 }}>
                  Download your final PDF above and share it with the people you love.
                </p>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                  <span style={{ fontSize: fs(11), color: tc("#a89070","#6b5030"), fontFamily: "'Lato',sans-serif" }}>
                    {EDIT_LIMIT - editsUsed} of {EDIT_LIMIT} revisions remaining
                  </span>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                  <textarea value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Tell Grace what you'd like to add or change..."
                    rows={1}
                    style={{ flex: 1, border: "1.5px solid rgba(180,140,80,0.25)", borderRadius: 10, padding: "10px 14px", fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(15), color: tc("#3d2b1a","#1a0e00"), background: "#fffdf5", outline: "none", resize: "none", lineHeight: 1.6, minHeight: 42, maxHeight: 100, overflowY: "auto" }} />
                  <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
                    style={{ width: 42, height: 42, borderRadius: "50%", background: input.trim() && !loading ? (personaAvatarBg || "linear-gradient(135deg,#6b4c8a,#9b7bc0)") : "rgba(139,94,52,0.2)", border: "none", cursor: input.trim() && !loading ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke="#fdf6ec" strokeWidth="2" strokeLinecap="round"/><path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#fdf6ec" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function MyStoryFamily() {
  const [screen, setScreen] = useState("welcome"); // welcome | signup | signin | onboarding | reveal | booksize | setup | chat
  const [bookSize, setBookSize] = useState(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [promoInfo, setPromoInfo] = useState(null);
  const [promoError, setPromoError] = useState("");

  // ── USER ACCOUNT STATE ────────────────────────────────────────────────────
  const [user, setUser] = useState(null); // { firstName, lastName, email, password }
  const [signupFields, setSignupFields] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [signupError, setSignupError] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  // ── GIFT CODE (REDEMPTION) STATE ──────────────────────────────────────────
  const [giftCode, setGiftCode] = useState("");
  const [giftEmail, setGiftEmail] = useState("");
  const [giftName, setGiftName] = useState("");
  const [giftError, setGiftError] = useState("");
  const [giftLoading, setGiftLoading] = useState(false);

  // ── GIFT PURCHASE STATE ───────────────────────────────────────────────────
  const [giftBuyerName, setGiftBuyerName] = useState("");
  const [giftBuyerEmail, setGiftBuyerEmail] = useState("");
  const [giftRecipientName, setGiftRecipientName] = useState("");
  const [giftRecipientEmail, setGiftRecipientEmail] = useState("");
  const [giftBookChoice, setGiftBookChoice] = useState("pdf"); // pdf | print1
  const [giftPurchaseError, setGiftPurchaseError] = useState("");

  const [signinFields, setSigninFields] = useState({ email: "", password: "" });
  const [signinError, setSigninError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState("email"); // email → code → password
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirm, setForgotConfirm] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [savedSession, setSavedSession] = useState(null); // detected on mount
  const [enabledChapters, setEnabledChapters] = useState(BASE_CHAPTERS.map(c => c.id));
  const [customChapter, setCustomChapter] = useState(null);
  const [customInput, setCustomInput] = useState("");
  const [generatingPrompts, setGeneratingPrompts] = useState(false);
  const [chapters, setChapters] = useState([]);
  const [activeChapter, setActiveChapter] = useState(0);
  const [activePrompt, setActivePrompt] = useState(0);
  const [messages, setMessages] = useState([]);
  const [chapterHistory, setChapterHistory] = useState({});
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [writingHelp, setWritingHelp] = useState(false);
  const [toast, setToast] = useState(null);
  const [anglesUsed, setAnglesUsed] = useState(false);
  const [photos, setPhotos] = useState({});
  const [showPhotoPanel, setShowPhotoPanel] = useState(false);
  const [previewChapter, setPreviewChapter] = useState(null);
  const [hasPaid, setHasPaid] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallBookChoice, setPaywallBookChoice] = useState("pdf");
  const [showPrintOrderAfterPay, setShowPrintOrderAfterPay] = useState(false);
  const [printShipChoice, setPrintShipChoice] = useState("me"); // me | recipient
  const [printShipFields, setPrintShipFields] = useState({ name: "", address: "", city: "", state: "", zip: "", country: "USA" });
  const [printShipLoading, setPrintShipLoading] = useState(false);
  const [printShipDone, setPrintShipDone] = useState(false);
  const [chapterNarratives, setChapterNarratives] = useState({}); // { chapterId: "prose..." }
  const [generatingNarrative, setGeneratingNarrative] = useState(false);
  const [bookComplete, setBookComplete] = useState(false);
  const [shareUrl, setShareUrl] = useState(null);
  const [dismissedVideos, setDismissedVideos] = useState({});
  const [revisingIdx, setRevisingIdx] = useState(null);
  const [revisionInput, setRevisionInput] = useState("");
  const [revisingLoading, setRevisingLoading] = useState(false);
  const helpMeWriteJustUsed = useRef(false);
  const wantNewAngle = useRef(false);

  // ── ONBOARDING STATE ──────────────────────────────────────────────────────
  const [onboardStep, setOnboardStep] = useState(0);
  const [onboardAnswers, setOnboardAnswers] = useState({});
  const [onboardInput, setOnboardInput] = useState("");
  const [onboardSelected, setOnboardSelected] = useState([]);
  const [onboardScale, setOnboardScale] = useState(null);
  const [persona, setPersona] = useState(null);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [chapterContext, setChapterContext] = useState(""); // seed prompts for current chapter

  // ── ACCESSIBILITY STATE ───────────────────────────────────────────────────
  const [textScale, setTextScale] = useState(1.15);
  const [tutorialStep, setTutorialStep] = useState(null);
  const [tutorialDone, setTutorialDone] = useState(false);
  const [topicFramework, setTopicFramework] = useState([]);
  const [currentTopicIdx, setCurrentTopicIdx] = useState(0);
  const [currentTopicMessages, setCurrentTopicMessages] = useState([]);
  const [showRecapButton, setShowRecapButton] = useState(false);
  const [sectionMemories, setSectionMemories] = useState([]);
  const [showMobileMemories, setShowMobileMemories] = useState(false);
  const [pendingEditMessage, setPendingEditMessage] = useState(null);
  const [highContrast, setHighContrast] = useState(false);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const toastKey = useRef(0);
  const liveRef = useRef(null);

  const fs = (n) => Math.round(n * textScale);
  const tc = (normal, contrast) => highContrast ? contrast : normal;
  const textSizeLabels = ["A", "A+", "A++"];
  const textScales = [1, 1.2, 1.4];

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Scroll to top on every screen change
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [screen]);

  // Scroll to the relevant element when tutorial step changes
  useEffect(() => {
    if (!tutorialStep) return;
    const scrollTargets = {
      1: () => window.scrollTo({ top: 0, behavior: "smooth" }),
      2: () => window.scrollTo({ top: 0, behavior: "smooth" }),
      3: () => document.getElementById("story-input")?.scrollIntoView({ behavior: "smooth", block: "center" }),
      4: () => document.querySelector(".photo-btn")?.scrollIntoView({ behavior: "smooth", block: "center" }),
      5: () => document.getElementById("tutorial-step-5")?.scrollIntoView({ behavior: "smooth", block: "center" }),
    };
    setTimeout(() => scrollTargets[tutorialStep]?.(), 200);
  }, [tutorialStep]);
  useEffect(() => {
    if (screen === "chat" && !previewChapter && !bookComplete && chapter) {
      const tutorialKey = "mystory_tutorial_done";
      const done = localStorage.getItem(tutorialKey) === "true";
      if (!done && !tutorialDone) {
        setTimeout(() => setTutorialStep(1), 600);
      }
    }
  }, [screen, previewChapter, bookComplete]);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [input]);

  // ── LOAD SAVED SESSION ON MOUNT ───────────────────────────────────────────
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const paymentSuccess = params.get("payment_success") === "true";
      const paymentCancelled = params.get("payment_cancelled") === "true";
      const giftSuccess = params.get("gift_success") === "true";
      const paidEmail = params.get("paid_email") || localStorage.getItem("mystory_pending_email");

      if (paymentSuccess || paymentCancelled || giftSuccess) {
        window.history.replaceState({}, "", window.location.pathname);
      }

      // Handle gift purchase return
      if (giftSuccess) {
        const pendingGift = localStorage.getItem("mystory_gift_pending");
        if (pendingGift) {
          try {
            const gift = JSON.parse(pendingGift);
            localStorage.removeItem("mystory_gift_pending");
            fetch("/api/gift-create", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(gift),
            }).catch(() => {});
          } catch {}
        }
        setScreen("giftsent");
        return;
      }

      const raw = localStorage.getItem("mystory_session");

      if (paymentSuccess) {
        const emailToUse = paidEmail || (raw ? JSON.parse(raw)?.user?.email : null);

        // Mark paid in Supabase and localStorage regardless
        if (emailToUse) {
          localStorage.setItem("mystory_paid_" + emailToUse.toLowerCase(), "true");
          fetch("/api/paid-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: emailToUse }),
          }).catch(() => {});
        }

        // Try localStorage first
        if (raw) {
          try {
            const s = { ...JSON.parse(raw), hasPaid: true };
            localStorage.setItem("mystory_session", JSON.stringify(s));
            localStorage.removeItem("mystory_pending_email");
            restoreSession(s, true);
            setTimeout(() => {
              announce("Payment confirmed — let's continue your story. ✦");
              const bookChoice = localStorage.getItem("mystory_book_choice");
              if (bookChoice && bookChoice !== "pdf") {
                setPaywallBookChoice(bookChoice);
                setShowPrintOrderAfterPay(true);
              }
              localStorage.removeItem("mystory_book_choice");
            }, 600);
            return;
          } catch {}
        }

        // localStorage empty (mobile Safari) — load from Supabase
        if (emailToUse) {
          fetch(`/api/session-load?email=${encodeURIComponent(emailToUse)}`)
            .then(r => r.json())
            .then(data => {
              if (data.session) {
                const s = { ...data.session, hasPaid: true };
                localStorage.setItem("mystory_session", JSON.stringify(s));
                restoreSession(s, true);
                setTimeout(() => {
                  announce("Payment confirmed — let's continue your story. ✦");
                  const bookChoice = localStorage.getItem("mystory_book_choice");
                  if (bookChoice && bookChoice !== "pdf") {
                    setPaywallBookChoice(bookChoice);
                    setShowPrintOrderAfterPay(true);
                  }
                  localStorage.removeItem("mystory_book_choice");
                }, 600);
              }
            })
            .catch(() => {});
        }
        return;
      }

      if (paymentCancelled) {
        if (raw) {
          try {
            const s = JSON.parse(raw);
            restoreSession(s);
            setTimeout(() => setShowPaywall(true), 400);
            return;
          } catch {}
        }
        return;
      }

      // Normal page load — use localStorage
      if (raw) {
        const s = JSON.parse(raw);
        if (s?.user?.email) {
          setSavedSession(s);
        }
      }
    } catch {}
  }, []);

  // ── SAVE SESSION WHENEVER KEY STATE CHANGES ───────────────────────────────
  const saveSession = (overrides = {}) => {
    try {
      const session = {
        user, screen, bookSize, promoCode, promoInfo,
        onboardAnswers, persona, systemPrompt,
        chapters, activeChapter, chapterHistory,
        messages, hasPaid, enabledChapters, chapterNarratives,
        previewChapter, bookComplete,
        ...overrides,
      };
      // Always save to localStorage for instant restore
      localStorage.setItem("mystory_session", JSON.stringify(session));
      // Also save to Supabase for cross-device access
      if (session.user?.email) {
        fetch("/api/session-save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: session.user.email, session }),
        }).catch(() => {});
      }
    } catch {}
  };

  useEffect(() => {
    if (user) saveSession();
  }, [user, screen, hasPaid, chapterHistory, messages, activeChapter, persona]);

  // ── RESTORE SAVED SESSION ─────────────────────────────────────────────────
  const restoreSession = (s, fromPayment = false) => {
    setUser(s.user);
    setBookSize(s.bookSize || null);
    setPromoCode(s.promoCode || "");
    setPromoInfo(s.promoInfo || null);
    setOnboardAnswers(s.onboardAnswers || {});
    setPersona(s.persona || null);
    setSystemPrompt(s.systemPrompt || "");
    setChapters(s.chapters || []);
    setActiveChapter(s.activeChapter || 0);
    setChapterHistory(s.chapterHistory || {});
    setMessages(s.messages || []);
    setCurrentTopicMessages(s.messages || []); // show existing messages on left side
    setHasPaid(s.hasPaid === true);
    setEnabledChapters(s.enabledChapters || BASE_CHAPTERS.map(c => c.id));
    setChapterNarratives(s.chapterNarratives || {});
    setBookComplete(s.bookComplete || false);
    // Init topic framework for restored chapter
    if (s.chapters?.length > 0) {
      const restoredChapter = s.chapters[s.activeChapter || 0];
      if (restoredChapter) initTopicFramework(restoredChapter.id);
    }

    if (fromPayment && s.previewChapter) {
      setPreviewChapter(s.previewChapter);
      setScreen("chat");
      setShowPaywall(false);
    } else if (s.bookComplete) {
      setScreen("chat");
      setBookComplete(true);
    } else {
      const landOn = s.chapters?.length > 0 ? "chat" : "onboarding";
      setScreen(landOn);
    }

    setSavedSession(null);
    announce(`Welcome back, ${s.user.firstName}. Your story is right where you left it.`);
  };

  // ── ACCOUNT HELPERS ───────────────────────────────────────────────────────
  const handleSignup = async () => {
    const { firstName, lastName, email, password } = signupFields;
    if (!firstName.trim()) { setSignupError("Please enter your first name."); return; }
    if (!lastName.trim()) { setSignupError("Please enter your last name."); return; }
    if (!email.includes("@")) { setSignupError("Please enter a valid email address."); return; }
    if (password.length < 8) { setSignupError("Password must be at least 8 characters."); return; }
    if (!/[A-Z]/.test(password)) { setSignupError("Password must contain at least one capital letter."); return; }
    if (!/[0-9]/.test(password)) { setSignupError("Password must contain at least one number."); return; }
    if (!privacyAccepted) { setSignupError("Please confirm you have read and agree to the Privacy Policy."); return; }
    setSignupError("Creating your account…");
    try {
      const res = await fetch("/api/auth-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setSignupError(data.error || "Could not create account. Please try again."); return; }
      setUser(data.user);
      setSignupError("");
      // Send welcome email in background
      fetch("/api/email-welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: data.user.firstName, email: data.user.email }),
      }).catch(() => {});
      setScreen("onboarding");
    } catch {
      setSignupError("Connection error. Please check your internet and try again.");
    }
  };

  const handleSignin = async () => {
    const { email, password } = signinFields;
    if (!email.includes("@")) { setSigninError("Please enter your email address."); return; }
    if (!password) { setSigninError("Please enter your password."); return; }
    setSigninError("Signing in…");
    try {
      const res = await fetch("/api/auth-signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setSigninError(data.error || "That email and password don't match."); return; }
      setSigninError("");

      // Check paid status from every source
      const localRaw = localStorage.getItem("mystory_session");
      let localHasPaid = false;
      try {
        const localSession = JSON.parse(localRaw);
        // Only use local hasPaid if it belongs to this same user
        if (localSession?.user?.email?.toLowerCase() === email.toLowerCase()) {
          localHasPaid = localSession?.hasPaid === true;
        }
      } catch {}
      const paidKey = localStorage.getItem("mystory_paid_" + email.toLowerCase()) === "true";
      const supabasePaid = data.hasPaid === true;
      const hasPaidFinal = localHasPaid || paidKey || supabasePaid;

      if (data.session) {
        const merged = { ...data.session, hasPaid: data.session.hasPaid || hasPaidFinal };
        localStorage.setItem("mystory_session", JSON.stringify(merged));
        restoreSession(merged);
      } else if (localRaw) {
        try {
          const localSession = JSON.parse(localRaw);
          if (localSession.user?.email?.toLowerCase() === email.toLowerCase()) {
            const merged = { ...localSession, hasPaid: localSession.hasPaid || hasPaidFinal };
            localStorage.setItem("mystory_session", JSON.stringify(merged));
            restoreSession(merged);
            return;
          }
        } catch {}
        // No matching local session — start fresh but preserve paid status
        if (hasPaidFinal) localStorage.setItem("mystory_paid_" + email.toLowerCase(), "true");
        setUser(data.user);
        setHasPaid(hasPaidFinal);
        setScreen("onboarding");
      } else {
        if (hasPaidFinal) localStorage.setItem("mystory_paid_" + email.toLowerCase(), "true");
        setUser(data.user);
        setHasPaid(hasPaidFinal);
        setScreen("onboarding");
      }
    } catch {
      setSigninError("Connection error. Please check your internet and try again.");
    }
  };

  const handleForgotPassword = async () => {
    setForgotError("");

    // Step 1: Send verification code
    if (forgotStep === "email") {
      if (!forgotEmail.includes("@")) { setForgotError("Please enter your email address."); return; }
      setForgotError("Sending verification code…");
      try {
        const res = await fetch("/api/email-verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: forgotEmail }),
        });
        const data = await res.json();
        if (!res.ok) { setForgotError(data.error || "Could not send code."); return; }
        setForgotStep("code");
        setForgotError("");
      } catch {
        setForgotError("Connection error. Please try again.");
      }
      return;
    }

    // Step 2: Verify code
    if (forgotStep === "code") {
      if (forgotCode.length !== 6) { setForgotError("Please enter the 6-digit code from your email."); return; }
      setForgotStep("password");
      setForgotError("");
      return;
    }

    // Step 3: Set new password
    if (forgotStep === "password") {
      if (forgotNewPassword.length < 8) { setForgotError("Password must be at least 8 characters."); return; }
      if (!/[A-Z]/.test(forgotNewPassword)) { setForgotError("Password must contain at least one capital letter."); return; }
      if (!/[0-9]/.test(forgotNewPassword)) { setForgotError("Password must contain at least one number."); return; }
      if (forgotNewPassword !== forgotConfirm) { setForgotError("Passwords don't match."); return; }
      setForgotError("Updating password…");
      try {
        const res = await fetch("/api/auth-forgot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: forgotEmail, code: forgotCode, newPassword: forgotNewPassword }),
        });
        const data = await res.json();
        if (!res.ok) { setForgotError(data.error || "Could not update password."); return; }
        setForgotSuccess(true);
        setForgotError("");
      } catch {
        setForgotError("Connection error. Please try again.");
      }
    }
  };

  const handleSignout = () => {
    if (window.confirm("Sign out? Your progress is saved and you can continue any time.")) {
      // Save paid status before clearing
      if (hasPaid && user?.email) {
        localStorage.setItem("mystory_paid_" + user.email.toLowerCase(), "true");
      }
      // Clear the session but keep the paid key
      localStorage.removeItem("mystory_session");
      setUser(null);
      setHasPaid(false);
      setScreen("welcome");
      setSavedSession(null);
    }
  };

  const announce = (msg) => {
    if (liveRef.current) liveRef.current.textContent = msg;
    setTimeout(() => { if (liveRef.current) liveRef.current.textContent = ""; }, 3000);
  };

  // ── GIFT CODE REDEMPTION ──────────────────────────────────────────────────
  const redeemGiftCode = async () => {
    setGiftLoading(true);
    setGiftError("");
    try {
      const signupRes = await fetch("/api/auth-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: giftName, lastName: "", email: giftEmail, password: Math.random().toString(36).slice(2) + "Aa1!" }),
      });
      const signupData = await signupRes.json();
      const redeemRes = await fetch("/api/gift-redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: giftCode.trim().toUpperCase(), email: giftEmail.toLowerCase(), firstName: giftName }),
      });
      const redeemData = await redeemRes.json();
      if (!redeemRes.ok) { setGiftError(redeemData.error || "Could not redeem code. Please try again."); setGiftLoading(false); return; }
      const userData = signupData.user || { firstName: giftName, lastName: "", email: giftEmail };
      setUser(userData);
      setHasPaid(true);
      localStorage.setItem("mystory_paid_" + giftEmail.toLowerCase(), "true");
      showToast("Gift code redeemed! Welcome to MyStory.Family 🕊️");
      setScreen("onboarding");
    } catch { setGiftError("Something went wrong. Please try again."); }
    setGiftLoading(false);
  };

  // ── GIFT PURCHASE (BUY FOR SOMEONE ELSE) ─────────────────────────────────
  const handleGiftPurchase = () => {
    if (!giftBuyerName.trim()) { setGiftPurchaseError("Please enter your name."); return; }
    if (!giftBuyerEmail.includes("@")) { setGiftPurchaseError("Please enter a valid email address."); return; }
    if (!giftRecipientName.trim()) { setGiftPurchaseError("Please enter the recipient's name."); return; }
    setGiftPurchaseError("");
    localStorage.setItem("mystory_gift_pending", JSON.stringify({
      buyerName: giftBuyerName.trim(),
      buyerEmail: giftBuyerEmail.trim().toLowerCase(),
      recipientName: giftRecipientName.trim(),
      recipientEmail: giftRecipientEmail.trim().toLowerCase() || null,
      bookChoice: giftBookChoice,
    }));
    const params = new URLSearchParams();
    params.set("prefilled_email", giftBuyerEmail.trim());
    params.set("success_url", `${APP_URL}?gift_success=true`);
    params.set("cancel_url", `${APP_URL}?gift_cancelled=true`);
    window.location.href = `${STRIPE_PAYMENT_LINK}?${params.toString()}`;
  };

  const applyPromoCode = () => {
    const code = promoInput.trim().toUpperCase();
    const found = PROMO_CODES[code];
    if (!found) { setPromoError("That code doesn't look right — check the spelling and try again."); return; }
    if (!found.valid) { setPromoError("This code has expired. Contact your school for a current code."); return; }
    setPromoCode(code);
    setPromoInfo(found);
    setPromoError("");
    announce(found.school ? `Code applied. ${found.school} will receive $${found.schoolShare} from your purchase.` : "Discount code applied.");
  };

  const addPhoto = (id, photo) => setPhotos(prev => ({ ...prev, [id]: [...(prev[id] || []), photo] }));
  const removePhoto = (id, pid) => setPhotos(prev => ({ ...prev, [id]: (prev[id] || []).filter(p => p.id !== pid) }));
  const totalPhotos = Object.values(photos).reduce((a, arr) => a + arr.length, 0);
  const toggleChapter = (id) => setEnabledChapters(prev => prev.includes(id) ? (prev.length > 1 ? prev.filter(x => x !== id) : prev) : [...prev, id]);

  // ── ONBOARDING LOGIC ──────────────────────────────────────────────────────
  const currentStep = ONBOARDING_STEPS[onboardStep];

  const getOnboardAnswer = () => {
    if (currentStep.type === "scale") return onboardScale;
    if (currentStep.type === "multi_chips") return onboardSelected.length > 0 ? onboardSelected : null;
    return onboardInput.trim() || null;
  };

  const canAdvance = () => {
    if (currentStep.optional) return true;
    const ans = getOnboardAnswer();
    return ans !== null && ans !== undefined;
  };

  const advanceOnboarding = () => {
    const ans = getOnboardAnswer();
    const newAnswers = { ...onboardAnswers, [currentStep.id]: ans };
    setOnboardAnswers(newAnswers);
    setOnboardInput("");
    setOnboardSelected([]);
    setOnboardScale(null);

    if (onboardStep < ONBOARDING_STEPS.length - 1) {
      setOnboardStep(s => s + 1);
    } else {
      // All done — assign persona and build system prompt
      // Auto-skip faith if user said "Not really"
      const faithAnswer = newAnswers.faith || "";
      let updatedEnabledChapters = [...enabledChapters];
      if (faithAnswer === "Not really") {
        updatedEnabledChapters = updatedEnabledChapters.filter(id => id !== "faith");
        setEnabledChapters(updatedEnabledChapters);
      }
      const chosenPersona = PERSONAS.grace;
      const firstQ = getQuestion(BASE_CHAPTERS.find(c => updatedEnabledChapters.includes(c.id))?.prompts[0] || BASE_CHAPTERS[0].prompts[0]);
      const profile = {
        audience: newAnswers.audience,
        faithScale: faithAnswer === "Yes, it's an important part of my story" ? 3 : faithAnswer === "It plays a small role" ? 2 : 1,
        personality: newAnswers.personality || [],
        mustInclude: newAnswers.mustInclude,
        keepPrivate: newAnswers.keepPrivate,
        firstQuestion: firstQ,
      };
      setPersona(chosenPersona);
      setSystemPrompt(buildSystemPrompt(chosenPersona, profile));
      setScreen("reveal");
    }
  };

  const toggleMultiChip = (chip) => {
    setOnboardSelected(prev => prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip]);
  };

  // ── CHAT LOGIC ────────────────────────────────────────────────────────────
  // ── CHAPTER TOPIC FRAMEWORKS ────────────────────────────────────────────────
  const CHAPTER_FRAMEWORKS = {
    "early-life": [
      { id: "where-grew-up", title: "Where You Grew Up", icon: "📍", details: [], complete: false },
      { id: "your-home", title: "Your Home", icon: "🏠", details: [], complete: false },
      { id: "your-family", title: "Your Family", icon: "👨‍👩‍👧", details: [], complete: false },
      { id: "school-friends", title: "School & Friends", icon: "🏫", details: [], complete: false },
      { id: "early-memories", title: "Early Memories", icon: "⭐", details: [], complete: false },
      { id: "quick-round", title: "The Little Details", icon: "✨", details: [], complete: false, isQuickRound: true },
    ],
    "becoming-you": [
      { id: "leaving-home", title: "Leaving Home", icon: "🚪", details: [], complete: false },
      { id: "work-career", title: "Work & Career", icon: "💼", details: [], complete: false },
      { id: "who-you-became", title: "Who You Became", icon: "🌿", details: [], complete: false },
      { id: "defining-moments", title: "Defining Moments", icon: "⚡", details: [], complete: false },
    ],
    "family-love": [
      { id: "meeting-spouse", title: "Meeting Your Spouse", icon: "💛", details: [], complete: false },
      { id: "building-family", title: "Building Your Family", icon: "🏡", details: [], complete: false },
      { id: "your-children", title: "Your Children", icon: "👶", details: [], complete: false },
      { id: "family-traditions", title: "Family Traditions", icon: "🎄", details: [], complete: false },
    ],
    "faith": [
      { id: "faith-roots", title: "Your Faith Roots", icon: "🌱", details: [], complete: false },
      { id: "faith-journey", title: "Your Faith Journey", icon: "✝️", details: [], complete: false },
      { id: "faith-community", title: "Your Church & Community", icon: "🕊️", details: [], complete: false },
      { id: "faith-legacy", title: "Faith You Want to Pass On", icon: "📖", details: [], complete: false },
    ],
    "wisdom": [
      { id: "life-lessons", title: "Life's Lessons", icon: "💡", details: [], complete: false },
      { id: "what-matters", title: "What Matters Most", icon: "❤️", details: [], complete: false },
      { id: "to-grandchildren", title: "To Your Grandchildren", icon: "🌟", details: [], complete: false },
      { id: "your-legacy", title: "Your Legacy", icon: "🕊️", details: [], complete: false },
    ],
  };

  const initTopicFramework = (chId) => {
    const framework = CHAPTER_FRAMEWORKS[chId];
    if (framework) {
      setTopicFramework(framework.map(t => ({ ...t, details: [], complete: false })));
      setCurrentTopicIdx(0);
      setCurrentTopicMessages([]);
    }
  };

  const buildChapterContext = (ch, topicIdx = 0) => {
    const framework = CHAPTER_FRAMEWORKS[ch.id];
    if (framework) {
      const currentTopic = framework[topicIdx];
      const remainingTopics = framework.slice(topicIdx + 1).filter(t => !t.isQuickRound).map(t => t.title).join(", ");

      // ── QUICK ROUND special instructions ──────────────────────────────────
      if (currentTopic?.isQuickRound) {
        return "\n\nCURRENT SECTION: \"" + ch.title + "\"\n\n" +
          "YOU ARE NOW IN THE QUICK ROUND — The final fill-in stage before writing.\n\n" +
          "IMPORTANT: Review everything shared so far in this conversation. Do NOT ask about anything already mentioned.\n\n" +
          "Your job: Ask 2-3 short-answer questions at a time from this list (skip any already covered):\n" +
          "- Did you have a nickname as a child? What was it and where did it come from?\n" +
          "- What did you call your grandparents? (Grandma, Nana, Papaw, etc.)\n" +
          "- Did you have a childhood pet? What was its name?\n" +
          "- What was your favorite food growing up?\n" +
          "- What did you want to be when you grew up?\n" +
          "- Was there a saying or phrase your family always used?\n" +
          "- Do you remember your first words, or funny things you said as a little one?\n" +
          "- What was your favorite toy or game as a child?\n" +
          "- What was the walk or ride to school like?\n" +
          "- Was there a smell or sound from childhood that still takes you back?\n\n" +
          "HOW TO DO IT:\n" +
          "1. Open warmly: \"I have everything I need to start writing your story — it's going to be beautiful. Before I do, just a few quick things that will really bring it to life. There are no wrong answers, just say whatever comes to mind.\"\n" +
          "2. Ask 2-3 questions in one message\n" +
          "3. After they answer, capture each detail with <DETAIL>detail here</DETAIL>\n" +
          "4. Ask 2-3 more from the remaining list\n" +
          "5. After 2-3 rounds, wrap up warmly and include <TOPIC_COMPLETE> to signal you're ready to write\n\n" +
          "KEEP IT LIGHT AND FUN — this should feel like a friendly rapid-fire game, not a form.";
      }

      // ── Regular topic instructions ─────────────────────────────────────────
      const topicInstruction = (topicIdx === 0 && ch.id === "early-life")
        ? 'Start by asking: "Before we dive in — did you grow up mostly in one place, or did your family move around?" Then go deep on their answer.'
        : "Dive into this topic with 3-5 exchanges, going deeper each time.";
      const closingQuestion = currentTopic?.title?.toLowerCase() || "this";
      return "\n\nCURRENT SECTION: \"" + ch.title + "\"\n" +
        "TOPIC FRAMEWORK — work through these topics in order. You are currently on topic " + (topicIdx + 1) + " of " + framework.length + ".\n\n" +
        "CURRENT TOPIC: \"" + (currentTopic?.title || "") + "\"\n" +
        topicInstruction + "\n\n" +
        "REMAINING TOPICS AFTER THIS ONE: " + (remainingTopics || "The Little Details (quick round)") + "\n\n" +
        "YOUR JOB FOR EACH TOPIC:\n" +
        "1. Ask 3-5 warm questions that go progressively deeper\n" +
        "2. After each substantive answer, capture key details with: <DETAIL>brief specific detail</DETAIL> (keep details short — names, places, descriptions)\n" +
        "3. Dig for the meaningful stuff — nicknames, funny phrases, what they called the house, family sayings, sensory memories\n" +
        "4. When the topic feels complete, ask: \"Is there anything else about " + closingQuestion + " you'd like me to capture before we move on?\"\n" +
        "5. Then say a warm transition sentence and include <TOPIC_COMPLETE> at the very end\n\n" +
        "TRANSITION EXAMPLE:\n" +
        "\"I've got everything about your home beautifully captured. Now let's talk about your family. Who were the people that filled that house with life? <TOPIC_COMPLETE>\"\n\n" +
        "DETAIL EXAMPLES:\n" +
        "<DETAIL>Kansas City, Missouri</DETAIL>\n" +
        "<DETAIL>Raytown neighborhood</DETAIL>\n" +
        "<DETAIL>Called the house the green house on the corner</DETAIL>\n" +
        "<DETAIL>Mom's nickname was Mama Jo</DETAIL>";
    }

    // Fallback for chapters without a framework
    const sectionScope = {
      "becoming-you": "This section is ONLY about early adulthood — school, first jobs, the turning points and choices that shaped who they became.",
      "family-love": "This section is ONLY about love, marriage, and children — how they met their spouse, building a family, their home life.",
      "faith": "This section is ONLY about spiritual life — church, prayer, scripture, the moments they felt God closest.",
      "wisdom": "This section is about life's lessons and legacy — what they've learned, what they'd tell their younger self.",
    };
    return "\n\nCURRENT SECTION: \"" + ch.title + "\"\n" +
      "SCOPE: " + (sectionScope[ch.id] || "") + "\n" +
      "Story territory to cover:\n" +
      ch.prompts.map((p, i) => (i + 1) + ". " + getQuestion(p)).join("\n") + "\n" +
      "Start with topic 1. Only introduce topic 2 when topic 1 feels fully explored.";
  };

  const generateCustomPrompts = async (title) => {
    if (!title.trim()) return;
    setGeneratingPrompts(true);
    try {
      const res = await fetch("/api/claude", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 800, system: PROMPT_GEN_SYSTEM, messages: [{ role: "user", content: `Chapter: "${title}"` }] }) });
      const data = await res.json();
      const rawPrompts = JSON.parse((data.content?.[0]?.text || "[]").replace(/```json|```/g, "").trim());
      setCustomChapter({ title: title.trim(), icon: "✨", isCustom: true, color: "#f0eae4", photoPrompt: `Add a photo connected to your ${title} story.`, prompts: rawPrompts.map(q => ({ question: q, angles: [] })) });
    } catch {
      setCustomChapter({ title: title.trim(), icon: "✨", isCustom: true, color: "#f0eae4", photoPrompt: `Add a photo connected to your ${title} story.`, prompts: [{ question: `Tell me about your ${title} — where did it begin?`, angles: [] }, { question: "What was the hardest moment, and what did it teach you?", angles: [] }, { question: "Who walked alongside you during this time?", angles: [] }, { question: "What do you want future generations to know?", angles: [] }] });
    }
    setGeneratingPrompts(false);
  };

  const startChat = () => {
    if (bookComplete) { setScreen("booklocked"); return; }
    const selected = BASE_CHAPTERS.filter(c => enabledChapters.includes(c.id));
    const allChapters = customChapter ? [...selected, customChapter] : selected;
    setChapters(allChapters);
    setAnglesUsed(false);
    setChapterContext(buildChapterContext(allChapters[0]));
    const profile = {
      audience: onboardAnswers.audience,
      faithScale: onboardAnswers.faith || 1,
      personality: onboardAnswers.personality || [],
      mustInclude: onboardAnswers.mustInclude,
      keepPrivate: onboardAnswers.keepPrivate,
    };
    // Get first question from framework if available, otherwise fallback
    const firstChapter = allChapters[0];
    const framework = CHAPTER_FRAMEWORKS[firstChapter?.id];
    const frameworkFirstQ = framework
      ? "Before we dive in — did you grow up mostly in one place, or did your family move around?"
      : getQuestion(firstChapter.prompts[0]);
    const baseIntro = persona ? persona.intro(profile) : `Welcome. I'm so glad you're here.\n\nI'm Grace, and I'll guide you through your story one memory at a time.`;
    const introMsg = baseIntro + "\n\n*" + frameworkFirstQ + "*";
    setMessages([{ role: "assistant", content: introMsg }]);
    setCurrentTopicMessages([{ role: "assistant", content: introMsg }]);
    initTopicFramework(allChapters[0].id);
    // Show section intro page first
    setSectionIntroChapter({ chapter: allChapters[0], nextC: 0, isFirst: true });
    setScreen("sectionintro");
  };

  const helpMeWrite = async () => {
    if (!input.trim() || writingHelp) return;
    setWritingHelp(true);
    announce("Shaping your story…");
    try {
      const res = await fetch("/api/claude", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 600, system: WRITING_HELP_PROMPT, messages: [{ role: "user", content: `Question: "${getQuestion(chapter.prompts[activePrompt])}"\n\nWhat they've written so far: "${input}"` }] }) });
      const data = await res.json();
      setInput(data.content?.[0]?.text || input);
      helpMeWriteJustUsed.current = true;
      announce("Your story has been shaped. Review it and send when ready.");
    } catch {}
    setWritingHelp(false);
    textareaRef.current?.focus();
  };

  const toggleMic = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { showToast("Voice input isn't supported in this browser. Try Chrome or Safari."); return; }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;
    let finalTranscript = input;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalTranscript += e.results[i][0].transcript + " ";
        else interim = e.results[i][0].transcript;
      }
      setInput(finalTranscript + interim);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => { setIsListening(false); setInput(t => t.trim()); };
    recognition.start();
  };

  const reviseGhostwritten = async (idx, originalText, correctionNote) => {
    if (!correctionNote.trim() || revisingLoading) return;
    setRevisingLoading(true);
    announce("Revising your paragraph…");
    try {
      const res = await fetch("/api/claude", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 600, system: WRITING_HELP_REVISE_PROMPT,
          messages: [{ role: "user", content: `Original paragraph:\n"${originalText}"\n\nCorrection needed: "${correctionNote}"\n\nPlease revise the paragraph incorporating this correction.` }] }),
      });
      const data = await res.json();
      const revised = data.content?.[0]?.text || originalText;
      setMessages(prev => prev.map((m, i) => i === idx ? { ...m, content: revised } : m));
      setRevisingIdx(null);
      setRevisionInput("");
      announce("Paragraph updated.");
    } catch { setRevisingLoading(false); }
    setRevisingLoading(false);
  };

  const sendMessage = async (overrideText) => {
    const text = overrideText || input.trim();
    if (!text || loading) return;
    setAnglesUsed(true);
    const isGhostwritten = helpMeWriteJustUsed.current;
    helpMeWriteJustUsed.current = false;
    const angleNudge = wantNewAngle.current
      ? "\n\nNOTE FOR THIS RESPONSE ONLY: The person feels ready to explore a different part of this chapter. Warmly acknowledge what they've shared so far, then naturally introduce the next seed topic from your list — as if it occurred to you in the flow of conversation, not as a new question number."
      : "";
    wantNewAngle.current = false;
    const userMsg = { role: "user", content: text, isGhostwritten };
    const next = [...messages, userMsg];
    setMessages(next);
    setCurrentTopicMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const fullSystem = systemPrompt + chapterContext + angleNudge;
      const res = await fetch("/api/claude", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: fullSystem, messages: next.map(m => ({ role: m.role, content: m.content })) }) });
      const data = await res.json();
      const rawText = data.content?.[0]?.text || "I'm here with you. Tell me more.";
      const hasRecap = rawText.includes("<SECTION_RECAP>");
      const hasTopicComplete = rawText.includes("<TOPIC_COMPLETE>");

      // Extract detail bullets for the topic framework
      const detailMatches = [...rawText.matchAll(/<DETAIL>(.*?)<\/DETAIL>/gs)];
      const newDetails = detailMatches.map(m => m[1].trim());

      // Extract memory bullets (legacy)
      const memoryMatches = [...rawText.matchAll(/<MEMORY>(.*?)<\/MEMORY>/gs)];
      const newMemories = memoryMatches.map(m => m[1].trim());

      // Clean all tags from display text
      const cleanText = rawText
        .replace(/<SECTION_RECAP>/g, "")
        .replace(/<TOPIC_COMPLETE>/g, "")
        .replace(/<DETAIL>.*?<\/DETAIL>/gs, "")
        .replace(/<MEMORY>.*?<\/MEMORY>/gs, "")
        .trim();

      const newMsg = { role: "assistant", content: cleanText };
      const updatedMessages = [...next, newMsg];
      setMessages(updatedMessages);

      // Add details to current topic in framework
      if (newDetails.length > 0) {
        setTopicFramework(prev => prev.map((t, i) =>
          i === currentTopicIdx ? { ...t, details: [...t.details, ...newDetails] } : t
        ));
      }
      if (newMemories.length > 0) setSectionMemories(prev => [...prev, ...newMemories]);
      if (hasRecap) setShowRecapButton(true);

      // Handle topic complete — refresh left chat, advance topic
      if (hasTopicComplete) {
        setTopicFramework(prev => prev.map((t, i) =>
          i === currentTopicIdx ? { ...t, complete: true } : t
        ));
        // The transition message becomes the first message of the new topic
        setCurrentTopicMessages([newMsg]);
        setCurrentTopicIdx(prev => {
          const next = prev + 1;
          // Update chapter context for new topic
          if (chapter) {
            setChapterContext(buildChapterContext(chapter, next));
          }
          return next;
        });
      } else {
        setCurrentTopicMessages(prev => [...prev, newMsg]);
      }

      announce("New response received.");
    } catch { setMessages([...next, { role: "assistant", content: "I'm here. Take your time." }]); }
    setLoading(false);
  };

  const showToast = (msg) => { toastKey.current += 1; setToast({ msg, key: toastKey.current }); announce(msg); setTimeout(() => setToast(null), 2400); };

  const completeChapter = async () => {
    const ch = chapters[activeChapter];
    const chKey = ch.id || ch.title;
    setChapterHistory(prev => ({ ...prev, [chKey]: messages }));
    setPreviewChapter({ chapter: ch, chapterIndex: activeChapter });
    setShowPhotoPanel(false);
    setGeneratingNarrative(true);

    // Build a clean transcript for the memoir writer
    const transcript = messages
      .filter(m => m.content?.trim())
      .map(m => `${m.role === "user" ? (user?.firstName || "Person") : "Guide"}: ${m.content}`)
      .join("\n\n");

    // Need at least something to write from
    if (!transcript.trim()) {
      setGeneratingNarrative(false);
      return;
    }

    try {
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 3000,
          system: buildMemoirPrompt(ch.title, user?.firstName, transcript),
          messages: [{ role: "user", content: "Please write the memoir chapter now." }],
        }),
      });
      const data = await res.json();

      // Check for API-level errors
      if (data.error) {
        console.error("Memoir API error:", data.error);
        // Fall back to a formatted version of the conversation
        const fallback = messages
          .filter(m => m.role === "user" && m.content?.trim())
          .map(m => m.content.trim())
          .join("\n\n");
        if (fallback) setChapterNarratives(prev => ({ ...prev, [chKey]: fallback }));
      } else {
        const narrative = data.content?.[0]?.text || "";
        if (narrative) {
          setChapterNarratives(prev => ({ ...prev, [chKey]: narrative }));
        }
      }
    } catch (e) {
      console.error("Memoir generation failed:", e);
      const fallback = messages
        .filter(m => m.role === "user" && m.content?.trim())
        .map(m => m.content.trim())
        .join("\n\n");
      if (fallback) setChapterNarratives(prev => ({ ...prev, [chKey]: fallback }));
      else setChapterNarratives(prev => ({ ...prev, [chKey]: "Your stories from this section have been saved." }));
    }
    setGeneratingNarrative(false);
  };

  const [showBetweenSections, setShowBetweenSections] = useState(false);
  const [betweenSectionAnswers, setBetweenSectionAnswers] = useState({ mustInclude: "", keepPrivate: "" });
  const [sectionIntroChapter, setSectionIntroChapter] = useState(null); // { chapter, nextC, isFirst }

  const continueFromPreview = () => {
    const nextC = previewChapter.chapterIndex + 1;
    const paidKey = user?.email ? localStorage.getItem("mystory_paid_" + user.email.toLowerCase()) === "true" : false;
    const isPaid = hasPaid || paidKey;
    const isLastChapter = previewChapter.chapterIndex >= chapters.length - 1;

    if (isLastChapter || nextC >= chapters.length) {
      setPreviewChapter(null);
      setBookComplete(true);
      setScreen("chat");
      return;
    }

    if (previewChapter.chapterIndex === 0 && !isPaid && !promoInfo?.schoolShare) {
      setShowPaywall(true);
      return;
    }

    advanceToChapter(nextC);
  };

  const advanceToChapter = (nextC) => {
    setPreviewChapter(null);
    setShowPaywall(false);
    setShowBetweenSections(false);
    if (nextC < chapters.length) {
      setActiveChapter(nextC);
      setActivePrompt(0);
      setAnglesUsed(false);
      setShowRecapButton(false);
      setSectionMemories([]);
      const nextChapter = chapters[nextC];
      setChapterContext(buildChapterContext(nextChapter, 0));
      initTopicFramework(nextChapter.id);
      const firstMsg = { role: "assistant", content: `You've completed ${chapters[nextC - 1]?.title || "that section"}. What you've shared is precious. 💛\n\nNow let's step into the next section of your life...\n\n*${getQuestion(nextChapter.prompts[0])}*` };
      setMessages([firstMsg]);
      setCurrentTopicMessages([firstMsg]);
      announce(`Starting section: ${chapters[nextC].title}`);
      // Show section intro page
      setSectionIntroChapter({ chapter: chapters[nextC], nextC, isFirst: false });
      setScreen("sectionintro");
    } else {
      setMessages([{ role: "assistant", content: `You've done something extraordinary. Your stories, your wisdom, everything you've shared — preserved forever for the people you love. ${persona?.avatar || "🕊️"}\n\nThank you for trusting me with your legacy.` }]);
      setBookComplete(true);
      setScreen("chat");
      announce("Congratulations! Your legacy story is complete.");
    }
  };

  const generatePDF = () => {
    const bookWindow = window.open("", "_blank");
    const chapterList = chapters.map(ch => {
      const key = ch.id || ch.title;
      const narrative = chapterNarratives[key] || "";
      const chPhotos = photos[key] || [];
      return { ...ch, narrative, chPhotos };
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${user?.firstName} ${user?.lastName} — My Legacy Story</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Lato:wght@300;400;600&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Cormorant Garamond', Georgia, serif; background: white; color: #2a1a0a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    
    /* Cover page */
    .cover { width: 100%; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; background: #fdf6ec; padding: 80px 60px; page-break-after: always; }
    .cover-ornament { font-size: 56px; margin-bottom: 40px; }
    .cover-title { font-size: 52px; font-weight: 300; color: #3d2b1a; font-style: italic; line-height: 1.2; margin-bottom: 20px; }
    .cover-subtitle { font-size: 18px; color: #8b7355; font-family: 'Lato', sans-serif; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 48px; }
    .cover-divider { width: 80px; height: 1px; background: #b8860b; margin: 0 auto 48px; }
    .cover-dedication { font-size: 20px; color: #6b5540; font-style: italic; line-height: 1.8; max-width: 440px; }
    .cover-footer { position: absolute; bottom: 60px; font-size: 13px; color: #b8860b; font-family: 'Lato', sans-serif; letter-spacing: 2px; text-transform: uppercase; }

    /* Chapter pages */
    .chapter { padding: 72px 80px; page-break-before: always; max-width: 800px; margin: 0 auto; }
    .chapter-header { margin-bottom: 48px; padding-bottom: 24px; border-bottom: 1px solid rgba(184,134,11,0.2); }
    .chapter-label { font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #b8860b; font-family: 'Lato', sans-serif; margin-bottom: 10px; }
    .chapter-title { font-size: 38px; font-weight: 300; color: #3d2b1a; display: flex; align-items: center; gap: 14px; }
    .chapter-icon { font-size: 32px; }
    .chapter-body p { font-size: 17px; line-height: 2.1; color: #2a1a0a; margin-bottom: 22px; text-indent: 1.5em; }
    .chapter-body p:first-child { text-indent: 0; }
    .chapter-photo { width: 100%; max-height: 380px; object-fit: cover; border-radius: 4px; margin: 28px 0; border: 1px solid rgba(180,140,80,0.2); }
    .chapter-photo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 28px 0; }
    .chapter-photo-grid img { width: 100%; height: 220px; object-fit: cover; border-radius: 4px; border: 1px solid rgba(180,140,80,0.2); }

    /* Back cover */
    .back-cover { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; background: #3d2b1a; padding: 80px 60px; page-break-before: always; }
    .back-cover-logo { font-size: 36px; margin-bottom: 20px; }
    .back-cover-name { font-size: 28px; color: #fdf6ec; font-style: italic; margin-bottom: 8px; }
    .back-cover-tagline { font-size: 14px; color: rgba(253,246,236,0.6); font-family: 'Lato', sans-serif; letter-spacing: 2px; text-transform: uppercase; }

    @media print {
      body { -webkit-print-color-adjust: exact; }
      .cover, .chapter, .back-cover { page-break-after: always; }
      @page { margin: 0; size: letter; }
    }
  </style>
</head>
<body>

  <!-- Cover -->
  <div class="cover">
    <div class="cover-ornament">🕊️</div>
    <h1 class="cover-title">${user?.firstName} ${user?.lastName}</h1>
    <p class="cover-subtitle">A Legacy Story</p>
    <div class="cover-divider"></div>
    <p class="cover-dedication">Preserved for the people I love most</p>
    <div class="cover-footer">MyStory.Family · ${new Date().getFullYear()}</div>
  </div>

  <!-- Chapters -->
  ${chapterList.map((ch, idx) => {
    const paragraphs = (ch.narrative || "").split(/\n+/).map(p => p.trim()).filter(p => p.length > 0);
    if (!paragraphs.length) return "";
    return `
  <div class="chapter">
    <div class="chapter-header">
      <div class="chapter-label">Chapter ${idx + 1}</div>
      <div class="chapter-title"><span class="chapter-icon">${ch.icon}</span>${ch.title}</div>
    </div>
    <div class="chapter-body">
      ${paragraphs.map((para, i) => {
        let html = `<p>${para}</p>`;
        if (ch.chPhotos[0] && i === 1) html += `<img class="chapter-photo" src="${ch.chPhotos[0].url}" alt="Photo">`;
        if (ch.chPhotos.length >= 3 && i === 3) html += `<div class="chapter-photo-grid">${ch.chPhotos.slice(1, 3).map(p => `<img src="${p.url}" alt="Photo">`).join("")}</div>`;
        return html;
      }).join("")}
    </div>
  </div>`;
  }).join("")}

  <!-- Back cover -->
  <div class="back-cover">
    <div class="back-cover-logo">🕊️</div>
    <p class="back-cover-name">${user?.firstName} ${user?.lastName}</p>
    <p class="back-cover-tagline">MyStory.Family</p>
  </div>

  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

    bookWindow.document.write(html);
    bookWindow.document.close();
  };

  const handlePayment = () => {
    // Save full session before leaving — so we can restore it on return
    saveSession({ hasPaid: false });

    // Save email separately as a failsafe for cross-device/cleared storage restore
    if (user?.email) {
      localStorage.setItem("mystory_pending_email", user.email);
    }

    // Save book preference so we can action it after payment returns
    localStorage.setItem("mystory_book_choice", paywallBookChoice);

    const params = new URLSearchParams();
    if (user?.email) params.set("prefilled_email", user.email);
    params.set("success_url", `${APP_URL}?payment_success=true&paid_email=${encodeURIComponent(user?.email || "")}`);
    params.set("cancel_url", `${APP_URL}?payment_cancelled=true`);

    const stripeUrl = `${STRIPE_PAYMENT_LINK}?${params.toString()}`;

    if (STRIPE_PAYMENT_LINK.includes("REPLACE_WITH_YOUR_LINK")) {
      setHasPaid(true);
      const nextC = previewChapter ? previewChapter.chapterIndex + 1 : 1;
      advanceToChapter(nextC);
      showToast("✦ Dev mode — payment simulated. Swap in your Stripe link to go live.");
      return;
    }

    window.location.href = stripeUrl;
  };

  const advanceTutorial = () => {
    if (tutorialStep < 5) {
      setTutorialStep(tutorialStep + 1);
    } else {
      setTutorialStep(null);
      setTutorialDone(true);
      localStorage.setItem("mystory_tutorial_done", "true");
    }
  };

  const skipTutorial = () => {
    setTutorialStep(null);
    setTutorialDone(true);
    localStorage.setItem("mystory_tutorial_done", "true");
  };

  const replayTutorial = () => {
    setTutorialStep(1);
  };

  const addMoreToChapter = () => {
    const ch = chapters[previewChapter.chapterIndex];
    setMessages(chapterHistory[ch.id || ch.title] || []);
    setPreviewChapter(null);
  };

  const exploreNewAngle = () => {
    wantNewAngle.current = true;
    // Send a soft invisible prompt — Grace sees the nudge via the system addendum
    sendMessage("I think I've said what I want to say about that. What else should we talk about in this chapter?");
  };

  const chapterComplete = () => {
    showToast("✦ Section saved — beautifully done.");
    setShowPhotoPanel(false);
    completeChapter();
  };

  const confirmEdit = () => {
    setPendingEditMessage(null);
    sendMessage("Yes, go ahead");
  };

  const chapter = chapters[activeChapter];
  const currentAngles = chapter ? getAngles(chapter.prompts[0]) : [];
  const showAngles = !anglesUsed && currentAngles.length > 0 && messages.length <= 1;
  const progress = chapters.length ? Math.round((activeChapter / chapters.length) * 100) : 0;
  const userMessageCount = messages.filter(m => m.role === "user").length;
  const showChapterControls = userMessageCount >= 1;
  const personaAvatar = persona?.avatar || "🌿";
  const personaAvatarBg = persona?.avatarBg || "linear-gradient(135deg,#5c3d1e,#8b5e34)";

  const renderText = (text) => text.split("\n").map((line, i, arr) => (
    <span key={i}>{line.startsWith("*") && line.endsWith("*") ? <em style={{ fontStyle: "italic", color: tc("#7a5c3a", "#4a2e0a"), opacity: 0.95 }}>{line.slice(1, -1)}</em> : line}{i < arr.length - 1 && <br />}</span>
  ));

  const bg = highContrast ? "#fff" : "linear-gradient(160deg,#fdf6ec 0%,#f5ede0 45%,#ede4d5 100%)";
  const headerBg = highContrast ? "#fff" : "rgba(253,246,236,0.97)";

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div lang="en" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", minHeight: "100vh", background: bg, display: "flex", flexDirection: "column" }}>
      <div ref={liveRef} aria-live="polite" aria-atomic="true" style={{ position: "absolute", left: -9999, width: 1, height: 1, overflow: "hidden" }} />
      <a href="#main-content" style={{ position: "absolute", left: -9999, top: "auto", width: 1, height: 1, overflow: "hidden" }}
        onFocus={e => { Object.assign(e.target.style, { left: "16px", top: "16px", width: "auto", height: "auto", zIndex: 9999, padding: "8px 16px", background: "#3d2b1a", color: "#fdf6ec", borderRadius: "8px" }); }}
        onBlur={e => { e.target.style.left = "-9999px"; }}>Skip to main content</a>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Lato:wght@300;400;600&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:6px;}::-webkit-scrollbar-thumb{background:rgba(139,94,52,0.25);border-radius:4px;}
        :focus-visible{outline:3px solid #b8860b !important;outline-offset:3px !important;border-radius:4px;}
        @media(prefers-reduced-motion:reduce){*{animation-duration:0.01ms!important;transition-duration:0.01ms!important;}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
        @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
        @keyframes shimmer{0%{background-position:200% 0;}100%{background-position:-200% 0;}}
        @keyframes pulse{0%,100%{transform:scale(1);}50%{transform:scale(1.04);}}
        @keyframes bounce{0%,60%,100%{transform:translateY(0);}30%{transform:translateY(-6px);}}
        @keyframes toast{0%{opacity:0;transform:translate(-50%,8px);}15%{opacity:1;transform:translate(-50%,0);}75%{opacity:1;}100%{opacity:0;}}
        @keyframes angleIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-8px);}to{opacity:1;transform:translateY(0);}}
        @keyframes revealGlow{0%{box-shadow:0 0 0 0 rgba(184,134,11,0);}50%{box-shadow:0 0 40px 10px rgba(184,134,11,0.2);}100%{box-shadow:0 0 0 0 rgba(184,134,11,0);}}
        .ob-chip{transition:all 0.15s;cursor:pointer;min-height:44px;}
        .ob-chip:hover{border-color:rgba(93,61,26,0.45)!important;background:rgba(93,61,26,0.07)!important;}
        .ob-scale:hover{border-color:#b8860b!important;background:#fffdf5!important;}
        .angle-chip{transition:all 0.18s;cursor:pointer;min-height:48px;}
        .angle-chip:hover{background:rgba(93,61,26,0.12)!important;border-color:rgba(139,94,52,0.5)!important;}
        .chip:hover{background:#ede4d5!important;}
        .ch-card:hover{border-color:rgba(180,140,80,0.5)!important;}
        .sz-card:hover{border-color:rgba(180,140,80,0.5)!important;box-shadow:0 4px 20px rgba(93,61,26,0.12)!important;}
        .start-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 32px rgba(93,61,26,0.35)!important;}
        .send-btn:hover:not(:disabled){box-shadow:0 4px 12px rgba(93,61,26,0.3);}
        .next-btn:hover{background:rgba(180,140,80,0.07)!important;border-color:#b8860b!important;}
        .complete-btn:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(93,61,26,0.3)!important;}
        .gen-btn:hover:not(:disabled){box-shadow:0 4px 12px rgba(93,61,26,0.25);}
        .photo-btn:hover{background:rgba(184,134,11,0.1)!important;}
        .help-btn:hover:not(:disabled){background:rgba(184,134,11,0.14)!important;}
        .a11y-btn:hover{background:rgba(93,61,26,0.08)!important;}

        /* ── MOBILE RESPONSIVE ── */
        @media(max-width:640px){
          /* Header */
          header{padding:10px 14px!important;}
          /* Chat layout — full width, no horizontal padding */
          #main-content{padding:16px 14px 12px!important;}
          /* Nav section bar — scroll horizontally, smaller circles */
          nav[aria-label="Section navigation"]{padding:10px 12px!important;}
          nav[aria-label="Section navigation"] > div{gap:4px!important;}
          /* Make section circles smaller on mobile */
          nav[aria-label="Section navigation"] div[style*="width: 44px"]{width:36px!important;height:36px!important;}
          /* Section title smaller */
          h2{font-size:22px!important;}
          /* Chat messages full width */
          div[style*="maxWidth: \"88%\""]{max-width:95%!important;}
          /* Input box */
          textarea{font-size:17px!important;}
          /* Buttons full width on mobile */
          button[style*="padding: \"22px 72px\""]{padding:18px 32px!important;font-size:20px!important;}
          /* Footer */
          footer{padding:12px 14px!important;}
          footer p{font-size:11px!important;}
        }
      `}</style>

      {/* ── HEADER ── */}
      <header style={{ background: headerBg, backdropFilter: "blur(8px)", borderBottom: `2px solid ${highContrast ? "#3d2b1a" : "rgba(180,140,80,0.2)"}`, padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/logo.png" alt="MyStory.Family" style={{ width: 40, height: 40, objectFit: "contain" }} />
          <div>
            <div style={{ fontSize: fs(20), fontWeight: 600, color: tc("#3d2b1a", "#1a0e00"), letterSpacing: 0.5 }}>MyStory.Family</div>
            {persona
              ? <div style={{ fontSize: fs(10), color: tc("#8b7355", "#4a3020"), fontFamily: "'Lato',sans-serif", letterSpacing: "1.5px", textTransform: "uppercase" }}>with {persona.name} · {persona.role}</div>
              : <div style={{ fontSize: fs(10), color: tc("#8b7355", "#4a3020"), fontFamily: "'Lato',sans-serif", letterSpacing: "1.5px", textTransform: "uppercase" }}>Preserve your story for the people who matter most</div>
            }
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }} role="group" aria-label="Text size">
            <span style={{ fontSize: 11, color: tc("#a89070", "#5c3d1e"), fontFamily: "'Lato',sans-serif", marginRight: 4 }}>Text:</span>
            {textScales.map((scale, i) => (
              <button key={scale} className="a11y-btn" onClick={() => setTextScale(scale)} aria-label={`Text size ${textSizeLabels[i]}`} aria-pressed={textScale === scale}
                style={{ minWidth: 36, minHeight: 36, padding: "4px 8px", borderRadius: 6, border: `2px solid ${textScale === scale ? "#b8860b" : "rgba(180,140,80,0.3)"}`, background: textScale === scale ? "rgba(184,134,11,0.12)" : "transparent", fontFamily: "'Lato',sans-serif", fontSize: 10 + i * 2, fontWeight: 600, color: textScale === scale ? "#5c3d1e" : tc("#8b7355", "#3d2b1a"), cursor: "pointer", lineHeight: 1 }}>
                {textSizeLabels[i]}
              </button>
            ))}
          </div>
          <button className="a11y-btn" onClick={() => setHighContrast(v => !v)} aria-label={highContrast ? "Turn off high contrast" : "Turn on high contrast"} aria-pressed={highContrast}
            style={{ minWidth: 44, minHeight: 36, padding: "6px 12px", borderRadius: 6, border: `2px solid ${highContrast ? "#3d2b1a" : "rgba(180,140,80,0.3)"}`, background: highContrast ? "#3d2b1a" : "transparent", fontFamily: "'Lato',sans-serif", fontSize: fs(11), fontWeight: 600, color: highContrast ? "#fdf6ec" : tc("#8b7355", "#3d2b1a"), cursor: "pointer" }}>
            {highContrast ? "HC ✓" : "HC"}
          </button>
          {screen === "chat" && !previewChapter && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: fs(11), color: tc("#8b7355", "#3d2b1a"), fontFamily: "'Lato',sans-serif", marginBottom: 4 }}>{progress}% complete</div>
              <div role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} style={{ width: 140, height: 6, background: highContrast ? "rgba(0,0,0,0.15)" : "rgba(139,94,52,0.15)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${progress}%`, height: "100%", background: highContrast ? "#3d2b1a" : "linear-gradient(90deg,#b8860b,#d4a843)", borderRadius: 4, transition: "width 0.5s" }} />
              </div>
            </div>
          )}
          {user && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, borderLeft: "1px solid rgba(180,140,80,0.2)", paddingLeft: 12, marginLeft: 4 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: fs(12), fontWeight: 600, color: tc("#3d2b1a","#1a0e00"), fontFamily: "'Lato',sans-serif" }}>{user.firstName} {user.lastName}</div>
                <button onClick={handleSignout} style={{ background: "none", border: "none", fontSize: fs(11), color: tc("#a89070","#6b5030"), fontFamily: "'Lato',sans-serif", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 2, padding: 0 }}>Sign out</button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── WELCOME ── */}
      {screen === "welcome" && (
        <main id="main-content" style={{ width: "100%", overflowX: "hidden" }}>

          {/* ── HERO ── */}
          <section style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "72px 8% 64px", background: "linear-gradient(160deg,#fdf6ec 0%,#f5ede0 60%,#ede4d5 100%)", minHeight: "92vh", justifyContent: "center" }}>
            <img src="/logo.png" alt="MyStory.Family" style={{ width: 130, height: 130, objectFit: "contain", marginBottom: 24, animation: "pulse 3s ease-in-out infinite" }} />

            {/* Mother's Day badge */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(184,134,11,0.1)", border: "1.5px solid rgba(184,134,11,0.35)", borderRadius: 100, padding: "10px 24px", marginBottom: 32 }}>
              <span style={{ fontSize: 18 }}>🌸</span>
              <span style={{ fontSize: fs(15), color: "#b8860b", fontFamily: "'Lato',sans-serif", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase" }}>Perfect Mother's Day Gift</span>
            </div>

            <h1 style={{ fontSize: fs(58), fontWeight: 300, color: tc("#3d2b1a","#1a0e00"), fontStyle: "italic", lineHeight: 1.2, marginBottom: 24, maxWidth: 1000, width: "100%" }}>
              Mom has stories she's never told anyone.
            </h1>
            <p style={{ fontSize: fs(24), color: tc("#5c4a35","#2a1a0a"), maxWidth: 860, width: "100%", lineHeight: 1.85, marginBottom: 16, fontStyle: "italic" }}>
              This Mother's Day, give her Grace — a faith-centered AI guide who will walk alongside her, one memory at a time, and shape her stories into a beautiful legacy book your whole family will treasure forever.
            </p>
            <p style={{ fontSize: fs(18), color: tc("#8b7355","#5c3d1e"), fontFamily: "'Lato',sans-serif", marginBottom: 44, letterSpacing: "0.3px" }}>
              Not a subscription. Not a year of weekly emails. <strong>Done in her own time. Preserved forever.</strong>
            </p>

            {/* Promo code */}
            {!promoInfo ? (
              <div style={{ marginBottom: 32, width: "100%", maxWidth: 520 }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <label htmlFor="promo-input" style={{ position: "absolute", left: -9999, width: 1 }}>School or discount code</label>
                  <input id="promo-input" value={promoInput} onChange={e => { setPromoInput(e.target.value); setPromoError(""); }}
                    onKeyDown={e => e.key === "Enter" && applyPromoCode()}
                    placeholder="Have a school or gift code? Enter it here"
                    style={{ flex: 1, border: `1.5px solid ${promoError ? "#c0392b" : highContrast ? "#7a5c3a" : "rgba(180,140,80,0.3)"}`, borderRadius: 10, padding: "14px 18px", fontFamily: "'Lato',sans-serif", fontSize: fs(16), color: tc("#3d2b1a","#1a0e00"), background: "#fffdf5", outline: "none", minHeight: 54 }} />
                  <button onClick={applyPromoCode} disabled={!promoInput.trim()}
                    style={{ background: promoInput.trim() ? "rgba(93,61,26,0.9)" : "rgba(139,94,52,0.2)", color: promoInput.trim() ? "#fdf6ec" : "#a89070", border: "none", borderRadius: 10, padding: "14px 22px", fontFamily: "'Lato',sans-serif", fontSize: fs(15), fontWeight: 600, cursor: promoInput.trim() ? "pointer" : "not-allowed", whiteSpace: "nowrap", minHeight: 54 }}>
                    Apply
                  </button>
                </div>
                {promoError && <p role="alert" style={{ fontSize: fs(14), color: "#c0392b", fontFamily: "'Lato',sans-serif", marginTop: 8 }}>{promoError}</p>}
              </div>
            ) : (
              <div style={{ marginBottom: 32, background: "rgba(184,134,11,0.08)", border: "1.5px solid rgba(184,134,11,0.3)", borderRadius: 12, padding: "16px 24px", maxWidth: 640, width: "100%", display: "flex", alignItems: "center", gap: 12 }}>
                <span aria-hidden="true" style={{ fontSize: 20 }}>{promoInfo.school ? "🏫" : "🏷️"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: fs(15), fontWeight: 600, color: tc("#3d2b1a","#1a0e00"), fontFamily: "'Lato',sans-serif" }}>
                    {promoInfo.school ? `Supporting ${promoInfo.school}` : `${Math.round(promoInfo.discount * 100)}% discount applied`}
                  </div>
                  {promoInfo.school && <div style={{ fontSize: fs(14), color: tc("#6b5030","#4a3020"), fontFamily: "'Lato',sans-serif", marginTop: 2 }}>
                    ${promoInfo.schoolShare} from your purchase goes to the school
                  </div>}
                </div>
                <button onClick={() => { setPromoInfo(null); setPromoCode(""); setPromoInput(""); }} aria-label="Remove promo code"
                  style={{ background: "none", border: "none", color: "#a89070", cursor: "pointer", fontSize: 20, minWidth: 36, minHeight: 36, padding: "2px 8px" }}>✕</button>
              </div>
            )}

            {/* Primary CTA */}
            <button className="start-btn" onClick={() => setScreen("signup")}
              style={{ background: "linear-gradient(135deg,#5c3d1e,#8b5e34)", color: "#fdf6ec", border: highContrast ? "3px solid #3d2b1a" : "none", padding: "24px 88px", borderRadius: 100, fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(26), letterSpacing: 1, cursor: "pointer", boxShadow: "0 6px 28px rgba(93,61,26,0.3)", minHeight: 76, marginBottom: 18, transition: "all 0.2s" }}>
              Begin My Legacy ✦
            </button>

            {/* Returning user */}
            {savedSession?.user && (
              <div style={{ marginBottom: 16, padding: "18px 28px", background: "rgba(184,134,11,0.07)", border: "1.5px solid rgba(184,134,11,0.2)", borderRadius: 14, maxWidth: 580, width: "100%", textAlign: "center" }}>
                <div style={{ fontSize: fs(15), color: tc("#5c3d1e","#2a1000"), fontFamily: "'Lato',sans-serif", marginBottom: 12 }}>
                  Welcome back, <strong>{savedSession.user.firstName}</strong> — your story is waiting for you
                </div>
                <button onClick={() => restoreSession(savedSession)}
                  style={{ background: "linear-gradient(135deg,#b8860b,#d4a843)", color: "#fdf6ec", border: "none", padding: "14px 32px", borderRadius: 100, fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(18), cursor: "pointer", minHeight: 52 }}>
                  Continue My Story →
                </button>
                <div style={{ marginTop: 10 }}>
                  <button onClick={() => setScreen("signin")} style={{ background: "none", border: "none", color: tc("#a89070","#6b5030"), fontFamily: "'Lato',sans-serif", fontSize: fs(14), cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, minHeight: 40 }}>
                    Sign in to a different account
                  </button>
                </div>
              </div>
            )}
            {!savedSession?.user && (
              <button onClick={() => setScreen("signin")} style={{ background: "none", border: "none", color: tc("#a89070","#6b5030"), fontFamily: "'Lato',sans-serif", fontSize: fs(15), cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, minHeight: 48, marginBottom: 8 }}>
                Already have an account? Sign in
              </button>
            )}
            <p style={{ fontSize: fs(15), color: tc("#a89070","#5c3d1e"), fontFamily: "'Lato',sans-serif", lineHeight: 1.7 }}>
              First section free · no card required · $99 one-time to unlock your full book
            </p>

            {/* Gift buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 32, marginBottom: 10, width: "100%", maxWidth: 520 }}>
              <div style={{ flex: 1, height: 1, background: "rgba(180,140,80,0.25)" }} />
              <span style={{ fontSize: fs(13), color: tc("#a89070","#6b5030"), fontFamily: "'Lato',sans-serif", letterSpacing: "1px", textTransform: "uppercase", whiteSpace: "nowrap" }}>or give a gift</span>
              <div style={{ flex: 1, height: 1, background: "rgba(180,140,80,0.25)" }} />
            </div>
            <button onClick={() => setScreen("giftpurchase")}
              style={{ marginTop: 10, background: "rgba(184,134,11,0.08)", border: "2px solid rgba(184,134,11,0.35)", color: tc("#7a5c1e","#5c3d00"), fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(20), letterSpacing: 0.5, cursor: "pointer", padding: "16px 44px", borderRadius: 100, minHeight: 60, display: "flex", alignItems: "center", gap: 12, transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(184,134,11,0.14)"; e.currentTarget.style.borderColor = "rgba(184,134,11,0.6)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(184,134,11,0.08)"; e.currentTarget.style.borderColor = "rgba(184,134,11,0.35)"; }}>
              🎁 Give This as a Gift — $99
            </button>
            <button onClick={() => setScreen("giftcode")}
              style={{ marginTop: 14, background: "none", border: "none", color: tc("#b8860b","#7a5c00"), fontFamily: "'Lato',sans-serif", fontSize: fs(16), cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 4, minHeight: 48, padding: "8px 20px", fontWeight: 600 }}>
              Already have a gift code? Click here to redeem it
            </button>
          </section>

          {/* ── HOW IT WORKS ── */}
          <section style={{ background: "white", padding: "80px 8%", textAlign: "center" }}>
            <p style={{ fontSize: fs(13), letterSpacing: "3px", textTransform: "uppercase", color: "#b8860b", fontFamily: "'Lato',sans-serif", marginBottom: 14 }}>Simple from the very first word</p>
            <h2 style={{ fontSize: fs(40), fontWeight: 300, color: tc("#3d2b1a","#1a0e00"), fontStyle: "italic", marginBottom: 12 }}>How it works</h2>
            <p style={{ fontSize: fs(18), color: tc("#6b5540","#3a2510"), fontFamily: "'Lato',sans-serif", lineHeight: 1.7, maxWidth: 680, margin: "0 auto 56px" }}>
              No writing experience needed. No technical skills required. Just you, your memories, and Grace.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 28, justifyContent: "center", maxWidth: 1100, margin: "0 auto" }}>
              {[
                { step: "1", icon: "🕊️", title: "Meet Grace", desc: "Grace is your personal faith-centered guide. She'll introduce herself, learn a little about you, and make you feel completely at ease before you share a single word." },
                { step: "2", icon: "💬", title: "Tell Your Stories", desc: "Grace asks warm, thoughtful questions — and she really listens. She follows every thread, asks for names, details, and memories until each story is fully told." },
                { step: "3", icon: "📖", title: "Receive Your Book", desc: "Grace shapes everything you've shared into beautiful memoir prose, enriched with historical context. Download your PDF, share it with family, or order a printed copy." },
              ].map(({ step, icon, title, desc }) => (
                <div key={step} style={{ flex: "1 1 280px", maxWidth: 340, textAlign: "center", padding: "36px 28px", background: "#fdf6ec", borderRadius: 18, border: "1px solid rgba(180,140,80,0.15)" }}>
                  <div style={{ width: 68, height: 68, borderRadius: "50%", background: "linear-gradient(135deg,#5c3d1e,#8b5e34)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 20px" }}>{icon}</div>
                  <div style={{ fontSize: fs(12), letterSpacing: "2px", textTransform: "uppercase", color: "#b8860b", fontFamily: "'Lato',sans-serif", marginBottom: 10 }}>Step {step}</div>
                  <h3 style={{ fontSize: fs(22), fontWeight: 600, color: tc("#3d2b1a","#1a0e00"), marginBottom: 12 }}>{title}</h3>
                  <p style={{ fontSize: fs(16), color: tc("#6b5540","#3a2510"), fontFamily: "'Lato',sans-serif", lineHeight: 1.8 }}>{desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── FAITH SECTION ── */}
          <section style={{ background: "linear-gradient(135deg,#5c3d1e,#3d2b1a)", padding: "80px 8%", textAlign: "center" }}>
            <div style={{ maxWidth: 860, margin: "0 auto" }}>
              <div style={{ fontSize: 44, marginBottom: 24 }} aria-hidden="true">✝️</div>
              <p style={{ fontSize: fs(13), letterSpacing: "3px", textTransform: "uppercase", color: "rgba(253,246,236,0.55)", fontFamily: "'Lato',sans-serif", marginBottom: 18 }}>Built for people of faith</p>
              <h2 style={{ fontSize: fs(40), fontWeight: 300, color: "#fdf6ec", fontStyle: "italic", lineHeight: 1.3, marginBottom: 28 }}>
                Your story builds faith in others.
              </h2>
              <div style={{ background: "rgba(253,246,236,0.08)", border: "1px solid rgba(253,246,236,0.15)", borderRadius: 16, padding: "28px 36px", marginBottom: 28, textAlign: "left" }}>
                <p style={{ fontSize: fs(13), letterSpacing: "2px", textTransform: "uppercase", color: "#d4a843", fontFamily: "'Lato',sans-serif", marginBottom: 16 }}>2 Timothy 1:5 · King James Version</p>
                <p style={{ fontSize: fs(20), color: "rgba(253,246,236,0.92)", lineHeight: 1.9, fontStyle: "italic", marginBottom: 18 }}>
                  "When I call to remembrance the unfeigned faith that is in thee, which dwelt first in thy grandmother Lois, and thy mother Eunice; and I am persuaded that in thee also."
                </p>
                <p style={{ fontSize: fs(16), color: "#d4a843", fontFamily: "'Lato',sans-serif", lineHeight: 1.7, margin: 0 }}>
                  Legacy isn't abstract. It has names, faces, and stories that shape generations. <strong style={{ color: "#fdf6ec" }}>Yours is one of them.</strong>
                </p>
              </div>
              <p style={{ fontSize: fs(17), color: "rgba(253,246,236,0.75)", fontFamily: "'Lato',sans-serif", lineHeight: 1.8, marginBottom: 36 }}>
                Grace naturally weaves faith, scripture, and spiritual meaning into your story. She'll ask about the moments when you felt God closest, the verses that carried you through hard seasons, and the prayers you want to leave for the generations that follow.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center" }}>
                {["Faith Journey section included", "Scripture & prayer preserved", "Written for your grandchildren", "Nothing preachy — just honest"].map(item => (
                  <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(253,246,236,0.1)", border: "1px solid rgba(253,246,236,0.2)", borderRadius: 100, padding: "10px 20px" }}>
                    <span style={{ color: "#d4a843", fontSize: 14 }}>✦</span>
                    <span style={{ fontSize: fs(15), color: "rgba(253,246,236,0.85)", fontFamily: "'Lato',sans-serif" }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── WHAT'S IN YOUR BOOK ── */}
          <section style={{ background: "#fdf6ec", padding: "80px 8%", textAlign: "center" }}>
            <p style={{ fontSize: fs(13), letterSpacing: "3px", textTransform: "uppercase", color: "#b8860b", fontFamily: "'Lato',sans-serif", marginBottom: 14 }}>Five sections. One complete life.</p>
            <h2 style={{ fontSize: fs(40), fontWeight: 300, color: tc("#3d2b1a","#1a0e00"), fontStyle: "italic", marginBottom: 12 }}>What's in your book</h2>
            <p style={{ fontSize: fs(18), color: tc("#6b5540","#3a2510"), fontFamily: "'Lato',sans-serif", lineHeight: 1.7, maxWidth: 620, margin: "0 auto 48px" }}>
              Grace guides you through five sections — each one a deep conversation, each one a chapter your family will return to for generations.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 18, justifyContent: "center", maxWidth: 1100, margin: "0 auto 48px" }}>
              {[
                { icon: "🌱", title: "Early Life", desc: "Childhood, family, and where it all began" },
                { icon: "🌿", title: "Becoming You", desc: "Dreams, turning points, and the person you became" },
                { icon: "🏡", title: "Family & Love", desc: "Marriage, children, and the people who shaped your heart" },
                { icon: "✝️", title: "Faith Journey", desc: "Your spiritual story, scripture, and prayers for the next generation" },
                { icon: "🕊️", title: "Wisdom & Legacy", desc: "Life's lessons and what you hope to be remembered for" },
              ].map(({ icon, title, desc }) => (
                <div key={title} style={{ flex: "1 1 180px", maxWidth: 210, padding: "24px 20px", background: "white", borderRadius: 14, border: "1px solid rgba(180,140,80,0.15)", boxShadow: "0 2px 12px rgba(93,61,26,0.06)" }}>
                  <div style={{ fontSize: 34, marginBottom: 12 }}>{icon}</div>
                  <div style={{ fontSize: fs(16), fontWeight: 600, color: tc("#3d2b1a","#1a0e00"), marginBottom: 8 }}>{title}</div>
                  <div style={{ fontSize: fs(14), color: tc("#7a6040","#4a3020"), fontFamily: "'Lato',sans-serif", lineHeight: 1.65 }}>{desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ── TESTIMONIAL ── */}
          <section style={{ background: "white", padding: "80px 8%", textAlign: "center" }}>
            <div style={{ maxWidth: 860, margin: "0 auto" }}>
              <div style={{ fontSize: 40, color: "#b8860b", marginBottom: 24 }} aria-hidden="true">❝</div>
              <p style={{ fontSize: fs(26), color: tc("#3d2b1a","#1a0e00"), fontStyle: "italic", lineHeight: 1.85, marginBottom: 28, fontFamily: "'Cormorant Garamond',Georgia,serif" }}>
                "I never thought I had stories worth telling. Grace proved me wrong in the very first conversation. My daughter cried when she read what I'd written about her grandfather."
              </p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
                <div style={{ width: 54, height: 54, borderRadius: "50%", background: "linear-gradient(135deg,#b8860b,#d4a843)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🕊️</div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: fs(17), fontWeight: 600, color: tc("#3d2b1a","#1a0e00"), fontFamily: "'Lato',sans-serif" }}>Margaret, 71</div>
                  <div style={{ fontSize: fs(14), color: tc("#8b7355","#5c3d1e"), fontFamily: "'Lato',sans-serif" }}>Mason, Ohio</div>
                </div>
              </div>
            </div>
          </section>

          {/* ── PRICING ── */}
          <section style={{ background: "linear-gradient(160deg,#fdf6ec,#f5ede0)", padding: "80px 8%", textAlign: "center" }}>
            <p style={{ fontSize: fs(13), letterSpacing: "3px", textTransform: "uppercase", color: "#b8860b", fontFamily: "'Lato',sans-serif", marginBottom: 14 }}>Simple, honest pricing</p>
            <h2 style={{ fontSize: fs(40), fontWeight: 300, color: tc("#3d2b1a","#1a0e00"), fontStyle: "italic", marginBottom: 12 }}>One price. Forever yours.</h2>
            <p style={{ fontSize: fs(18), color: tc("#6b5540","#3a2510"), fontFamily: "'Lato',sans-serif", lineHeight: 1.7, maxWidth: 580, margin: "0 auto 44px" }}>
              Not a subscription. Not $99 a year. One payment, and your story is preserved forever.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "center", maxWidth: 1000, margin: "0 auto 48px" }}>
              {[
                { icon: "🆓", title: "Free to start", desc: "Complete your first section — Early Life — completely free. No credit card required." },
                { icon: "📄", title: "$99 one-time", desc: "Unlock all sections, your complete PDF book, and keep it forever. No recurring charges." },
                { icon: "📖", title: "Print from $79", desc: "Add a professionally bound hardcover book, delivered to your door. Ordered any time." },
              ].map(({ icon, title, desc }) => (
                <div key={title} style={{ flex: "1 1 240px", maxWidth: 300, padding: "30px 24px", background: "white", borderRadius: 16, border: "1px solid rgba(180,140,80,0.2)", boxShadow: "0 4px 20px rgba(93,61,26,0.07)", textAlign: "center" }}>
                  <div style={{ fontSize: 36, marginBottom: 16 }}>{icon}</div>
                  <div style={{ fontSize: fs(18), fontWeight: 600, color: tc("#3d2b1a","#1a0e00"), marginBottom: 10 }}>{title}</div>
                  <div style={{ fontSize: fs(15), color: tc("#6b5540","#3a2510"), fontFamily: "'Lato',sans-serif", lineHeight: 1.75 }}>{desc}</div>
                </div>
              ))}
            </div>

            {/* Bottom CTA */}
            <button className="start-btn" onClick={() => setScreen("signup")}
              style={{ background: "linear-gradient(135deg,#5c3d1e,#8b5e34)", color: "#fdf6ec", border: "none", padding: "24px 88px", borderRadius: 100, fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(26), letterSpacing: 1, cursor: "pointer", boxShadow: "0 6px 28px rgba(93,61,26,0.3)", minHeight: 76, marginBottom: 20, transition: "all 0.2s" }}>
              Begin My Legacy ✦
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 10, width: "100%", maxWidth: 520, margin: "0 auto 10px" }}>
              <div style={{ flex: 1, height: 1, background: "rgba(180,140,80,0.25)" }} />
              <span style={{ fontSize: fs(13), color: tc("#a89070","#6b5030"), fontFamily: "'Lato',sans-serif", letterSpacing: "1px", textTransform: "uppercase", whiteSpace: "nowrap" }}>or give a gift</span>
              <div style={{ flex: 1, height: 1, background: "rgba(180,140,80,0.25)" }} />
            </div>
            <button onClick={() => setScreen("giftpurchase")}
              style={{ marginTop: 14, background: "rgba(184,134,11,0.08)", border: "2px solid rgba(184,134,11,0.35)", color: tc("#7a5c1e","#5c3d00"), fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(20), letterSpacing: 0.5, cursor: "pointer", padding: "16px 44px", borderRadius: 100, minHeight: 60, display: "inline-flex", alignItems: "center", gap: 12, transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(184,134,11,0.14)"; e.currentTarget.style.borderColor = "rgba(184,134,11,0.6)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(184,134,11,0.08)"; e.currentTarget.style.borderColor = "rgba(184,134,11,0.35)"; }}>
              🎁 Give This as a Gift — $99
            </button>
            <br />
            <button onClick={() => setScreen("giftcode")}
              style={{ marginTop: 14, background: "none", border: "none", color: tc("#b8860b","#7a5c00"), fontFamily: "'Lato',sans-serif", fontSize: fs(16), cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 4, minHeight: 48, padding: "8px 20px", fontWeight: 600 }}>
              Already have a gift code? Click here to redeem it
            </button>
          </section>

        </main>
      )}

      {/* ── GIFT PURCHASE ── */}
      {screen === "giftpurchase" && (
        <main id="main-content" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "78vh", padding: "40px 24px", animation: "fadeUp 0.4s ease forwards" }}>
          <div style={{ maxWidth: 720, width: "100%" }}>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }} aria-hidden="true">🎁</div>
              <h2 style={{ fontSize: fs(34), fontWeight: 300, color: tc("#3d2b1a","#1a0e00"), fontStyle: "italic", marginBottom: 8 }}>Give the Gift of Story</h2>
              <p style={{ fontSize: fs(16), color: tc("#6b5540","#3a2510"), fontFamily: "'Lato',sans-serif", lineHeight: 1.7 }}>
                A beautifully guided legacy book — the most meaningful gift you can give someone you love.
              </p>
            </div>
            <div style={{ background: "white", borderRadius: 16, padding: "32px", boxShadow: "0 8px 40px rgba(93,61,26,0.1)", border: "1px solid rgba(180,140,80,0.15)", marginBottom: 20 }}>
              <div style={{ background: "rgba(184,134,11,0.06)", borderRadius: 10, padding: "16px 18px", marginBottom: 24, border: "1px solid rgba(184,134,11,0.15)" }}>
                <div style={{ fontSize: fs(12), letterSpacing: "1.5px", textTransform: "uppercase", color: "#b8860b", fontFamily: "'Lato',sans-serif", marginBottom: 10 }}>What they'll receive</div>
                {[["🕊️","A personal AI guide walks with them through their whole life story"],["📄","A beautifully formatted PDF legacy book — theirs to keep and share"],["💛","Their stories preserved forever for the people they love most"]].map(([icon, text]) => (
                  <div key={text} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
                    <span style={{ fontSize: fs(14), color: tc("#5c4a35","#2a1a0a"), fontFamily: "'Lato',sans-serif", lineHeight: 1.6 }}>{text}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: fs(13), color: tc("#7a5c3a","#4a3020"), fontFamily: "'Lato',sans-serif", fontWeight: 600, marginBottom: 14, letterSpacing: "0.5px", textTransform: "uppercase" }}>Your information</div>
              {[["giftBuyerName","Your name","text",giftBuyerName,setGiftBuyerName],["giftBuyerEmail","Your email (we'll send the gift code here)","email",giftBuyerEmail,setGiftBuyerEmail]].map(([id, label, type, val, setter]) => (
                <div key={id} style={{ marginBottom: 14 }}>
                  <label htmlFor={id} style={{ display: "block", fontSize: fs(12), color: tc("#7a5c3a","#4a3020"), fontFamily: "'Lato',sans-serif", marginBottom: 6, fontWeight: 600 }}>{label}</label>
                  <input id={id} type={type} value={val} onChange={e => { setter(e.target.value); setGiftPurchaseError(""); }}
                    style={{ width: "100%", border: "1.5px solid rgba(180,140,80,0.3)", borderRadius: 8, padding: "11px 14px", fontFamily: "'Lato',sans-serif", fontSize: fs(15), color: tc("#3d2b1a","#1a0e00"), background: "#fffdf5", outline: "none", boxSizing: "border-box", minHeight: 48 }} />
                </div>
              ))}
              <div style={{ fontSize: fs(13), color: tc("#7a5c3a","#4a3020"), fontFamily: "'Lato',sans-serif", fontWeight: 600, marginBottom: 14, marginTop: 20, letterSpacing: "0.5px", textTransform: "uppercase" }}>Who is this gift for?</div>
              <div style={{ marginBottom: 20 }}>
                <label htmlFor="giftRecipientName" style={{ display: "block", fontSize: fs(12), color: tc("#7a5c3a","#4a3020"), fontFamily: "'Lato',sans-serif", marginBottom: 6, fontWeight: 600 }}>Their first name</label>
                <input id="giftRecipientName" type="text" value={giftRecipientName} onChange={e => { setGiftRecipientName(e.target.value); setGiftPurchaseError(""); }}
                  placeholder="e.g. Mom, Dad, Grandma..."
                  style={{ width: "100%", border: "1.5px solid rgba(180,140,80,0.3)", borderRadius: 8, padding: "11px 14px", fontFamily: "'Lato',sans-serif", fontSize: fs(15), color: tc("#3d2b1a","#1a0e00"), background: "#fffdf5", outline: "none", boxSizing: "border-box", minHeight: 48 }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label htmlFor="giftRecipientEmail" style={{ display: "block", fontSize: fs(12), color: tc("#7a5c3a","#4a3020"), fontFamily: "'Lato',sans-serif", marginBottom: 6, fontWeight: 600 }}>
                  Their email address <span style={{ color: tc("#a89070","#6b5030"), fontWeight: 400 }}>(optional — we'll send them a gift notification)</span>
                </label>
                <input id="giftRecipientEmail" type="email" value={giftRecipientEmail} onChange={e => { setGiftRecipientEmail(e.target.value); setGiftPurchaseError(""); }}
                  placeholder="mom@email.com"
                  style={{ width: "100%", border: "1.5px solid rgba(180,140,80,0.3)", borderRadius: 8, padding: "11px 14px", fontFamily: "'Lato',sans-serif", fontSize: fs(15), color: tc("#3d2b1a","#1a0e00"), background: "#fffdf5", outline: "none", boxSizing: "border-box", minHeight: 48 }} />
                <p style={{ fontSize: fs(12), color: tc("#a89070","#6b5030"), fontFamily: "'Lato',sans-serif", marginTop: 6, fontStyle: "italic" }}>
                  If provided, we'll send them a beautiful email letting them know a gift is waiting. Leave blank if you'd prefer to share the code yourself.
                </p>
              </div>

              {/* Book format choice */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: fs(13), fontWeight: 600, color: tc("#7a5c3a","#4a3020"), fontFamily: "'Lato',sans-serif", marginBottom: 10, letterSpacing: "0.5px", textTransform: "uppercase" }}>Gift format</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }} role="group" aria-label="Gift format options">
                  {[
                    { id: "pdf", icon: "📄", label: "PDF Book Gift", sub: "They download and share instantly", price: 99 },
                    { id: "print1", icon: "📖", label: "PDF + Printed Copy", sub: "A physical book delivered to their door", price: 178 },
                  ].map(opt => (
                    <button key={opt.id} onClick={() => setGiftBookChoice(opt.id)}
                      aria-pressed={giftBookChoice === opt.id}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderRadius: 10, border: `2px solid ${giftBookChoice === opt.id ? "#b8860b" : "rgba(180,140,80,0.22)"}`, background: giftBookChoice === opt.id ? "#fffdf5" : "white", cursor: "pointer", textAlign: "left", minHeight: 58 }}>
                      <div style={{ width: 30, height: 30, borderRadius: "50%", border: `2px solid ${giftBookChoice === opt.id ? "#b8860b" : "rgba(180,140,80,0.35)"}`, background: giftBookChoice === opt.id ? "#b8860b" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {giftBookChoice === opt.id
                          ? <svg width="11" height="11" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="#fdf6ec" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          : <span style={{ fontSize: 14 }}>{opt.icon}</span>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: fs(14), fontWeight: 600, color: tc("#3d2b1a","#1a0e00") }}>{opt.label}</div>
                        <div style={{ fontSize: fs(12), color: tc("#7a6040","#4a3020"), fontFamily: "'Lato',sans-serif", marginTop: 1 }}>{opt.sub}</div>
                      </div>
                      <div style={{ fontSize: fs(18), fontWeight: 600, color: giftBookChoice === opt.id ? "#b8860b" : tc("#3d2b1a","#1a0e00"), flexShrink: 0 }}>${opt.price}</div>
                    </button>
                  ))}
                </div>
                {giftBookChoice === "print1" && (
                  <p style={{ fontSize: fs(12), color: tc("#8b7355","#5c3d1e"), fontFamily: "'Lato',sans-serif", marginTop: 8, fontStyle: "italic" }}>
                    We'll collect the shipping address after payment
                  </p>
                )}
              </div>

              {giftPurchaseError && <p role="alert" style={{ fontSize: fs(13), color: "#c0392b", fontFamily: "'Lato',sans-serif", marginBottom: 14 }}>{giftPurchaseError}</p>}
              <button onClick={handleGiftPurchase}
                style={{ width: "100%", background: "linear-gradient(135deg,#5c3d1e,#8b5e34)", color: "#fdf6ec", border: "none", padding: "18px", borderRadius: 100, fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(19), letterSpacing: 0.5, cursor: "pointer", boxShadow: "0 4px 20px rgba(93,61,26,0.25)", minHeight: 58, marginBottom: 12 }}>
                Continue to Payment — ${giftBookChoice === "pdf" ? 99 : 178} ✦
              </button>
              <p style={{ fontSize: fs(12), color: tc("#a89070","#6b5030"), fontFamily: "'Lato',sans-serif", textAlign: "center", lineHeight: 1.6 }}>
                🔒 Secure checkout via Stripe · After payment, your gift code arrives instantly by email
              </p>
            </div>
            <button onClick={() => setScreen("welcome")}
              style={{ display: "block", margin: "0 auto", background: "none", border: "none", color: tc("#a89070","#6b5030"), fontFamily: "'Lato',sans-serif", fontSize: fs(13), cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, minHeight: 44, padding: "8px 16px" }}>
              ← Back
            </button>
          </div>
        </main>
      )}

      {/* ── GIFT SENT CONFIRMATION ── */}
      {screen === "giftsent" && (
        <main id="main-content" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "78vh", padding: "40px 24px", animation: "fadeUp 0.5s ease forwards", textAlign: "center" }}>
          <div style={{ maxWidth: 620, width: "100%" }}>
            <div style={{ fontSize: 64, marginBottom: 24, animation: "pulse 2s ease-in-out infinite" }} aria-hidden="true">🎁</div>
            <p style={{ fontSize: fs(12), letterSpacing: "3px", textTransform: "uppercase", color: "#b8860b", fontFamily: "'Lato',sans-serif", marginBottom: 16 }}>Your gift is on its way</p>
            <h1 style={{ fontSize: fs(40), fontWeight: 300, color: tc("#3d2b1a","#1a0e00"), fontStyle: "italic", lineHeight: 1.2, marginBottom: 20 }}>
              What a beautiful thing you just did.
            </h1>
            <div style={{ background: "white", borderRadius: 16, padding: "28px 32px", border: "1.5px solid rgba(180,140,80,0.2)", boxShadow: "0 4px 24px rgba(93,61,26,0.08)", marginBottom: 28, textAlign: "left" }}>
              <p style={{ fontSize: fs(17), color: tc("#5c4a35","#2a1a0a"), fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", lineHeight: 1.9, marginBottom: 16 }}>
                Your gift code is being sent to your email right now. Share it with your loved one — they'll use it to unlock their full legacy book at no charge.
              </p>
              <p style={{ fontSize: fs(15), color: tc("#7a6040","#4a3020"), fontFamily: "'Lato',sans-serif", lineHeight: 1.7, marginBottom: 0 }}>
                When they redeem it, you'll receive an email letting you know their story has begun. 🕊️
              </p>
            </div>
            <button onClick={() => setScreen("welcome")}
              style={{ background: "linear-gradient(135deg,#5c3d1e,#8b5e34)", color: "#fdf6ec", border: "none", padding: "16px 44px", borderRadius: 100, fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(18), cursor: "pointer", boxShadow: "0 4px 20px rgba(93,61,26,0.2)", minHeight: 54 }}>
              Back to Home ✦
            </button>
          </div>
        </main>
      )}

      {/* ── GIFT CODE REDEMPTION ── */}
      {screen === "giftcode" && (
        <main id="main-content" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "78vh", padding: "40px 24px", animation: "fadeUp 0.4s ease forwards" }}>
          <div style={{ maxWidth: 580, width: "100%" }}>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }} aria-hidden="true">🎁</div>
              <h2 style={{ fontSize: fs(32), fontWeight: 300, color: tc("#3d2b1a","#1a0e00"), fontStyle: "italic", marginBottom: 8 }}>You've Received a Gift</h2>
              <p style={{ fontSize: fs(16), color: tc("#6b5540","#3a2510"), fontFamily: "'Lato',sans-serif", lineHeight: 1.7 }}>
                Someone who loves you has given you the gift of story. Enter your code below to unlock your full legacy book.
              </p>
            </div>
            <div style={{ background: "white", borderRadius: 16, padding: "28px 28px", border: "1.5px solid rgba(180,140,80,0.2)", boxShadow: "0 4px 24px rgba(93,61,26,0.07)" }}>
              {[["gift-name","Your first name","text",giftName,setGiftName,"First name",""],["gift-email","Your email","email",giftEmail,setGiftEmail,"your@email.com",""]].map(([id,label,type,val,setter,placeholder]) => (
                <div key={id} style={{ marginBottom: 16 }}>
                  <label htmlFor={id} style={{ display: "block", fontSize: fs(13), color: tc("#6b5540","#3a2510"), fontFamily: "'Lato',sans-serif", marginBottom: 6, fontWeight: 600 }}>{label}</label>
                  <input id={id} type={type} value={val} onChange={e => { setter(e.target.value); setGiftError(""); }}
                    placeholder={placeholder}
                    style={{ width: "100%", border: "1.5px solid rgba(180,140,80,0.3)", borderRadius: 8, padding: "11px 14px", fontFamily: "'Lato',sans-serif", fontSize: fs(15), color: tc("#3d2b1a","#1a0e00"), background: "#fffdf5", outline: "none", minHeight: 48, boxSizing: "border-box" }} />
                </div>
              ))}
              <div style={{ marginBottom: 20 }}>
                <label htmlFor="gift-code" style={{ display: "block", fontSize: fs(13), color: tc("#6b5540","#3a2510"), fontFamily: "'Lato',sans-serif", marginBottom: 6, fontWeight: 600 }}>Gift code</label>
                <input id="gift-code" value={giftCode} onChange={e => { setGiftCode(e.target.value.toUpperCase()); setGiftError(""); }}
                  placeholder="XXXX-XXXX-XXXX"
                  style={{ width: "100%", border: `1.5px solid ${giftError ? "#c0392b" : "rgba(180,140,80,0.3)"}`, borderRadius: 8, padding: "11px 14px", fontFamily: "'Lato',sans-serif", fontSize: fs(18), fontWeight: 700, letterSpacing: 4, color: tc("#3d2b1a","#1a0e00"), background: "#fffdf5", outline: "none", minHeight: 52, boxSizing: "border-box", textTransform: "uppercase" }} />
                {giftError && <p role="alert" style={{ fontSize: fs(13), color: "#c0392b", fontFamily: "'Lato',sans-serif", marginTop: 6 }}>{giftError}</p>}
              </div>
              <button onClick={redeemGiftCode} disabled={giftLoading || !giftCode.trim() || !giftEmail.trim() || !giftName.trim()}
                style={{ width: "100%", background: (giftLoading || !giftCode.trim() || !giftEmail.trim() || !giftName.trim()) ? "rgba(139,94,52,0.3)" : "linear-gradient(135deg,#5c3d1e,#8b5e34)", color: "#fdf6ec", border: "none", padding: "16px", borderRadius: 100, fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(19), letterSpacing: 0.5, cursor: (giftLoading || !giftCode.trim() || !giftEmail.trim() || !giftName.trim()) ? "not-allowed" : "pointer", minHeight: 54, transition: "all 0.2s" }}>
                {giftLoading ? "Unlocking your story..." : "Unlock My Legacy Book ✦"}
              </button>
            </div>
            <button onClick={() => setScreen("welcome")}
              style={{ display: "block", margin: "16px auto 0", background: "none", border: "none", color: tc("#a89070","#6b5030"), fontFamily: "'Lato',sans-serif", fontSize: fs(13), cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, minHeight: 44, padding: "8px 16px" }}>
              ← Back
            </button>
          </div>
        </main>
      )}

      {/* ── BOOK LOCKED ── */}
      {screen === "booklocked" && (
        <main id="main-content" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "78vh", textAlign: "center", padding: "40px 24px", animation: "fadeUp 0.5s ease forwards" }}>
          <div style={{ maxWidth: 640, width: "100%" }}>
            <div style={{ fontSize: 52, marginBottom: 20 }} aria-hidden="true">📖</div>
            <p style={{ fontSize: fs(12), letterSpacing: "2.5px", textTransform: "uppercase", color: "#b8860b", fontFamily: "'Lato',sans-serif", marginBottom: 16 }}>Your story is complete</p>
            <h1 style={{ fontSize: fs(38), fontWeight: 300, color: tc("#3d2b1a","#1a0e00"), fontStyle: "italic", lineHeight: 1.2, marginBottom: 20 }}>
              This account already has a book.
            </h1>
            <div style={{ background: "white", borderRadius: 16, padding: "28px 32px", border: "1.5px solid rgba(180,140,80,0.2)", boxShadow: "0 8px 32px rgba(93,61,26,0.08)", marginBottom: 28, textAlign: "left" }}>
              <p style={{ fontSize: fs(17), color: tc("#5c4a35","#2a1a0a"), fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", lineHeight: 1.85, marginBottom: 16 }}>
                Each MyStory.Family account preserves one person's story — and yours is already complete and saved here.
              </p>
              <p style={{ fontSize: fs(15), color: tc("#7a6040","#4a3020"), fontFamily: "'Lato',sans-serif", lineHeight: 1.7, marginBottom: 0 }}>
                Want to preserve someone else's story — a parent, a spouse, a grandparent? They'll need their own account. Each story deserves its own home. 🕊️
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
              <button onClick={() => { setScreen("chat"); setBookComplete(true); }}
                style={{ background: "linear-gradient(135deg,#5c3d1e,#8b5e34)", color: "#fdf6ec", border: "none", padding: "16px 44px", borderRadius: 100, fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(18), cursor: "pointer", boxShadow: "0 4px 20px rgba(93,61,26,0.2)", minHeight: 54 }}>
                Return to My Book ✦
              </button>
              <a href={`mailto:timothy@mystory.family?subject=New story account&body=I'd like to start a new story for another family member.`}
                style={{ fontSize: fs(14), color: tc("#b8860b","#7a5c00"), fontFamily: "'Lato',sans-serif", textDecoration: "underline", textUnderlineOffset: 3 }}>
                Contact us to set up a new account for someone else
              </a>
            </div>
          </div>
        </main>
      )}

      {/* ── SIGNUP ── */}
      {screen === "signup" && (
        <main id="main-content" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "78vh", padding: "40px 24px", animation: "fadeUp 0.4s ease forwards" }}>
          <div style={{ maxWidth: 720, width: "100%" }}>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }} aria-hidden="true">🕊️</div>
              <h2 style={{ fontSize: fs(32), fontWeight: 300, color: tc("#3d2b1a","#1a0e00"), fontStyle: "italic", marginBottom: 8 }}>Create Your Account</h2>
              <p style={{ fontSize: fs(15), color: tc("#6b5540","#3a2510"), fontFamily: "'Lato',sans-serif", lineHeight: 1.7 }}>
                Your story will be saved so you can return any time — on any device.
              </p>
            </div>

            <div style={{ background: "white", borderRadius: 16, padding: "32px", boxShadow: "0 8px 40px rgba(93,61,26,0.1)", border: "1px solid rgba(180,140,80,0.15)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                {[["firstName","First Name","text"],["lastName","Last Name","text"]].map(([key, label, type]) => (
                  <div key={key}>
                    <label htmlFor={`signup-${key}`} style={{ display: "block", fontSize: fs(12), color: tc("#7a5c3a","#4a3020"), fontFamily: "'Lato',sans-serif", marginBottom: 6, fontWeight: 600, letterSpacing: "0.5px" }}>{label}</label>
                    <input id={`signup-${key}`} type={type} value={signupFields[key]}
                      onChange={e => { setSignupFields(p => ({ ...p, [key]: e.target.value })); setSignupError(""); }}
                      onKeyDown={e => e.key === "Enter" && handleSignup()}
                      style={{ width: "100%", border: `1.5px solid ${signupError && !signupFields[key].trim() ? "#c0392b" : "rgba(180,140,80,0.3)"}`, borderRadius: 8, padding: "12px 14px", fontFamily: "'Lato',sans-serif", fontSize: fs(15), color: tc("#3d2b1a","#1a0e00"), background: "#fffdf5", outline: "none", boxSizing: "border-box", minHeight: 48 }} />
                  </div>
                ))}
              </div>
              {[["email","Email Address","email"],["password","Create a Password","password"]].map(([key, label, type]) => (
                <div key={key} style={{ marginBottom: 14 }}>
                  <label htmlFor={`signup-${key}`} style={{ display: "block", fontSize: fs(12), color: tc("#7a5c3a","#4a3020"), fontFamily: "'Lato',sans-serif", marginBottom: 6, fontWeight: 600, letterSpacing: "0.5px" }}>{label}</label>
                  <input id={`signup-${key}`} type={type} value={signupFields[key]}
                    onChange={e => { setSignupFields(p => ({ ...p, [key]: e.target.value })); setSignupError(""); }}
                    onKeyDown={e => e.key === "Enter" && handleSignup()}
                    placeholder={key === "password" ? "8+ chars, 1 capital, 1 number" : ""}
                    style={{ width: "100%", border: `1.5px solid rgba(180,140,80,0.3)`, borderRadius: 8, padding: "12px 14px", fontFamily: "'Lato',sans-serif", fontSize: fs(15), color: tc("#3d2b1a","#1a0e00"), background: "#fffdf5", outline: "none", boxSizing: "border-box", minHeight: 48 }} />
                </div>
              ))}

              {signupError && <p role="alert" style={{ fontSize: fs(13), color: "#c0392b", fontFamily: "'Lato',sans-serif", marginBottom: 14, lineHeight: 1.5 }}>{signupError}</p>}

              {/* Privacy policy checkbox */}
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 16, cursor: "pointer" }}>
                <input type="checkbox" checked={privacyAccepted} onChange={e => { setPrivacyAccepted(e.target.checked); setSignupError(""); }}
                  style={{ marginTop: 3, width: 18, height: 18, accentColor: "#b8860b", cursor: "pointer", flexShrink: 0 }} />
                <span style={{ fontSize: fs(13), color: tc("#6b5540","#3a2510"), fontFamily: "'Lato',sans-serif", lineHeight: 1.6 }}>
                  I have read and agree to the{" "}
                  <a href="/privacy" target="_blank" rel="noreferrer" style={{ color: "#b8860b", textDecoration: "underline", textUnderlineOffset: 3 }}>Privacy Policy</a>
                </span>
              </label>

              <button onClick={handleSignup}
                style={{ width: "100%", background: "linear-gradient(135deg,#5c3d1e,#8b5e34)", color: "#fdf6ec", border: "none", padding: "17px", borderRadius: 100, fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(18), letterSpacing: 0.5, cursor: "pointer", boxShadow: "0 4px 20px rgba(93,61,26,0.2)", minHeight: 56, marginBottom: 16 }}>
                Create My Account ✦
              </button>

              <p style={{ textAlign: "center", fontSize: fs(13), color: tc("#a89070","#6b5030"), fontFamily: "'Lato',sans-serif" }}>
                Already have an account?{" "}
                <button onClick={() => setScreen("signin")} style={{ background: "none", border: "none", color: "#b8860b", fontFamily: "'Lato',sans-serif", fontSize: fs(13), cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, padding: 0, fontWeight: 600 }}>Sign in</button>
              </p>
            </div>

            <button onClick={() => setScreen("welcome")} style={{ display: "block", margin: "16px auto 0", background: "none", border: "none", color: tc("#a89070","#6b5030"), fontFamily: "'Lato',sans-serif", fontSize: fs(13), cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, minHeight: 44, padding: "8px 16px" }}>
              ← Back
            </button>
          </div>
        </main>
      )}

      {/* ── SIGN IN ── */}
      {screen === "signin" && (
        <main id="main-content" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "78vh", padding: "40px 24px", animation: "fadeUp 0.4s ease forwards" }}>
          <div style={{ maxWidth: 580, width: "100%" }}>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }} aria-hidden="true">🕊️</div>
              <h2 style={{ fontSize: fs(32), fontWeight: 300, color: tc("#3d2b1a","#1a0e00"), fontStyle: "italic", marginBottom: 8 }}>Welcome Back</h2>
              <p style={{ fontSize: fs(15), color: tc("#6b5540","#3a2510"), fontFamily: "'Lato',sans-serif", lineHeight: 1.7 }}>
                Your story is right where you left it.
              </p>
            </div>

            <div style={{ background: "white", borderRadius: 16, padding: "32px", boxShadow: "0 8px 40px rgba(93,61,26,0.1)", border: "1px solid rgba(180,140,80,0.15)" }}>
              {[["email","Email Address","email"],["password","Password","password"]].map(([key, label, type]) => (
                <div key={key} style={{ marginBottom: 16 }}>
                  <label htmlFor={`signin-${key}`} style={{ display: "block", fontSize: fs(12), color: tc("#7a5c3a","#4a3020"), fontFamily: "'Lato',sans-serif", marginBottom: 6, fontWeight: 600, letterSpacing: "0.5px" }}>{label}</label>
                  <input id={`signin-${key}`} type={type} value={signinFields[key]}
                    onChange={e => { setSigninFields(p => ({ ...p, [key]: e.target.value })); setSigninError(""); }}
                    onKeyDown={e => e.key === "Enter" && handleSignin()}
                    style={{ width: "100%", border: `1.5px solid rgba(180,140,80,0.3)`, borderRadius: 8, padding: "12px 14px", fontFamily: "'Lato',sans-serif", fontSize: fs(15), color: tc("#3d2b1a","#1a0e00"), background: "#fffdf5", outline: "none", boxSizing: "border-box", minHeight: 48 }} />
                </div>
              ))}

              {signinError && <p role="alert" style={{ fontSize: fs(13), color: "#c0392b", fontFamily: "'Lato',sans-serif", marginBottom: 14, lineHeight: 1.5 }}>{signinError}</p>}

              <button onClick={handleSignin}
                style={{ width: "100%", background: "linear-gradient(135deg,#5c3d1e,#8b5e34)", color: "#fdf6ec", border: "none", padding: "17px", borderRadius: 100, fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(18), letterSpacing: 0.5, cursor: "pointer", boxShadow: "0 4px 20px rgba(93,61,26,0.2)", minHeight: 56, marginBottom: 12 }}>
                Continue My Story →
              </button>

              <button onClick={() => { setShowForgotPassword(true); setForgotSuccess(false); setForgotError(""); setForgotEmail(signinFields.email); setForgotNewPassword(""); setForgotConfirm(""); }}
                style={{ display: "block", width: "100%", background: "none", border: "none", color: tc("#a89070","#6b5030"), fontFamily: "'Lato',sans-serif", fontSize: fs(13), cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, marginBottom: 12, minHeight: 36 }}>
                Forgot your password?
              </button>

              {showForgotPassword && (
                <div style={{ background: "rgba(184,134,11,0.06)", border: "1px solid rgba(184,134,11,0.2)", borderRadius: 12, padding: "20px", marginBottom: 16 }}>
                  {forgotSuccess ? (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 28, marginBottom: 10 }}>✦</div>
                      <p style={{ fontSize: fs(15), color: tc("#3d2b1a","#1a0e00"), fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", marginBottom: 12 }}>Password updated. You can sign in now.</p>
                      <button onClick={() => { setShowForgotPassword(false); setForgotSuccess(false); setForgotStep("email"); }}
                        style={{ background: "linear-gradient(135deg,#5c3d1e,#8b5e34)", color: "#fdf6ec", border: "none", padding: "10px 24px", borderRadius: 100, fontFamily: "'Lato',sans-serif", fontSize: fs(13), cursor: "pointer", minHeight: 40 }}>
                        Sign In →
                      </button>
                    </div>
                  ) : forgotStep === "email" ? (
                    <>
                      <p style={{ fontSize: fs(13), color: tc("#6b5540","#3a2510"), fontFamily: "'Lato',sans-serif", marginBottom: 14, lineHeight: 1.6 }}>
                        Enter your email and we'll send you a verification code.
                      </p>
                      <div style={{ marginBottom: 10 }}>
                        <label style={{ display: "block", fontSize: fs(11), color: tc("#7a5c3a","#4a3020"), fontFamily: "'Lato',sans-serif", marginBottom: 4, fontWeight: 600, letterSpacing: "0.5px" }}>Email Address</label>
                        <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleForgotPassword()}
                          style={{ width: "100%", border: "1.5px solid rgba(180,140,80,0.3)", borderRadius: 8, padding: "10px 12px", fontFamily: "'Lato',sans-serif", fontSize: fs(14), color: tc("#3d2b1a","#1a0e00"), background: "#fffdf5", outline: "none", boxSizing: "border-box", minHeight: 44 }} />
                      </div>
                      {forgotError && <p style={{ fontSize: fs(13), color: forgotError.includes("Sending") ? "#b8860b" : "#c0392b", fontFamily: "'Lato',sans-serif", marginBottom: 10 }}>{forgotError}</p>}
                      <div style={{ display: "flex", gap: 10 }}>
                        <button onClick={handleForgotPassword}
                          style={{ flex: 1, background: "linear-gradient(135deg,#5c3d1e,#8b5e34)", color: "#fdf6ec", border: "none", padding: "11px", borderRadius: 100, fontFamily: "'Lato',sans-serif", fontSize: fs(13), cursor: "pointer", minHeight: 44 }}>
                          Send Code
                        </button>
                        <button onClick={() => { setShowForgotPassword(false); setForgotStep("email"); }}
                          style={{ background: "none", border: "1.5px solid rgba(180,140,80,0.3)", color: tc("#6b5540","#3a2510"), fontFamily: "'Lato',sans-serif", fontSize: fs(13), cursor: "pointer", padding: "11px 18px", borderRadius: 100, minHeight: 44 }}>
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : forgotStep === "code" ? (
                    <>
                      <p style={{ fontSize: fs(13), color: tc("#6b5540","#3a2510"), fontFamily: "'Lato',sans-serif", marginBottom: 14, lineHeight: 1.6 }}>
                        We sent a 6-digit code to <strong>{forgotEmail}</strong>. Enter it below.
                      </p>
                      <div style={{ marginBottom: 10 }}>
                        <label style={{ display: "block", fontSize: fs(11), color: tc("#7a5c3a","#4a3020"), fontFamily: "'Lato',sans-serif", marginBottom: 4, fontWeight: 600, letterSpacing: "0.5px" }}>Verification Code</label>
                        <input type="text" value={forgotCode} onChange={e => setForgotCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          onKeyDown={e => e.key === "Enter" && handleForgotPassword()}
                          placeholder="123456"
                          style={{ width: "100%", border: "1.5px solid rgba(180,140,80,0.3)", borderRadius: 8, padding: "10px 12px", fontFamily: "'Lato',sans-serif", fontSize: fs(20), color: tc("#3d2b1a","#1a0e00"), background: "#fffdf5", outline: "none", boxSizing: "border-box", minHeight: 44, letterSpacing: 6, textAlign: "center" }} />
                      </div>
                      {forgotError && <p style={{ fontSize: fs(13), color: "#c0392b", fontFamily: "'Lato',sans-serif", marginBottom: 10 }}>{forgotError}</p>}
                      <div style={{ display: "flex", gap: 10 }}>
                        <button onClick={handleForgotPassword}
                          style={{ flex: 1, background: "linear-gradient(135deg,#5c3d1e,#8b5e34)", color: "#fdf6ec", border: "none", padding: "11px", borderRadius: 100, fontFamily: "'Lato',sans-serif", fontSize: fs(13), cursor: "pointer", minHeight: 44 }}>
                          Verify Code
                        </button>
                        <button onClick={() => setForgotStep("email")}
                          style={{ background: "none", border: "1.5px solid rgba(180,140,80,0.3)", color: tc("#6b5540","#3a2510"), fontFamily: "'Lato',sans-serif", fontSize: fs(13), cursor: "pointer", padding: "11px 18px", borderRadius: 100, minHeight: 44 }}>
                          Back
                        </button>
                      </div>
                      <button onClick={() => { setForgotStep("email"); setForgotError(""); handleForgotPassword(); }}
                        style={{ display: "block", width: "100%", background: "none", border: "none", color: tc("#a89070","#6b5030"), fontFamily: "'Lato',sans-serif", fontSize: fs(12), cursor: "pointer", textDecoration: "underline", marginTop: 10, minHeight: 32 }}>
                        Resend code
                      </button>
                    </>
                  ) : (
                    <>
                      <p style={{ fontSize: fs(13), color: tc("#6b5540","#3a2510"), fontFamily: "'Lato',sans-serif", marginBottom: 14, lineHeight: 1.6 }}>
                        Code verified ✓ Now choose a new password.
                      </p>
                      {[["New Password", forgotNewPassword, setForgotNewPassword], ["Confirm Password", forgotConfirm, setForgotConfirm]].map(([label, val, setter]) => (
                        <div key={label} style={{ marginBottom: 10 }}>
                          <label style={{ display: "block", fontSize: fs(11), color: tc("#7a5c3a","#4a3020"), fontFamily: "'Lato',sans-serif", marginBottom: 4, fontWeight: 600, letterSpacing: "0.5px" }}>{label}</label>
                          <input type="password" value={val} onChange={e => setter(e.target.value)}
                            style={{ width: "100%", border: "1.5px solid rgba(180,140,80,0.3)", borderRadius: 8, padding: "10px 12px", fontFamily: "'Lato',sans-serif", fontSize: fs(14), color: tc("#3d2b1a","#1a0e00"), background: "#fffdf5", outline: "none", boxSizing: "border-box", minHeight: 44 }} />
                        </div>
                      ))}
                      {forgotError && <p style={{ fontSize: fs(13), color: forgotError.includes("Updating") ? "#b8860b" : "#c0392b", fontFamily: "'Lato',sans-serif", marginBottom: 10 }}>{forgotError}</p>}
                      <div style={{ display: "flex", gap: 10 }}>
                        <button onClick={handleForgotPassword}
                          style={{ flex: 1, background: "linear-gradient(135deg,#5c3d1e,#8b5e34)", color: "#fdf6ec", border: "none", padding: "11px", borderRadius: 100, fontFamily: "'Lato',sans-serif", fontSize: fs(13), cursor: "pointer", minHeight: 44 }}>
                          Update Password
                        </button>
                        <button onClick={() => setForgotStep("code")}
                          style={{ background: "none", border: "1.5px solid rgba(180,140,80,0.3)", color: tc("#6b5540","#3a2510"), fontFamily: "'Lato',sans-serif", fontSize: fs(13), cursor: "pointer", padding: "11px 18px", borderRadius: 100, minHeight: 44 }}>
                          Back
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              <p style={{ textAlign: "center", fontSize: fs(13), color: tc("#a89070","#6b5030"), fontFamily: "'Lato',sans-serif" }}>
                New here?{" "}
                <button onClick={() => setScreen("signup")} style={{ background: "none", border: "none", color: "#b8860b", fontFamily: "'Lato',sans-serif", fontSize: fs(13), cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, padding: 0, fontWeight: 600 }}>Create an account</button>
              </p>
            </div>

            <button onClick={() => setScreen("welcome")} style={{ display: "block", margin: "16px auto 0", background: "none", border: "none", color: tc("#a89070","#6b5030"), fontFamily: "'Lato',sans-serif", fontSize: fs(13), cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, minHeight: 44, padding: "8px 16px" }}>
              ← Back
            </button>
          </div>
        </main>
      )}

      {/* ── ONBOARDING ── */}
      {screen === "onboarding" && (
        <main id="main-content" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "78vh", padding: "40px 24px" }}>
          <div style={{ maxWidth: 720, width: "100%", animation: "fadeUp 0.4s ease forwards" }}>
            {/* Progress dots */}
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 40 }} aria-label={`Question ${onboardStep + 1} of ${ONBOARDING_STEPS.length}`}>
              {ONBOARDING_STEPS.map((_, i) => (
                <div key={i} style={{ width: i === onboardStep ? 24 : 8, height: 8, borderRadius: 4, background: i === onboardStep ? "#b8860b" : i < onboardStep ? "rgba(184,134,11,0.5)" : "rgba(139,94,52,0.18)", transition: "all 0.3s" }} aria-hidden="true" />
              ))}
            </div>

            {/* Question */}
            <h2 style={{ fontSize: fs(30), fontWeight: 600, color: tc("#3d2b1a", "#1a0e00"), textAlign: "center", marginBottom: 10, lineHeight: 1.3 }}>
              {currentStep.question}
            </h2>
            <p style={{ fontSize: fs(15), color: tc("#7a6040", "#4a3020"), fontFamily: "'Lato',sans-serif", textAlign: "center", marginBottom: 32, lineHeight: 1.65 }}>
              {currentStep.subtext}
            </p>

            {/* Scale input */}
            {currentStep.type === "scale" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }} role="group" aria-label="Faith scale options">
                {currentStep.options.map(opt => (
                  <button key={opt.value} className="ob-scale"
                    onClick={() => setOnboardScale(opt.value)}
                    aria-pressed={onboardScale === opt.value}
                    style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 20px", borderRadius: 12, border: `${highContrast ? 3 : 2}px solid ${onboardScale === opt.value ? "#b8860b" : highContrast ? "#9a7a50" : "rgba(180,140,80,0.25)"}`, background: onboardScale === opt.value ? (highContrast ? "#fff8ee" : "#fffdf5") : "white", cursor: "pointer", textAlign: "left", minHeight: 56 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", border: `2px solid ${onboardScale === opt.value ? "#b8860b" : "rgba(180,140,80,0.4)"}`, background: onboardScale === opt.value ? "#b8860b" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} aria-hidden="true">
                      {onboardScale === opt.value && <svg width="11" height="11" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="#fdf6ec" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <div>
                      <div style={{ fontSize: fs(16), fontWeight: 600, color: tc("#3d2b1a", "#1a0e00") }}>{opt.label}</div>
                      <div style={{ fontSize: fs(13), color: tc("#7a6040", "#4a3020"), fontFamily: "'Lato',sans-serif", marginTop: 2 }}>{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Chips + optional text */}
            {currentStep.type === "chips_text" && (
              <div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16, justifyContent: "center" }} role="group" aria-label="Audience options">
                  {currentStep.chips.map(chip => (
                    <button key={chip} className="ob-chip"
                      onClick={() => setOnboardInput(onboardInput === chip ? "" : chip)}
                      aria-pressed={onboardInput === chip}
                      style={{ padding: "10px 20px", borderRadius: 100, border: `${highContrast ? 2 : 1.5}px solid ${onboardInput === chip ? "#b8860b" : highContrast ? "#9a7a50" : "rgba(180,140,80,0.3)"}`, background: onboardInput === chip ? (highContrast ? "#fff8ee" : "rgba(184,134,11,0.1)") : "white", fontSize: fs(15), color: tc("#5c3d1e", "#2a1000"), fontFamily: "'Lato',sans-serif", cursor: "pointer" }}>
                      {chip}
                    </button>
                  ))}
                </div>
                <div style={{ position: "relative" }}>
                  <label htmlFor="ob-text-input" style={{ position: "absolute", left: -9999, width: 1 }}>Custom answer</label>
                  <input id="ob-text-input" value={onboardInput} onChange={e => setOnboardInput(e.target.value)}
                    placeholder={currentStep.placeholder}
                    style={{ width: "100%", border: `${highContrast ? 2 : 1.5}px solid ${highContrast ? "#7a5c3a" : "rgba(180,140,80,0.3)"}`, borderRadius: 10, padding: "14px 18px", fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(17), color: tc("#3d2b1a", "#1a0e00"), background: "#fffdf5", outline: "none", minHeight: 52 }} />
                </div>
              </div>
            )}

            {/* Multi chips */}
            {currentStep.type === "multi_chips" && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }} role="group" aria-label="Personality traits">
                {currentStep.chips.map(chip => {
                  const selected = onboardSelected.includes(chip);
                  return (
                    <button key={chip} className="ob-chip"
                      onClick={() => toggleMultiChip(chip)}
                      aria-pressed={selected}
                      style={{ padding: "10px 20px", borderRadius: 100, border: `${highContrast ? 2 : 1.5}px solid ${selected ? "#b8860b" : highContrast ? "#9a7a50" : "rgba(180,140,80,0.3)"}`, background: selected ? (highContrast ? "#fff8ee" : "rgba(184,134,11,0.1)") : "white", fontSize: fs(15), color: tc("#5c3d1e", "#2a1000"), fontFamily: "'Lato',sans-serif", cursor: "pointer" }}>
                      {selected && <span aria-hidden="true" style={{ marginRight: 6, color: "#b8860b" }}>✓</span>}{chip}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Free text */}
            {currentStep.type === "text" && (
              <div>
                <label htmlFor="ob-free-input" style={{ position: "absolute", left: -9999, width: 1 }}>Your answer</label>
                <textarea id="ob-free-input" value={onboardInput} onChange={e => setOnboardInput(e.target.value)}
                  placeholder={currentStep.placeholder} rows={3}
                  style={{ width: "100%", border: `${highContrast ? 2 : 1.5}px solid ${highContrast ? "#7a5c3a" : "rgba(180,140,80,0.3)"}`, borderRadius: 10, padding: "14px 18px", fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(17), color: tc("#3d2b1a", "#1a0e00"), background: "#fffdf5", outline: "none", resize: "vertical", lineHeight: 1.7, minHeight: 100 }} />
              </div>
            )}

            {/* Navigation */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginTop: 32 }}>
              <button onClick={advanceOnboarding} disabled={!canAdvance()}
                className="start-btn"
                style={{ background: "linear-gradient(135deg,#5c3d1e,#8b5e34)", color: "#fdf6ec", border: "none", padding: "16px 52px", borderRadius: 100, fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(18), letterSpacing: 1, cursor: canAdvance() ? "pointer" : "not-allowed", opacity: canAdvance() ? 1 : 0.4, minHeight: 56 }}>
                {onboardStep < ONBOARDING_STEPS.length - 1 ? "Continue →" : "Meet My Guide ✦"}
              </button>
              {currentStep.optional && (
                <button onClick={advanceOnboarding} style={{ background: "none", border: "none", color: tc("#8b7355", "#5c3d1e"), fontFamily: "'Lato',sans-serif", fontSize: fs(13), cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, minHeight: 44, padding: "8px 16px" }}>
                  Skip this question
                </button>
              )}
              {onboardStep > 0 && (
                <button onClick={() => { setOnboardStep(s => s - 1); setOnboardInput(""); setOnboardSelected([]); setOnboardScale(null); }}
                  style={{ background: "none", border: "none", color: tc("#a89070", "#6b5030"), fontFamily: "'Lato',sans-serif", fontSize: fs(13), cursor: "pointer", minHeight: 44, padding: "8px 16px" }}>
                  ← Back
                </button>
              )}
            </div>
          </div>
        </main>
      )}

      {/* ── PERSONA REVEAL ── */}
      {screen === "reveal" && persona && (
        <main id="main-content" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "78vh", textAlign: "center", padding: "40px 24px", animation: "fadeIn 0.6s ease forwards" }}>
          <div style={{ maxWidth: 680, width: "100%" }}>
            <p style={{ fontSize: fs(12), letterSpacing: "2.5px", textTransform: "uppercase", color: tc("#8b7355", "#4a3020"), fontFamily: "'Lato',sans-serif", marginBottom: 28 }}>Your guide is ready</p>
            <div style={{ width: 100, height: 100, borderRadius: "50%", background: personaAvatarBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, margin: "0 auto 24px", boxShadow: "0 8px 32px rgba(93,61,26,0.2)", animation: "revealGlow 2s ease-in-out" }} aria-hidden="true">
              {personaAvatar}
            </div>
            <h1 style={{ fontSize: fs(42), fontWeight: 300, color: tc("#3d2b1a", "#1a0e00"), fontStyle: "italic", marginBottom: 8 }}>Meet {persona.name}</h1>
            <p style={{ fontSize: fs(15), color: tc("#8b7355", "#4a3020"), fontFamily: "'Lato',sans-serif", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 28 }}>{persona.role}</p>

            {/* Grace intro video */}
            <div style={{ marginBottom: 32, borderRadius: 16, overflow: "hidden", boxShadow: "0 12px 48px rgba(93,61,26,0.2)", border: "1px solid rgba(180,140,80,0.2)", background: "#1a0f05" }}>
              <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
                <iframe
                  src="https://app.heygen.com/embeds/1c6b4714cfc949a8b94bd542cc88f614"
                  title="A message from Grace"
                  frameBorder="0"
                  allow="encrypted-media; fullscreen;"
                  allowFullScreen
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
                />
              </div>
              <div style={{ padding: "10px 16px", background: "rgba(61,43,26,0.6)" }}>
                <p style={{ fontSize: fs(12), color: "rgba(245,232,204,0.6)", fontFamily: "'Lato',sans-serif", fontStyle: "italic", margin: 0 }}>A personal message from Grace before you begin</p>
              </div>
            </div>

            <p style={{ fontSize: fs(18), color: tc("#5c4a35", "#2a1a0a"), lineHeight: 1.85, fontStyle: "italic", marginBottom: 16 }}>
              {`${persona.name} is your faith-centered writing companion. She listens deeply, honors what you share, and helps shape your story with warmth and reverence.`}
            </p>
            <p style={{ fontSize: fs(15), color: tc("#8b7355", "#5c3d1e"), fontFamily: "'Lato',sans-serif", marginBottom: 40, lineHeight: 1.7 }}>
              {persona.tagline}
            </p>
            <button className="start-btn" onClick={() => setScreen("setup")}
              style={{ background: personaAvatarBg, color: "#fdf6ec", border: "none", padding: "18px 52px", borderRadius: 100, fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(19), letterSpacing: 1, cursor: "pointer", boxShadow: "0 4px 24px rgba(93,61,26,0.25)", minHeight: 58 }}>
              Continue with {persona.name} ✦
            </button>
          </div>
        </main>
      )}

      {/* ── BOOK SIZE ── */}
      {/* ── CHAPTER SETUP ── */}
      {screen === "setup" && (
        <main id="main-content" style={{ maxWidth: 680, margin: "0 auto", padding: "44px 24px", width: "100%" }}>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: persona ? personaAvatarBg : "linear-gradient(135deg,#5c3d1e,#8b5e34)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 16px" }} aria-hidden="true">
              {personaAvatar}
            </div>
            <p style={{ fontSize: fs(12), letterSpacing: "2.5px", textTransform: "uppercase", color: "#b8860b", fontFamily: "'Lato',sans-serif", marginBottom: 10 }}>Your book is ready to begin</p>
            <h1 style={{ fontSize: fs(32), fontWeight: 300, color: tc("#3d2b1a","#1a0e00"), fontStyle: "italic", marginBottom: 10, lineHeight: 1.3 }}>
              Here's what {persona?.name || "Grace"} will cover with you
            </h1>
            <p style={{ fontSize: fs(16), color: tc("#6b5540","#3a2510"), fontFamily: "'Lato',sans-serif", lineHeight: 1.7, maxWidth: 480, margin: "0 auto" }}>
              {persona?.name || "Grace"} will guide you through each section at your own pace — and you can always skip a section when you get there if it doesn't feel right for your story.
            </p>
          </div>

          {/* Begin button — top */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <button className="start-btn" onClick={startChat}
              style={{ background: persona ? personaAvatarBg : "linear-gradient(135deg,#5c3d1e,#8b5e34)", color: "#fdf6ec", border: "none", padding: "18px 52px", borderRadius: 100, fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(20), letterSpacing: 1, cursor: "pointer", boxShadow: "0 6px 24px rgba(93,61,26,0.25)", minHeight: 60, transition: "all 0.2s" }}>
              Begin My Interview with {persona?.name || "Grace"} ✦
            </button>
          </div>

          {/* Section preview list — display only, not interactive */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }} aria-label="Your book sections">
            {BASE_CHAPTERS.map((ch, idx) => {
              // Auto-hide faith if user said "Not really" in onboarding
              const faithAnswer = onboardAnswers.faith || "";
              if (ch.id === "faith" && faithAnswer === "Not really") return null;
              return (
                <div key={ch.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", background: "white", borderRadius: 12, border: "1px solid rgba(180,140,80,0.18)", boxShadow: "0 2px 8px rgba(93,61,26,0.05)" }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,rgba(184,134,11,0.15),rgba(184,134,11,0.08))", border: "1.5px solid rgba(184,134,11,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: fs(11), fontWeight: 700, color: "#b8860b", fontFamily: "'Lato',sans-serif", flexShrink: 0 }}>
                    {idx + 1}
                  </div>
                  <div style={{ fontSize: 22, width: 28, textAlign: "center", flexShrink: 0 }} aria-hidden="true">{ch.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: fs(15), fontWeight: 600, color: tc("#3d2b1a","#1a0e00") }}>{ch.title}</div>
                    <div style={{ fontSize: fs(13), color: tc("#7a6040","#4a3020"), fontFamily: "'Lato',sans-serif", marginTop: 2 }}>{ch.description}</div>
                  </div>
                  <div style={{ fontSize: fs(11), color: "#b8860b", fontFamily: "'Lato',sans-serif", flexShrink: 0 }}>✦</div>
                </div>
              );
            })}

            {/* Custom chapter if added */}
            {customChapter && (
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", background: "#fffdf5", borderRadius: 12, border: "2px solid rgba(184,134,11,0.35)" }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#b8860b,#d4a843)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>✨</div>
                <div style={{ fontSize: 22, width: 28, textAlign: "center", flexShrink: 0 }}>{customChapter.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: fs(15), fontWeight: 600, color: tc("#3d2b1a","#1a0e00") }}>{customChapter.title}</div>
                  <div style={{ fontSize: fs(13), color: "#b8860b", fontFamily: "'Lato',sans-serif", marginTop: 2 }}>Your custom section · {customChapter.prompts.length} prompts</div>
                </div>
                <button onClick={() => { setCustomChapter(null); setCustomInput(""); }} aria-label="Remove custom section"
                  style={{ background: "none", border: "1.5px solid rgba(180,140,80,0.3)", color: "#7a5c3a", cursor: "pointer", fontSize: 16, minWidth: 32, minHeight: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
              </div>
            )}
          </div>

          {/* Add your own section */}
          <div style={{ background: "white", borderRadius: 12, border: `1.5px dashed rgba(180,140,80,0.4)`, padding: "20px 22px", marginBottom: 32 }}>
            <h2 style={{ fontSize: fs(15), fontWeight: 600, color: tc("#5c3d1e","#2a1000"), marginBottom: 6 }}>✦ Add Your Own Section</h2>
            <p style={{ fontSize: fs(13), color: tc("#7a6040","#4a3020"), fontFamily: "'Lato',sans-serif", marginBottom: 14, lineHeight: 1.65 }}>
              Have a story that deserves its own section? Name it and {persona?.name || "Grace"} will craft the perfect questions instantly.
            </p>
            {!customChapter ? (
              <>
                <div style={{ display: "flex", gap: 10 }}>
                  <label htmlFor="custom-section-input" style={{ position: "absolute", left: -9999, width: 1 }}>Custom section name</label>
                  <input id="custom-section-input" value={customInput} onChange={e => setCustomInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && generateCustomPrompts(customInput)}
                    placeholder="e.g. My Military Service, Our Immigration Story..."
                    style={{ flex: 1, border: `1.5px solid rgba(180,140,80,0.3)`, borderRadius: 8, padding: "11px 14px", fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(16), color: tc("#3d2b1a","#1a0e00"), background: "#fffdf5", outline: "none", minHeight: 46 }} />
                  <button className="gen-btn" onClick={() => generateCustomPrompts(customInput)} disabled={!customInput.trim() || generatingPrompts}
                    style={{ background: "linear-gradient(135deg,#5c3d1e,#8b5e34)", color: "#fdf6ec", border: "none", padding: "11px 20px", borderRadius: 8, fontFamily: "'Lato',sans-serif", fontSize: fs(13), fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", opacity: (!customInput.trim() || generatingPrompts) ? 0.45 : 1, minHeight: 46 }}>
                    {generatingPrompts ? "Crafting…" : "Generate ✦"}
                  </button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                  {SUGGESTION_CHAPTERS.map(s => (
                    <button key={s.title} className="chip" onClick={() => { setCustomInput(s.title); generateCustomPrompts(s.title); }}
                      style={{ padding: "8px 14px", borderRadius: 100, background: "#f5ede0", border: "1px solid rgba(180,140,80,0.25)", fontSize: fs(13), color: tc("#5c3d1e","#2a1000"), fontFamily: "'Lato',sans-serif", cursor: "pointer", minHeight: 40 }}>
                      {s.icon} {s.title}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p style={{ fontSize: fs(13), color: "#b8860b", fontFamily: "'Lato',sans-serif", fontStyle: "italic" }}>
                ✦ {customChapter.title} added above — it will be included in your book
              </p>
            )}
          </div>

          {/* Begin button — bottom */}
          <div style={{ textAlign: "center" }}>
            <button className="start-btn" onClick={startChat}
              style={{ background: persona ? personaAvatarBg : "linear-gradient(135deg,#5c3d1e,#8b5e34)", color: "#fdf6ec", border: "none", padding: "18px 52px", borderRadius: 100, fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(20), letterSpacing: 1, cursor: "pointer", boxShadow: "0 6px 24px rgba(93,61,26,0.25)", minHeight: 60, transition: "all 0.2s" }}>
              Begin My Interview with {persona?.name || "Grace"} ✦
            </button>
            <p style={{ fontSize: fs(13), color: tc("#a89070","#6b5030"), fontFamily: "'Lato',sans-serif", marginTop: 12, fontStyle: "italic" }}>
              You can skip any section during your conversation with {persona?.name || "Grace"}
            </p>
          </div>

        </main>
      )}

      {/* ── CHAPTER PREVIEW ── */}
      {screen === "chat" && previewChapter && !showPaywall && !showBetweenSections && !bookComplete && (
        <ChapterPreview
          chapterIndex={previewChapter.chapterIndex}
          chapter={previewChapter.chapter}
          chapterMessages={chapterHistory[previewChapter.chapter.id || previewChapter.chapter.title] || messages}
          chapterPhotos={photos[previewChapter.chapter.id || previewChapter.chapter.title] || []}
          onContinue={continueFromPreview} onAddMore={addMoreToChapter}
          nextChapterTitle={chapters[previewChapter.chapterIndex + 1]?.title}
          isLast={previewChapter.chapterIndex >= chapters.length - 1}
          fs={fs} tc={tc} highContrast={highContrast}
          promoCode={promoCode} promoInfo={promoInfo}
          narrative={chapterNarratives[previewChapter.chapter.id || previewChapter.chapter.title]}
          generatingNarrative={generatingNarrative}
          personaAvatarBg={personaAvatarBg} personaAvatar={personaAvatar}
          userEmail={user?.email} userName={`${user?.firstName || ""} ${user?.lastName || ""}`.trim()} />
      )}

      {/* ── PAYWALL ── */}
      {/* Between sections — coaching moment */}
      {/* ── SECTION INTRO ── */}
      {screen === "sectionintro" && sectionIntroChapter && (() => {
        const { chapter, nextC } = sectionIntroChapter;
        const chapterVideos = {
          "early-life": "4184003e4d2943b0b7c7489136f42e31",
          "becoming-you": "e6499e21f45f4dd09adedb0b58e4b595",
          "faith": "9d7bf4bb7654418593406ddb3bc42093",
          "family-love": "44e503c5182b4cb39f7330b3e9be70a5",
          "wisdom": "48986e0d7d68415faa4c19e9ac8220dd",
        };
        const chapterScope = {
          "early-life": "This section is simply about where you came from — where you were born, what home felt like, your parents, and your earliest memories. Nothing else.",
          "becoming-you": "This section is about early adulthood — school, your first job, the choices and turning points that shaped the person you became. That's it.",
          "family-love": "This section is about the people closest to your heart — how you met your spouse, your children, your home, and the love that defined your life.",
          "faith": "This section is about your spiritual life — your church, your prayers, the moments you felt God closest, and the faith you want to pass on.",
          "wisdom": "This section is simply about what you've learned — the lessons life taught you, what you'd tell your younger self, and what you want remembered.",
        };
        const scope = chapterScope[chapter?.id] || chapter.description;
        const videoId = chapterVideos[chapter?.id];
        return (
          <main id="main-content" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "92vh", padding: "48px 32px", background: "linear-gradient(160deg,#fdf6ec 0%,#f5ede0 60%,#ede4d5 100%)", textAlign: "center", animation: "fadeUp 0.4s ease forwards" }}>

            {/* Section label */}
            <p style={{ fontSize: fs(12), letterSpacing: "3px", textTransform: "uppercase", color: "#b8860b", fontFamily: "'Lato',sans-serif", marginBottom: 16 }}>
              Section {nextC + 1} of {chapters.length}
            </p>

            {/* Icon + Title */}
            <div style={{ fontSize: 52, marginBottom: 12 }} aria-hidden="true">{chapter.icon}</div>
            <h1 style={{ fontSize: fs(48), fontWeight: 300, color: tc("#3d2b1a","#1a0e00"), fontStyle: "italic", marginBottom: 16, lineHeight: 1.2 }}>
              {chapter.title}
            </h1>

            {/* Clear scope — what belongs here */}
            <div style={{ background: "white", borderRadius: 14, padding: "20px 28px", maxWidth: 620, marginBottom: 16, border: "1px solid rgba(180,140,80,0.2)", boxShadow: "0 4px 20px rgba(93,61,26,0.07)" }}>
              <p style={{ fontSize: fs(18), color: tc("#5c4a35","#2a1a0a"), lineHeight: 1.8, fontStyle: "italic", fontFamily: "'Cormorant Garamond',serif" }}>
                {scope}
              </p>
              <p style={{ fontSize: fs(14), color: tc("#8b7355","#5c3d1e"), fontFamily: "'Lato',sans-serif", marginTop: 12, lineHeight: 1.6 }}>
                Don't worry about getting it perfect — just start talking and Grace will help you shape it. Most people finish this section in <strong>15–20 minutes.</strong>
              </p>
            </div>

            {/* Video */}
            {videoId && (
              <div style={{ width: "100%", maxWidth: 780, marginBottom: 40 }}>
                <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 16, overflow: "hidden", boxShadow: "0 16px 56px rgba(93,61,26,0.18)", border: "1px solid rgba(180,140,80,0.2)" }}>
                  <iframe
                    src={`https://app.heygen.com/embeds/${videoId}`}
                    title={`${chapter.title} introduction`}
                    frameBorder="0"
                    allow="encrypted-media; fullscreen; picture-in-picture"
                    allowFullScreen
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                  />
                </div>
              </div>
            )}

            {/* CTA */}
            <button onClick={() => { setSectionIntroChapter(null); setScreen("chat"); }}
              style={{ background: "linear-gradient(135deg,#5c3d1e,#8b5e34)", color: "#fdf6ec", border: "none", padding: "22px 72px", borderRadius: 100, fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(24), letterSpacing: 1, cursor: "pointer", boxShadow: "0 8px 32px rgba(93,61,26,0.28)", minHeight: 70, transition: "all 0.2s" }}>
              I'm Ready — Let's Begin ✦
            </button>

            {/* Save and return note */}
            <p style={{ fontSize: fs(13), color: tc("#a89070","#6b5030"), fontFamily: "'Lato',sans-serif", marginTop: 16, fontStyle: "italic" }}>
              Your progress saves automatically — you can always stop and come back anytime.
            </p>

          </main>
        );
      })()}

      {screen === "chat" && showPaywall && previewChapter && (
        <main id="main-content" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "78vh", padding: "40px 24px", animation: "fadeUp 0.5s ease forwards" }}>
          <div style={{ maxWidth: 680, width: "100%", textAlign: "center" }}>

            {/* Persona avatar */}
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: personaAvatarBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, margin: "0 auto 24px", boxShadow: "0 8px 32px rgba(93,61,26,0.2)" }} aria-hidden="true">
              {personaAvatar}
            </div>

            <p style={{ fontSize: fs(12), letterSpacing: "2.5px", textTransform: "uppercase", color: "#b8860b", fontFamily: "'Lato',sans-serif", marginBottom: 16 }}>Your first section is complete</p>

            <h2 style={{ fontSize: fs(36), fontWeight: 300, color: tc("#3d2b1a","#1a0e00"), fontStyle: "italic", lineHeight: 1.25, marginBottom: 16 }}>
              That was just the beginning.
            </h2>

            <p style={{ fontSize: fs(18), color: tc("#5c4a35","#2a1a0a"), lineHeight: 1.9, fontStyle: "italic", marginBottom: 8 }}>
              {persona?.name || "Your guide"} is ready to walk with you through the rest of your story — your faith, your family, your love, and the wisdom you've earned.
            </p>
            <p style={{ fontSize: fs(16), color: tc("#7a6040","#4a3020"), lineHeight: 1.8, marginBottom: 36 }}>
              Everything you write will be preserved in a beautifully formatted book — yours to keep forever, and to give to the people you love.
            </p>

            {/* What's included */}
            <div style={{ background: "white", borderRadius: 16, border: "1.5px solid rgba(180,140,80,0.2)", padding: "24px 28px", marginBottom: 28, textAlign: "left", boxShadow: "0 4px 20px rgba(93,61,26,0.07)" }}>
              <div style={{ fontSize: fs(12), letterSpacing: "2px", textTransform: "uppercase", color: "#b8860b", fontFamily: "'Lato',sans-serif", marginBottom: 16, textAlign: "center" }}>What you get for $99</div>
              {[
                ["📄", "Your complete book as a beautiful PDF", "Download instantly and share with your whole family — forever"],
                ["✦", "All remaining sections with " + (persona?.name || "your guide"), "Faith, Family, Becoming You, Wisdom & Legacy"],
                ["🔒", "Saved forever to your account", "Come back anytime on any device — your story waits for you"],
                ["📖", "Option to add a printed copy", "Professionally bound books from $79, ordered any time"],
              ].map(([icon, title, sub]) => (
                <div key={title} style={{ display: "flex", gap: 14, marginBottom: 16, alignItems: "flex-start" }}>
                  <div style={{ fontSize: 18, width: 28, flexShrink: 0, marginTop: 2 }} aria-hidden="true">{icon}</div>
                  <div>
                    <div style={{ fontSize: fs(15), fontWeight: 600, color: tc("#3d2b1a","#1a0e00") }}>{title}</div>
                    <div style={{ fontSize: fs(13), color: tc("#7a6040","#4a3020"), fontFamily: "'Lato',sans-serif", marginTop: 2 }}>{sub}</div>
                  </div>
                </div>
              ))}

              {promoInfo?.discount > 0 && (
                <div style={{ marginTop: 8, padding: "10px 14px", background: "rgba(184,134,11,0.08)", borderRadius: 8, border: "1px solid rgba(184,134,11,0.2)", display: "flex", alignItems: "center", gap: 8 }}>
                  <span aria-hidden="true">🏷️</span>
                  <span style={{ fontSize: fs(13), color: tc("#5c3d1e","#2a1000"), fontFamily: "'Lato',sans-serif" }}>
                    Code <strong>{promoCode}</strong> gives you {Math.round(promoInfo.discount * 100)}% off — but doesn't apply to the $99 access fee
                  </span>
                </div>
              )}
            </div>

            {/* Book preference selector */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: fs(13), fontWeight: 600, color: tc("#7a5c3a","#4a3020"), fontFamily: "'Lato',sans-serif", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 14, textAlign: "center" }}>Choose your format</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }} role="group" aria-label="Book format options">
                {[
                  { id: "pdf", icon: "📄", label: "PDF Book Only", sub: "Download instantly, share with your whole family", price: 99 },
                  { id: "print1", icon: "📖", label: "PDF + 1 Printed Copy", sub: "Professionally bound hardcover, delivered to your door", price: 178 },
                  { id: "print2", icon: "📚", label: "PDF + 2 Printed Copies", sub: "One to keep, one to give", price: 228 },
                ].map(opt => (
                  <button key={opt.id} onClick={() => setPaywallBookChoice(opt.id)}
                    aria-pressed={paywallBookChoice === opt.id}
                    style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 10, border: `2px solid ${paywallBookChoice === opt.id ? "#b8860b" : "rgba(180,140,80,0.22)"}`, background: paywallBookChoice === opt.id ? "#fffdf5" : "white", cursor: "pointer", textAlign: "left", minHeight: 62 }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", border: `2px solid ${paywallBookChoice === opt.id ? "#b8860b" : "rgba(180,140,80,0.35)"}`, background: paywallBookChoice === opt.id ? "#b8860b" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {paywallBookChoice === opt.id
                        ? <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="#fdf6ec" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        : <span style={{ fontSize: 16 }}>{opt.icon}</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: fs(15), fontWeight: 600, color: tc("#3d2b1a","#1a0e00") }}>{opt.label}</div>
                      <div style={{ fontSize: fs(12), color: tc("#7a6040","#4a3020"), fontFamily: "'Lato',sans-serif", marginTop: 2 }}>{opt.sub}</div>
                    </div>
                    <div style={{ fontSize: fs(20), fontWeight: 600, color: paywallBookChoice === opt.id ? "#b8860b" : tc("#3d2b1a","#1a0e00"), flexShrink: 0 }}>${opt.price}</div>
                  </button>
                ))}
              </div>
              {paywallBookChoice !== "pdf" && (
                <p style={{ fontSize: fs(12), color: tc("#8b7355","#5c3d1e"), fontFamily: "'Lato',sans-serif", textAlign: "center", marginTop: 10, fontStyle: "italic" }}>
                  We'll collect your shipping address after payment
                </p>
              )}
            </div>

            {/* CTA */}
            <button onClick={handlePayment}
              style={{ width: "100%", background: "linear-gradient(135deg,#5c3d1e,#8b5e34)", color: "#fdf6ec", border: "none", padding: "20px", borderRadius: 100, fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(20), letterSpacing: 1, cursor: "pointer", boxShadow: "0 6px 28px rgba(93,61,26,0.3)", marginBottom: 14, minHeight: 62, transition: "all 0.2s" }}
              onMouseEnter={e => { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 10px 36px rgba(93,61,26,0.38)"; }}
              onMouseLeave={e => { e.target.style.transform = ""; e.target.style.boxShadow = "0 6px 28px rgba(93,61,26,0.3)"; }}>
              Continue My Story — ${paywallBookChoice === "pdf" ? 99 : paywallBookChoice === "print1" ? 178 : 228} ✦
            </button>

            {/* Trust signals */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 18 }}>
              {[["🔒","Secure checkout"],["💳","All major cards"],["↩️","Your story stays saved"]].map(([icon, label]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 13 }} aria-hidden="true">{icon}</span>
                  <span style={{ fontSize: fs(11), color: tc("#a89070","#6b5030"), fontFamily: "'Lato',sans-serif" }}>{label}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: fs(11), color: tc("#b0a090","#7a6030"), fontFamily: "'Lato',sans-serif", lineHeight: 1.6, marginBottom: 20, textAlign: "center" }}>
              Powered by Stripe · No subscription · Cancel print orders any time before printing
            </p>

            {/* Go back link */}
            <button onClick={() => setShowPaywall(false)}
              style={{ background: "none", border: "none", color: tc("#a89070","#6b5030"), fontFamily: "'Lato',sans-serif", fontSize: fs(13), cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, minHeight: 44, padding: "8px 16px" }}>
              ← Go back and review your chapter
            </button>
          </div>
        </main>
      )}

      {/* ── POST-PAYMENT PRINT ORDER ── */}
      {showPrintOrderAfterPay && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(61,43,26,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "white", borderRadius: 20, padding: "36px 32px", maxWidth: 620, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", animation: "fadeUp 0.3s ease forwards" }}>
            {printShipDone ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📖</div>
                <h2 style={{ fontSize: fs(26), fontWeight: 300, color: tc("#3d2b1a","#1a0e00"), fontStyle: "italic", marginBottom: 12 }}>Print order received!</h2>
                <p style={{ fontSize: fs(15), color: tc("#6b5540","#3a2510"), fontFamily: "'Lato',sans-serif", lineHeight: 1.7, marginBottom: 24 }}>
                  We'll be in touch to confirm your shipping details. Now let's continue your story. 🕊️
                </p>
                <button onClick={() => { setShowPrintOrderAfterPay(false); }}
                  style={{ background: "linear-gradient(135deg,#5c3d1e,#8b5e34)", color: "#fdf6ec", border: "none", padding: "14px 36px", borderRadius: 100, fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(18), cursor: "pointer", minHeight: 50 }}>
                  Continue My Story ✦
                </button>
              </div>
            ) : (
              <>
                <div style={{ textAlign: "center", marginBottom: 24 }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>📖</div>
                  <h2 style={{ fontSize: fs(24), fontWeight: 300, color: tc("#3d2b1a","#1a0e00"), fontStyle: "italic", marginBottom: 6 }}>
                    {paywallBookChoice === "print2" ? "2 printed copies — where should we send them?" : "Where should we send your printed book?"}
                  </h2>
                  <p style={{ fontSize: fs(13), color: tc("#8b7355","#5c3d1e"), fontFamily: "'Lato',sans-serif" }}>
                    {paywallBookChoice === "print1" ? "1 printed copy included" : "2 printed copies included"}
                  </p>
                </div>

                {/* Ship to choice */}
                <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                  {[["me","Ship to me — I'll deliver it"],["recipient","Ship directly to recipient"]].map(([val, label]) => (
                    <button key={val} onClick={() => setPrintShipChoice(val)}
                      style={{ flex: 1, padding: "12px 10px", borderRadius: 10, border: `2px solid ${printShipChoice === val ? "#b8860b" : "rgba(180,140,80,0.3)"}`, background: printShipChoice === val ? "#fffdf5" : "white", cursor: "pointer", fontSize: fs(13), color: tc("#3d2b1a","#1a0e00"), fontFamily: "'Lato',sans-serif", fontWeight: printShipChoice === val ? 600 : 400, lineHeight: 1.4 }}>
                      {label}
                    </button>
                  ))}
                </div>

                {/* Address fields */}
                {[["name","Full Name"],["address","Street Address"],["city","City"],["state","State"],["zip","ZIP Code"]].map(([key, label]) => (
                  <div key={key} style={{ marginBottom: 10 }}>
                    <label style={{ display: "block", fontSize: fs(11), color: tc("#7a5c3a","#4a3020"), fontFamily: "'Lato',sans-serif", fontWeight: 600, marginBottom: 4 }}>{label}</label>
                    <input type="text" value={printShipFields[key]} onChange={e => setPrintShipFields(p => ({ ...p, [key]: e.target.value }))}
                      style={{ width: "100%", border: "1.5px solid rgba(180,140,80,0.3)", borderRadius: 8, padding: "10px 12px", fontFamily: "'Lato',sans-serif", fontSize: fs(14), color: tc("#3d2b1a","#1a0e00"), background: "#fffdf5", outline: "none", boxSizing: "border-box", minHeight: 44 }} />
                  </div>
                ))}

                <button onClick={async () => {
                  const { name, address, city, state, zip } = printShipFields;
                  if (!name || !address || !city || !state || !zip) return;
                  setPrintShipLoading(true);
                  try {
                    await fetch("/api/email-print-order", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        userEmail: user?.email,
                        userName: name,
                        option: paywallBookChoice === "print1" ? "1 Printed Copy" : "2 Printed Copies",
                        price: paywallBookChoice === "print1" ? 178 : 228,
                        shipTo: printShipChoice,
                        shipping: printShipFields,
                      }),
                    });
                    setPrintShipDone(true);
                  } catch {}
                  setPrintShipLoading(false);
                }} disabled={printShipLoading}
                  style={{ width: "100%", background: "linear-gradient(135deg,#5c3d1e,#8b5e34)", color: "#fdf6ec", border: "none", padding: "15px", borderRadius: 100, fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(17), cursor: "pointer", minHeight: 52, marginTop: 8 }}>
                  {printShipLoading ? "Submitting…" : "Submit Shipping Details ✦"}
                </button>
                <button onClick={() => setShowPrintOrderAfterPay(false)}
                  style={{ display: "block", width: "100%", marginTop: 10, background: "none", border: "none", color: tc("#a89070","#6b5030"), fontFamily: "'Lato',sans-serif", fontSize: fs(13), cursor: "pointer", textDecoration: "underline", minHeight: 36 }}>
                  Skip for now — I'll do this later
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── CHAT ── */}
      {/* ── BOOK COMPLETE ── */}
      {screen === "chat" && bookComplete && (
        <main id="main-content" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "78vh", padding: "40px 24px", animation: "fadeUp 0.5s ease forwards" }}>
          <div style={{ maxWidth: 720, width: "100%", textAlign: "center" }}>

            <div style={{ fontSize: 64, marginBottom: 24, animation: "pulse 2s ease-in-out infinite" }} aria-hidden="true">🕊️</div>
            <p style={{ fontSize: fs(12), letterSpacing: "3px", textTransform: "uppercase", color: "#b8860b", fontFamily: "'Lato',sans-serif", marginBottom: 16 }}>Your legacy is complete</p>
            <h1 style={{ fontSize: fs(44), fontWeight: 300, color: tc("#3d2b1a","#1a0e00"), fontStyle: "italic", lineHeight: 1.2, marginBottom: 20 }}>
              {user?.firstName}, your book is ready.
            </h1>
            <p style={{ fontSize: fs(18), color: tc("#5c4a35","#2a1a0a"), lineHeight: 1.9, fontStyle: "italic", marginBottom: 40, maxWidth: 500, margin: "0 auto 40px" }}>
              Every story you've shared, every memory you've preserved — it's all here. Your family will treasure this for generations.
            </p>

            {/* Share Link */}
            <BookShareCard
              user={user}
              chapters={chapters}
              chapterNarratives={chapterNarratives}
              fs={fs} tc={tc}
              shareUrl={shareUrl}
              setShareUrl={setShareUrl}
            />

            {/* Email book to family */}
            <BookEmailCard
              user={user}
              chapters={chapters}
              chapterNarratives={chapterNarratives}
              fs={fs} tc={tc}
              shareUrl={shareUrl}
            />

            {/* Print upgrade */}
            <div style={{ background: "white", borderRadius: 20, padding: "36px", boxShadow: "0 8px 32px rgba(93,61,26,0.08)", border: "1px solid rgba(180,140,80,0.15)", marginBottom: 24 }}>
              <div style={{ fontSize: 32, marginBottom: 14 }} aria-hidden="true">📚</div>
              <h2 style={{ fontSize: fs(22), fontWeight: 400, color: tc("#3d2b1a","#1a0e00"), marginBottom: 10 }}>Want a Printed Copy?</h2>
              <p style={{ fontSize: fs(15), color: tc("#6b5540","#3a2510"), fontFamily: "'Lato',sans-serif", lineHeight: 1.7, marginBottom: 20 }}>
                Hold your story in your hands. A professionally bound hardcover book, delivered to your door — starting at $79.
              </p>
              <PrintUpgradeCard isLast={true} promoCode={promoCode} promoInfo={promoInfo} fs={fs} tc={tc} highContrast={highContrast} userEmail={user?.email} userName={`${user?.firstName || ""} ${user?.lastName || ""}`.trim()} />
            </div>

            {/* Encouraging copy */}
            <div style={{ background: "rgba(184,134,11,0.06)", border: "1px solid rgba(184,134,11,0.15)", borderRadius: 16, padding: "24px 28px", marginBottom: 24, textAlign: "left" }}>
              <p style={{ fontSize: fs(17), color: tc("#5c4a35","#2a1a0a"), fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", lineHeight: 1.85, margin: 0 }}>
                You did the work. You showed up, you remembered, you shared things you've never put into words before. Small details can always be added — but don't let perfectionism keep this gift from the people who love you. Your family doesn't need a perfect book. They need <em>your</em> book. 🕊️
              </p>
            </div>

            {/* Grace full-book editor */}
            <FullBookEditor
              chapters={chapters}
              chapterNarratives={chapterNarratives}
              setChapterNarratives={setChapterNarratives}
              persona={persona}
              personaAvatarBg={personaAvatarBg}
              personaAvatar={personaAvatar}
              fs={fs} tc={tc}
            />

            {/* Share */}
            <p style={{ fontSize: fs(15), color: tc("#8b7355","#5c3d1e"), fontFamily: "'Lato',sans-serif", lineHeight: 1.7, fontStyle: "italic", marginTop: 24 }}>
              Thank you for trusting us with your legacy, {user?.firstName}. 🕊️
            </p>
          </div>
        </main>
      )}

      {screen === "chat" && !previewChapter && !showPaywall && !bookComplete && chapter && (
        <div style={{ display: "flex", flex: 1, flexDirection: "column", width: "100%", padding: "0" }}>

          {/* ── TOP SECTION NAVIGATION BAR ── */}
          <nav aria-label="Section navigation" style={{ background: "white", borderBottom: "2px solid rgba(180,140,80,0.15)", padding: "16px 32px", overflowX: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minWidth: "fit-content", margin: "0 auto" }}>
              {chapters.map((ch, idx) => {
                const isDone = idx < activeChapter || bookComplete;
                const isCurrent = idx === activeChapter && !bookComplete;
                const isLocked = idx > activeChapter && !bookComplete;
                return (
                  <div key={ch.id || ch.title} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      aria-current={isCurrent ? "step" : undefined}
                      onClick={() => {
                        if (isDone) {
                          setBookComplete(false);
                          setActiveChapter(idx);
                          setMessages(chapterHistory[ch.id || ch.title] || []);
                          setPreviewChapter(null);
                          setChapterContext(buildChapterContext(ch));
                          setShowRecapButton(false);
                        }
                      }}
                      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: isDone ? "pointer" : "default", opacity: isLocked ? 0.35 : 1, minWidth: 90 }}>
                      {/* Circle */}
                      <div style={{ width: 44, height: 44, borderRadius: "50%", background: isDone ? "#5c3d1e" : isCurrent ? "linear-gradient(135deg,#b8860b,#d4a843)" : "rgba(180,140,80,0.12)", border: isCurrent ? "none" : isDone ? "none" : "2px solid rgba(180,140,80,0.3)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", boxShadow: isCurrent ? "0 4px 14px rgba(184,134,11,0.35)" : "none" }}>
                        {isDone
                          ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="#fdf6ec" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          : <span style={{ fontSize: 18 }}>{ch.icon}</span>
                        }
                      </div>
                      {/* Label */}
                      <span style={{ fontSize: fs(12), fontFamily: "'Lato',sans-serif", fontWeight: isCurrent ? 700 : isDone ? 400 : 400, color: isCurrent ? "#b8860b" : isDone ? "#8b7355" : tc("#6b5030","#4a3020"), textAlign: "center", lineHeight: 1.3, textDecoration: isDone ? "line-through" : "none", textDecorationColor: "rgba(139,94,52,0.4)" }}>{ch.title}</span>
                    </div>
                    {/* Connector line between steps */}
                    {idx < chapters.length - 1 && (
                      <div style={{ width: 32, height: 2, background: idx < activeChapter ? "#5c3d1e" : "rgba(180,140,80,0.2)", borderRadius: 2, marginBottom: 22 }} />
                    )}
                  </div>
                );
              })}
              {/* Your Book final step */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 32, height: 2, background: bookComplete ? "#5c3d1e" : "rgba(180,140,80,0.2)", borderRadius: 2, marginBottom: 22 }} />
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, minWidth: 80, opacity: bookComplete ? 1 : 0.25 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: bookComplete ? "linear-gradient(135deg,#b8860b,#d4a843)" : "rgba(180,140,80,0.12)", border: bookComplete ? "none" : "2px solid rgba(180,140,80,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 18 }}>📖</span>
                  </div>
                  <span style={{ fontSize: fs(12), fontFamily: "'Lato',sans-serif", fontWeight: bookComplete ? 700 : 400, color: bookComplete ? "#b8860b" : tc("#6b5030","#4a3020"), textAlign: "center" }}>Your Book</span>
                </div>
              </div>
            </div>
          </nav>
          {/* ── SPLIT SCREEN: Left = Grace, Right = Topic Framework ── */}
          <div style={{ display: "flex", flex: 1, minHeight: 0 }}>

            {/* ── LEFT: Grace conversation ── */}
            <main id="main-content" style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px 24px 12px", minWidth: 0 }}>

              {/* Section title + ? button */}
              <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 22 }}>{chapter.icon}</span>
                  <h2 style={{ fontSize: fs(22), fontWeight: 600, color: tc("#3d2b1a", "#1a0e00") }}>{chapter.title}</h2>
                </div>
                <button onClick={replayTutorial} title="Show me how this works"
                  style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(184,134,11,0.1)", border: "1.5px solid rgba(184,134,11,0.3)", color: "#b8860b", fontFamily: "'Lato',sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  ?
                </button>
              </div>

              {/* Book complete celebration video */}
              {messages.some(m => m.content?.includes("extraordinary")) && (
                <div style={{ marginBottom: 14, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(180,140,80,0.2)", background: "#000", position: "relative", paddingBottom: "56.25%", height: 0, flexShrink: 0 }}>
                  <iframe src="https://app.heygen.com/embeds/24c71acaec054add8b55ae4053297433" title="Your legacy is complete" frameBorder="0" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }} />
                </div>
              )}

              {/* Messages — flow naturally down the page, no scroll trap */}
              <div role="log" aria-label="Conversation" aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 8 }}>
                {(currentTopicMessages.length > 0 ? currentTopicMessages : messages).map((msg, i) => (
                  <div key={i}>
                    <div style={{ display: "flex", gap: 10, flexDirection: msg.role === "user" ? "row-reverse" : "row", animation: "fadeUp 0.35s ease forwards" }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: msg.role === "user" ? 10 : 13, background: msg.role === "user" ? "linear-gradient(135deg,#b8860b,#d4a843)" : personaAvatarBg, color: "#fdf6ec", fontFamily: "'Lato',sans-serif", fontWeight: 700, marginTop: 2 }} aria-hidden="true">
                        {msg.role === "user" ? "You" : personaAvatar}
                      </div>
                      <div className={msg.role === "assistant" ? "msg-ai" : ""}
                        style={{ maxWidth: "88%", padding: "12px 16px", borderRadius: msg.role === "user" ? "14px 4px 14px 14px" : "4px 14px 14px 14px", lineHeight: 1.85, fontSize: fs(17), background: msg.role === "user" ? "linear-gradient(135deg,#5c3d1e,#7a5030)" : "white", color: msg.role === "user" ? "#fdf6ec" : tc("#3d2b1a", "#1a0e00"), boxShadow: msg.role === "user" ? "none" : "0 2px 10px rgba(93,61,26,0.07)", border: highContrast && msg.role === "assistant" ? "2px solid rgba(93,61,26,0.2)" : "none" }}
                        role={msg.role === "assistant" ? "article" : undefined}
                        aria-label={msg.role === "assistant" ? `${persona?.name || "Guide"} says` : "Your response"}>
                        {renderText(msg.content)}
                      </div>
                    </div>
                    {msg.role === "user" && msg.isGhostwritten && (
                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6, paddingRight: 42 }}>
                        {revisingIdx === i ? (
                          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", maxWidth: "88%", width: "100%", animation: "slideDown 0.2s ease forwards" }}>
                            <div style={{ flex: 1 }}>
                              <label htmlFor={`revision-${i}`} style={{ position: "absolute", left: -9999, width: 1 }}>What needs to change?</label>
                              <input id={`revision-${i}`} value={revisionInput} onChange={e => setRevisionInput(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") reviseGhostwritten(i, msg.content, revisionInput); if (e.key === "Escape") { setRevisingIdx(null); setRevisionInput(""); } }}
                                placeholder="What's not quite right?"
                                autoFocus
                                style={{ width: "100%", border: "1.5px solid rgba(184,134,11,0.5)", borderRadius: 8, padding: "8px 12px", fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(15), color: tc("#3d2b1a", "#1a0e00"), background: "#fffdf5", outline: "none" }} />
                            </div>
                            <button onClick={() => reviseGhostwritten(i, msg.content, revisionInput)} disabled={!revisionInput.trim() || revisingLoading}
                              style={{ background: "linear-gradient(135deg,#5c3d1e,#8b5e34)", color: "#fdf6ec", border: "none", borderRadius: 8, padding: "8px 14px", fontFamily: "'Lato',sans-serif", fontSize: fs(12), fontWeight: 600, cursor: revisionInput.trim() ? "pointer" : "not-allowed", opacity: revisionInput.trim() ? 1 : 0.4, whiteSpace: "nowrap", minHeight: 38 }}>
                              {revisingLoading ? "Fixing..." : "Fix it"}
                            </button>
                            <button onClick={() => { setRevisingIdx(null); setRevisionInput(""); }} aria-label="Cancel"
                              style={{ background: "none", border: "1.5px solid rgba(180,140,80,0.3)", color: "#7a5c3a", borderRadius: 8, padding: "8px 10px", cursor: "pointer", fontFamily: "'Lato',sans-serif", fontSize: fs(13), minHeight: 38 }}>✕</button>
                          </div>
                        ) : (
                          <button onClick={() => { setRevisingIdx(i); setRevisionInput(""); }}
                            style={{ background: "none", border: "none", padding: "4px 6px", color: "rgba(253,246,236,0.55)", fontFamily: "'Lato',sans-serif", fontSize: fs(11), cursor: "pointer", minHeight: 28 }}>
                            ✦ Something's off? Correct it
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {pendingEditMessage && !loading && (
                  <div style={{ display: "flex", justifyContent: "center", marginTop: 4 }}>
                    <button onClick={confirmEdit}
                      style={{ background: "linear-gradient(135deg,#b8860b,#d4a843)", color: "#fdf6ec", border: "none", padding: "12px 28px", borderRadius: 100, fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(17), cursor: "pointer", boxShadow: "0 4px 14px rgba(184,134,11,0.3)", animation: "fadeUp 0.3s ease forwards" }}>
                      ✦ Yes, go ahead
                    </button>
                  </div>
                )}
                {loading && (
                  <div style={{ display: "flex", gap: 10 }} role="status" aria-label={`${persona?.name || "Guide"} is responding`}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: personaAvatarBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }} aria-hidden="true">{personaAvatar}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "12px 16px", background: "white", borderRadius: "4px 14px 14px 14px", boxShadow: "0 2px 10px rgba(93,61,26,0.07)" }}>
                      {[0, 0.2, 0.4].map((d, idx) => <div key={idx} style={{ width: 7, height: 7, background: "#c9a87a", borderRadius: "50%", animation: `bounce 1.2s ${d}s infinite` }} />)}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} aria-hidden="true" />
              </div>

              {/* Input */}
              <div style={{ display: "flex", flexDirection: "column", flexShrink: 0, marginTop: 10 }}>
                <div style={{ fontSize: fs(13), fontWeight: 700, color: tc("#5c3d1e","#2a1000"), fontFamily: "'Lato',sans-serif", marginBottom: 4 }}>
                  ✦ Type your answer here
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-end", padding: "12px 14px 10px", background: "white", borderRadius: "14px 14px 0 0", border: `${highContrast ? 3 : 2}px solid ${highContrast ? "#9a7a50" : "#b8860b"}`, borderBottom: "none" }}>
                  <label htmlFor="story-input" style={{ position: "absolute", left: -9999, width: 1 }}>Your story response</label>
                  <textarea id="story-input" ref={textareaRef} value={input}
                    onChange={e => { setInput(e.target.value); if (e.target.value) setAnglesUsed(true); }}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Share your story here — there's no wrong way to begin..."
                    aria-label="Type your story here. Press Enter when ready."
                    rows={2}
                    style={{ flex: 1, border: "none", outline: "none", resize: "none", fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(18), color: tc("#3d2b1a", "#1a0e00"), background: "transparent", lineHeight: 1.7, minHeight: 52, maxHeight: 140, overflowY: "auto" }} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                    <button onClick={toggleMic} aria-label={isListening ? "Stop listening" : "Start voice input"}
                      style={{ width: 44, height: 44, borderRadius: "50%", background: isListening ? "linear-gradient(135deg,#c0392b,#e74c3c)" : "rgba(184,134,11,0.12)", border: `2px solid ${isListening ? "#c0392b" : "rgba(184,134,11,0.3)"}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <rect x="9" y="2" width="6" height="11" rx="3" fill={isListening ? "white" : "#b8860b"} />
                        <path d="M5 10a7 7 0 0014 0" stroke={isListening ? "white" : "#b8860b"} strokeWidth="2" strokeLinecap="round" fill="none"/>
                        <line x1="12" y1="19" x2="12" y2="22" stroke={isListening ? "white" : "#b8860b"} strokeWidth="2" strokeLinecap="round"/>
                        <line x1="9" y1="22" x2="15" y2="22" stroke={isListening ? "white" : "#b8860b"} strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                    <button className="send-btn" onClick={() => sendMessage()} disabled={!input.trim() || loading} aria-label="Send your response"
                      style={{ width: 44, height: 44, borderRadius: "50%", background: input.trim() && !loading ? personaAvatarBg : "rgba(139,94,52,0.2)", border: "none", cursor: input.trim() && !loading ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", opacity: (!input.trim() || loading) ? 0.4 : 1 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M22 2L11 13" stroke="#fdf6ec" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#fdf6ec" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 14px 10px", background: "white", borderRadius: "0 0 14px 14px", border: `${highContrast ? 3 : 2}px solid ${highContrast ? "#9a7a50" : "#b8860b"}`, borderTop: "1px solid rgba(180,140,80,0.15)" }}>
                  <span style={{ fontSize: fs(12), color: tc("#5c3d1e","#2a1000"), fontFamily: "'Lato',sans-serif", fontWeight: 600 }}>Press Enter or click Send when ready</span>
                  <button onClick={() => { setMessages(prev => [...prev, { role: "assistant", content: "Your story is saved. ✦\n\nEverything you've shared is safe — come back anytime and I'll be right here waiting for you." }]); }}
                    style={{ background: "none", border: "1px solid rgba(180,140,80,0.35)", color: tc("#7a5030","#3d2b1a"), fontFamily: "'Lato',sans-serif", fontSize: fs(12), padding: "6px 14px", borderRadius: 100, cursor: "pointer", whiteSpace: "nowrap", minHeight: 34, marginLeft: 10 }}>
                    I'm done for now
                  </button>
                </div>
              </div>

              {/* Photos */}
              <div style={{ marginTop: 8, flexShrink: 0 }} id="photo-section">
                <button className="photo-btn" onClick={() => setShowPhotoPanel(v => !v)} aria-expanded={showPhotoPanel} aria-controls="photo-panel"
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: showPhotoPanel ? "rgba(184,134,11,0.08)" : "rgba(253,246,236,0.9)", border: `${highContrast ? 2 : 1.5}px solid rgba(180,140,80,0.3)`, borderRadius: 10, cursor: "pointer", width: "fit-content", minHeight: 40 }}>
                  <span aria-hidden="true">📷</span>
                  <span style={{ fontSize: fs(13), color: tc("#5c3d1e", "#2a1000"), fontFamily: "'Lato',sans-serif" }}>
                    {(photos[chapter.id || chapter.title] || []).length > 0 ? `${(photos[chapter.id || chapter.title] || []).length} photo${(photos[chapter.id || chapter.title] || []).length !== 1 ? "s" : ""} added` : "Add photos to this section"}
                  </span>
                  <span style={{ fontSize: 11, color: "#b8860b" }} aria-hidden="true">{showPhotoPanel ? "▲" : "▼"}</span>
                </button>
                {showPhotoPanel && (
                  <div id="photo-panel" style={{ background: "white", borderRadius: 12, border: "1px solid rgba(180,140,80,0.2)", padding: "12px 14px", marginTop: 6, animation: "slideDown 0.25s ease forwards" }}>
                    {chapter.photoPrompt && <p style={{ fontSize: fs(13), color: tc("#6b5540", "#3d2b1a"), fontStyle: "italic", marginBottom: 8, lineHeight: 1.65 }}>💡 {chapter.photoPrompt}</p>}
                    <PhotoUpload chapterId={chapter.id || chapter.title} photos={photos} onAdd={addPhoto} onRemove={removePhoto} fs={fs} />
                  </div>
                )}
              </div>

              {/* Grace recap button */}
              {showRecapButton && (
                <div style={{ marginTop: 12, background: "rgba(184,134,11,0.06)", border: "2px solid rgba(184,134,11,0.35)", borderRadius: 14, padding: "16px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, animation: "fadeUp 0.4s ease forwards", flexShrink: 0 }}>
                  <p style={{ fontSize: fs(15), color: tc("#5c3d1e","#2a1000"), fontFamily: "'Lato',sans-serif", textAlign: "center", lineHeight: 1.7 }}>
                    {persona?.name || "Grace"} feels this section is beautifully covered. Ready to move on?
                  </p>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                    <button onClick={() => { setShowRecapButton(false); chapterComplete(); }}
                      style={{ background: "linear-gradient(135deg,#b8860b,#d4a843)", color: "#fdf6ec", border: "none", padding: "12px 28px", borderRadius: 100, fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(17), cursor: "pointer", minHeight: 46 }}>
                      Yes, I'm Ready to Move On ✦
                    </button>
                    <button onClick={() => setShowRecapButton(false)}
                      style={{ background: "white", border: "2px solid rgba(180,140,80,0.3)", color: tc("#6b5030","#3d2b1a"), fontFamily: "'Lato',sans-serif", fontSize: fs(13), padding: "12px 20px", borderRadius: 100, cursor: "pointer", minHeight: 46 }}>
                      I have more to share
                    </button>
                  </div>
                </div>
              )}

              {/* Section complete */}
              {!showRecapButton && (
                <div id="tutorial-step-5" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: 10, flexShrink: 0 }}>
                  <button className="complete-btn" onClick={userMessageCount > 0 ? chapterComplete : undefined}
                    disabled={userMessageCount === 0}
                    style={{ background: userMessageCount > 0 ? "linear-gradient(135deg,#5c3d1e,#8b5e34)" : "rgba(139,94,52,0.2)", color: userMessageCount > 0 ? "#fdf6ec" : "#a89070", border: "none", padding: "12px 30px", borderRadius: 100, fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(15), cursor: userMessageCount > 0 ? "pointer" : "not-allowed", minHeight: 46, transition: "all 0.3s" }}>
                    ✦ This section feels complete
                  </button>
                  {userMessageCount === 0 && (
                    <p style={{ fontSize: fs(12), color: tc("#a89070","#6b5030"), fontFamily: "'Lato',sans-serif", fontStyle: "italic" }}>
                      Start sharing above — this activates when you're ready
                    </p>
                  )}
                  {userMessageCount > 0 && (
                    <>
                      <button className="next-btn" onClick={exploreNewAngle} disabled={loading}
                        style={{ background: "transparent", border: `${highContrast ? 2 : 1.5}px solid rgba(180,140,80,0.4)`, color: tc("#7a5030", "#3d2b1a"), fontFamily: "'Lato',sans-serif", fontSize: fs(12), letterSpacing: "1px", textTransform: "uppercase", padding: "8px 18px", borderRadius: 100, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.4 : 1, minHeight: 38 }}>
                        Take me somewhere new in this section →
                      </button>
                      {chapters.length > 1 && activeChapter < chapters.length - 1 && (
                        <button onClick={() => {
                          if (window.confirm(`Skip ${chapter.title}? You can always come back.`)) {
                            const skipped = chapters.filter((_, i) => i !== activeChapter);
                            setChapters(skipped);
                            showToast(`${chapter.title} skipped.`);
                          }
                        }}
                          style={{ background: "none", border: "none", color: tc("#c4a882","#6b5030"), fontFamily: "'Lato',sans-serif", fontSize: fs(12), cursor: "pointer", textDecoration: "underline", padding: "4px 8px", minHeight: 30 }}>
                          Skip this section
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </main>

            {/* ── RIGHT: Topic framework checklist ── */}
            <aside style={{ width: 270, flexShrink: 0, borderLeft: "1px solid rgba(180,140,80,0.18)", background: "white", display: "flex", flexDirection: "column", padding: "18px 14px", overflowY: "auto" }}>
              <div style={{ fontSize: fs(11), letterSpacing: "2px", textTransform: "uppercase", color: "#b8860b", fontFamily: "'Lato',sans-serif", marginBottom: 16 }}>
                📖 {chapter.title}
              </div>

              {/* Topic list */}
              {topicFramework.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {topicFramework.map((topic, i) => {
                    const isCurrent = i === currentTopicIdx && !topic.complete;
                    const isDone = topic.complete;
                    const isUpcoming = i > currentTopicIdx;
                    const isQuickRound = topic.isQuickRound;
                    return (
                      <div key={topic.id} style={{ animation: "fadeUp 0.3s ease forwards" }}>
                        {/* Divider before Quick Round */}
                        {isQuickRound && (
                          <div style={{ borderTop: "1px dashed rgba(184,134,11,0.25)", marginBottom: 12, marginTop: 2 }} />
                        )}
                        {/* Topic header */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: topic.details.length > 0 ? 6 : 0 }}>
                          <div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: isDone ? "#5c3d1e" : isCurrent ? (isQuickRound ? "linear-gradient(135deg,#6b4c8a,#9b7bc0)" : "linear-gradient(135deg,#b8860b,#d4a843)") : "rgba(180,140,80,0.12)", border: isUpcoming ? "1.5px solid rgba(180,140,80,0.25)" : "none", transition: "all 0.3s" }}>
                            {isDone
                              ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="#fdf6ec" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              : <span style={{ fontSize: 10 }}>{topic.icon}</span>
                            }
                          </div>
                          <span style={{ fontSize: fs(13), fontFamily: "'Lato',sans-serif", fontWeight: isCurrent ? 700 : isDone ? 400 : 400, color: isCurrent ? (isQuickRound ? "#6b4c8a" : "#5c3d1e") : isDone ? "#a89070" : tc("#8b7355","#6b5030"), textDecoration: isDone ? "line-through" : "none", textDecorationColor: "rgba(139,94,52,0.4)", opacity: isUpcoming ? 0.5 : 1 }}>
                            {topic.title}
                          </span>
                          {isCurrent && <span style={{ fontSize: 9, background: isQuickRound ? "rgba(107,76,138,0.1)" : "rgba(184,134,11,0.12)", color: isQuickRound ? "#6b4c8a" : "#b8860b", border: "1px solid " + (isQuickRound ? "rgba(107,76,138,0.3)" : "rgba(184,134,11,0.3)"), borderRadius: 100, padding: "2px 6px", fontFamily: "'Lato',sans-serif", fontWeight: 700, letterSpacing: "0.5px" }}>NOW</span>}
                        </div>

                        {/* Detail bullets */}
                        {topic.details.length > 0 && (
                          <div style={{ marginLeft: 30, display: "flex", flexDirection: "column", gap: 3 }}>
                            {topic.details.map((detail, di) => (
                              <div key={di} style={{ display: "flex", gap: 6, alignItems: "flex-start", animation: "fadeUp 0.3s ease forwards" }}>
                                <span style={{ color: "#b8860b", fontSize: 10, marginTop: 4, flexShrink: 0 }}>·</span>
                                <span style={{ fontSize: fs(12), color: tc("#6b5540","#3a2510"), fontFamily: "'Lato',sans-serif", lineHeight: 1.5 }}>{detail}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ fontSize: fs(13), color: tc("#a89070","#6b5030"), fontFamily: "'Lato',sans-serif", fontStyle: "italic", lineHeight: 1.7, textAlign: "center", marginTop: 12 }}>
                  Your story will build here as you share with Grace.
                </p>
              )}

              {/* See what we've written button */}
              <div style={{ marginTop: "auto", paddingTop: 16 }}>
                {topicFramework.some(t => t.details.length > 0 || t.complete) && (
                  <button onClick={chapterComplete}
                    style={{ background: "linear-gradient(135deg,#b8860b,#d4a843)", color: "#fdf6ec", border: "none", padding: "13px 16px", borderRadius: 100, fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(15), cursor: "pointer", width: "100%", boxShadow: "0 4px 14px rgba(184,134,11,0.28)", transition: "all 0.2s" }}>
                    See what we've written ✦
                  </button>
                )}
              </div>
            </aside>
          </div>
        </div>
      )}

      {/* ── TUTORIAL OVERLAY ── */}
      {tutorialStep && screen === "chat" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, pointerEvents: "none" }}>
          {/* Dark overlay */}
          <div style={{ position: "absolute", inset: 0, background: "rgba(30,18,8,0.72)", pointerEvents: "auto" }} onClick={skipTutorial} />

          {/* Tutorial steps */}
          {(() => {
            const steps = [
              {
                id: 1,
                title: "Your progress dashboard",
                body: "This bar shows all your sections. Once you finish a section, click its name to go back and add more anytime.",
                position: { top: 100, left: "50%", transform: "translateX(-50%)" },
                arrowEl: (
                  <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "14px solid transparent", borderRight: "14px solid transparent", borderBottom: "14px solid #1a4a5c" }} />
                ),
              },
              {
                id: 2,
                title: "Your conversation with Grace",
                body: "Grace asks you questions here and your answers appear in this area. Just have a natural conversation — there are no wrong answers.",
                position: { top: 220, left: "50%", transform: "translateX(-50%)" },
                arrowEl: (
                  <div style={{ position: "absolute", top: -14, left: "25%", width: 0, height: 0, borderLeft: "14px solid transparent", borderRight: "14px solid transparent", borderBottom: "14px solid #1a4a5c" }} />
                ),
              },
              {
                id: 3,
                title: "This is where you type",
                body: "Type your answer in this box below, then press the Send button or hit Enter on your keyboard.",
                position: { top: "38%", left: "50%", transform: "translateX(-50%)" },
                arrowEl: (
                  <div style={{ position: "absolute", bottom: -14, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "14px solid transparent", borderRight: "14px solid transparent", borderTop: "14px solid #1a4a5c" }} />
                ),
              },
              {
                id: 4,
                title: "Add photos to your book",
                body: "Scroll down to find the camera button. Click it to add photos — one or two per section works best and they'll appear in your printed book.",
                position: { top: "38%", left: "50%", transform: "translateX(-50%)" },
                arrowEl: (
                  <div style={{ position: "absolute", bottom: -14, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "14px solid transparent", borderRight: "14px solid transparent", borderTop: "14px solid #1a4a5c" }} />
                ),
              },
              {
                id: 5,
                title: "When you're ready to move on",
                body: "Scroll down to find this button. When you've shared enough, click it and Grace will show you everything you've written — beautifully shaped into your story.",
                position: { top: "38%", left: "50%", transform: "translateX(-50%)" },
                arrowEl: (
                  <div style={{ position: "absolute", bottom: -14, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "14px solid transparent", borderRight: "14px solid transparent", borderTop: "14px solid #1a4a5c" }} />
                ),
              },
            ];

            const step = steps[tutorialStep - 1];

            return (
              <div style={{ position: "absolute", ...step.position, background: "#1a4a5c", borderRadius: 16, padding: "20px 20px", maxWidth: 400, width: "calc(100vw - 32px)", boxSizing: "border-box", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", pointerEvents: "auto", animation: "fadeUp 0.3s ease forwards", border: "2px solid rgba(255,255,255,0.15)" }}>
                {step.arrowEl}

                {/* Step progress dots */}
                <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                  {[1,2,3,4,5].map(n => (
                    <div key={n} style={{ width: n === tutorialStep ? 20 : 8, height: 8, borderRadius: 4, background: n === tutorialStep ? "#5bc4e0" : n < tutorialStep ? "rgba(91,196,224,0.4)" : "rgba(255,255,255,0.2)", transition: "all 0.3s" }} />
                  ))}
                </div>

                <h3 style={{ fontSize: 20, fontWeight: 700, color: "#ffffff", fontFamily: "'Cormorant Garamond',serif", marginBottom: 10 }}>{step.title}</h3>
                <p style={{ fontSize: 16, color: "rgba(255,255,255,0.85)", fontFamily: "'Lato',sans-serif", lineHeight: 1.75, marginBottom: 22 }}>{step.body}</p>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button onClick={skipTutorial}
                    style={{ background: "none", border: "none", color: "rgba(255,255,255,0.55)", fontFamily: "'Lato',sans-serif", fontSize: 13, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, padding: "4px 0" }}>
                    Skip tutorial
                  </button>
                  <button onClick={advanceTutorial}
                    style={{ background: "#5bc4e0", color: "#0d2d38", border: "none", padding: "14px 32px", borderRadius: 100, fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 18, fontWeight: 700, cursor: "pointer", minHeight: 48, boxShadow: "0 4px 16px rgba(91,196,224,0.4)" }}>
                    {tutorialStep === 5 ? "Got it ✦" : "Next →"}
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {toast && (
        <div key={toast.key} role="status" style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: highContrast ? "#1a0e00" : "#3d2b1a", color: "#fdf6ec", padding: "12px 28px", borderRadius: 100, fontFamily: "'Lato',sans-serif", fontSize: fs(13), animation: "toast 2.2s ease forwards", pointerEvents: "none", border: highContrast ? "2px solid #b8860b" : "none" }}>
          {toast.msg}
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer style={{ marginTop: "auto", borderTop: `1px solid ${highContrast ? "rgba(0,0,0,0.15)" : "rgba(180,140,80,0.15)"}`, padding: "16px 24px", textAlign: "center", background: highContrast ? "#fff" : "rgba(253,246,236,0.8)" }}>
        <p style={{ fontSize: fs(12), color: tc("#a89070","#6b5030"), fontFamily: "'Lato',sans-serif", lineHeight: 1.7 }}>
          <a href="/privacy" target="_blank" rel="noreferrer" style={{ color: tc("#a89070","#6b5030"), textDecoration: "underline", textUnderlineOffset: 3 }}>Privacy Policy</a>
          <span style={{ margin: "0 10px", opacity: 0.5 }}>·</span>
          <a href="/terms" target="_blank" rel="noreferrer" style={{ color: tc("#a89070","#6b5030"), textDecoration: "underline", textUnderlineOffset: 3 }}>Terms of Service</a>
          <span style={{ margin: "0 10px", opacity: 0.5 }}>·</span>
          <a href="/cookies" target="_blank" rel="noreferrer" style={{ color: tc("#a89070","#6b5030"), textDecoration: "underline", textUnderlineOffset: 3 }}>Cookie Policy</a>
          <span style={{ margin: "0 10px", opacity: 0.5 }}>·</span>
          <a href="mailto:timothy@mystory.family" style={{ color: tc("#a89070","#6b5030"), textDecoration: "underline", textUnderlineOffset: 3 }}>Contact Us</a>
          <span style={{ margin: "0 10px", opacity: 0.5 }}>·</span>
          <span>© {new Date().getFullYear()} MyStory.Family</span>
        </p>
      </footer>

    </div>
  );
}
