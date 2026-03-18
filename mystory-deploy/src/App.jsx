import { useState, useRef, useEffect } from "react";

// ─── STRIPE CONFIGURATION ─────────────────────────────────────────────────────
// SETUP INSTRUCTIONS:
// 1. Go to dashboard.stripe.com → Payment Links → Create a link
// 2. Set the price to $99 and product name to "MyStory.Family — Complete Legacy Book"
// 3. Under "After payment" set the confirmation page to:
//    Redirect to your website → https://mystory.family?payment_success=true
// 4. Copy your Payment Link URL and paste it below
// 5. Replace the TEST link with your LIVE link when ready to go live

const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/test_cNidRbgDj4Xng7R0cMds401";
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
];

// ─── PERSONAS ─────────────────────────────────────────────────────────────────
const PERSONAS = {
  grace: {
    name: "Grace",
    avatar: "🕊️",
    avatarBg: "linear-gradient(135deg,#6b4c8a,#9b7bc0)",
    role: "Your faith-centered legacy guide",
    tagline: "She listens with her whole heart",
    intro: (profile) => `I've been looking forward to meeting you. 🕊️\n\nI'm Grace, and I'm here to help you tell the story only you can tell — the one your family will carry long after this moment.\n\nI know ${profile.audience ? `you're writing this for ${profile.audience}` : "this is for the people you love most"}. I know how much your faith has shaped who you are. And I promise to hold everything you share with the care it deserves.\n\nThere's no rush here. No wrong answer. Start wherever feels natural — or just begin typing and I'll help shape it into something beautiful.\n\n*${profile.firstQuestion}*`,
  },
};

// ─── DYNAMIC SYSTEM PROMPT ────────────────────────────────────────────────────
const buildSystemPrompt = (persona, profile) => {
  const isGrace = true;
  const faithVoice = "You speak naturally about God, faith, scripture, and spiritual meaning. References to God's hand, answered prayer, and biblical wisdom feel natural and authentic in your voice — never preachy, always warm.";

  const personalityNote = profile.personality?.length
    ? `The person describes themselves as: ${profile.personality.join(", ")}. Honor this in how you engage — match your energy to theirs.`
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
2. When someone shares something significant, say "Let me show you what I'm hearing..." and offer 2-3 sentences of beautiful prose capturing what they said, then ask "Does that sound right?"
3. Ask ONE follow-up that goes deeper — not a new topic

WHEN SOMEONE IS SELF-DEPRECATING:
When someone says "Nothing interesting ever happened to me" or "I don't have much to tell" — push back warmly but firmly. Say something like: "I hear that, but I've found that the people who say that always have the most to share. The ordinary days are exactly what your family will treasure most. Let's start somewhere simple — tell me about a regular Tuesday when you were ten years old."

WHEN SOMETHING HARD COMES UP:
Hold grief, regret, and loss with complete presence. Acknowledge fully before moving anywhere new. Hard stories often become the most meaningful pages in a book.

YOUR RULES:
- Respond in 2-4 warm sentences, then ask your ONE question
- Never use bullet points or lists — this is a flowing human conversation  
- Never rush — a chapter should feel like a long, satisfying afternoon conversation
- End every response with ONE specific question that goes deeper
- If they've only given you one or two short answers, you have not dug deep enough yet
- You are writing a book together. Every exchange is a page. Make every page count.

WHAT TO HOLD CLOSE:
${mustIncludeNote}
${privateNote}`;
};

// ─── WRITING HELP PROMPT ──────────────────────────────────────────────────────
const WRITING_HELP_PROMPT = `You are a warm ghostwriter helping someone tell their life story for a printed legacy book. They've started typing some raw thoughts. Shape what they've written into a warm, first-person narrative paragraph — as if they are telling this story to someone they love. Keep their voice. Don't over-polish. Return ONLY the paragraph. No preamble.`;

const WRITING_HELP_REVISE_PROMPT = `You are a warm ghostwriter helping someone refine a paragraph in their legacy book. They've flagged a correction. Quietly incorporate it into the existing paragraph — keep their voice, don't over-explain the change, just fix it and make the whole paragraph flow naturally. Return ONLY the revised paragraph. No preamble, no explanation.`;

// ─── MEMOIR WRITER PROMPT ─────────────────────────────────────────────────────
const buildMemoirPrompt = (chapterTitle, firstName, conversationTranscript) => `You are a gifted memoir writer with deep knowledge of American history, culture, and everyday life across the 20th and 21st centuries. You have just finished a deep interview conversation with ${firstName || "someone"} about the "${chapterTitle}" chapter of their life story.

Your job is to transform this raw conversation into a beautifully written memoir chapter — polished, warm, first-person prose that sounds exactly like them, enriched with the historical world they lived in.

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
function ChapterPreview({ chapter, chapterMessages, chapterPhotos, onContinue, onAddMore, nextChapterTitle, isLast, fs, tc, highContrast, promoCode, promoInfo, narrative, generatingNarrative, personaAvatarBg, personaAvatar, userEmail, userName }) {
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

If you're asking a clarifying question and not yet ready to revise, just respond conversationally WITHOUT the tags. Always end your clarifying question with something like "Would you like me to go ahead and update your section with this change?" so the user knows to say yes.

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
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "40px 24px", width: "100%", animation: "fadeUp 0.4s ease forwards" }} role="main">
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 36, marginBottom: 10 }} aria-hidden="true">✨</div>
        <h2 style={{ fontSize: fs(28), fontWeight: 600, color: tc("#3d2b1a","#1a0e00"), marginBottom: 6 }}>{chapter.title} — Complete</h2>
        <p style={{ fontSize: fs(16), color: "#6b5540", fontStyle: "italic", fontFamily: "'Cormorant Garamond',Georgia,serif" }}>
          {generatingNarrative ? "Writing your section…" : "Here's a glimpse of how this section will look in your book"}
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
                Writing your section…
              </p>
              <p style={{ fontSize: fs(13), color: "#a89070", fontFamily: "'Lato',sans-serif" }}>
                Shaping your stories into beautiful prose
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
            {generatingNarrative ? "Writing…" : "Preview — final layout professionally formatted"}
          </div>
          <div style={{ fontSize: fs(11), color: "#c4a882", fontFamily: "'Lato',sans-serif" }}>1</div>
        </div>
      </div>

      {/* Print upgrade card — only show when narrative is ready */}
      {!generatingNarrative && (
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
                  <div key={i} style={{ display: "flex", gap: 10, flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
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
          {generatingNarrative ? "Writing your section…" : isLast ? "Complete My Legacy Story ✦" : `Continue to ${nextChapterTitle} →`}
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
  const [signinFields, setSigninFields] = useState({ email: "", password: "" });
  const [signinError, setSigninError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
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
  const [chapterNarratives, setChapterNarratives] = useState({}); // { chapterId: "prose..." }
  const [generatingNarrative, setGeneratingNarrative] = useState(false);
  const [bookComplete, setBookComplete] = useState(false);
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
  const [textScale, setTextScale] = useState(1);
  const [highContrast, setHighContrast] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const toastKey = useRef(0);
  const liveRef = useRef(null);

  const fs = (n) => Math.round(n * textScale);
  const tc = (normal, contrast) => highContrast ? contrast : normal;
  const textSizeLabels = ["A", "A+", "A++"];
  const textScales = [1, 1.2, 1.4];

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
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
      const paidEmail = params.get("paid_email") || localStorage.getItem("mystory_pending_email");

      if (paymentSuccess || paymentCancelled) {
        window.history.replaceState({}, "", window.location.pathname);
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
            setTimeout(() => announce("Payment confirmed — let's continue your story. ✦"), 600);
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
                setTimeout(() => announce("Payment confirmed — let's continue your story. ✦"), 600);
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
        previewChapter,
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
    setHasPaid(s.hasPaid === true);
    setEnabledChapters(s.enabledChapters || BASE_CHAPTERS.map(c => c.id));
    setChapterNarratives(s.chapterNarratives || {});

    if (fromPayment && s.previewChapter) {
      // Coming back from Stripe — drop them right back on chapter preview, paid
      setPreviewChapter(s.previewChapter);
      setScreen("chat");
      setShowPaywall(false);
    } else {
      // Normal restore — land on chat if mid-book, otherwise onboarding
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
    if (password.length < 6) { setSignupError("Password must be at least 6 characters."); return; }
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
    if (!forgotEmail.includes("@")) { setForgotError("Please enter your email address."); return; }
    if (forgotNewPassword.length < 6) { setForgotError("New password must be at least 6 characters."); return; }
    if (forgotNewPassword !== forgotConfirm) { setForgotError("Passwords don't match."); return; }
    setForgotError("Updating password…");
    try {
      const res = await fetch("/api/auth-forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, newPassword: forgotNewPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setForgotError(data.error || "Could not update password."); return; }
      setForgotSuccess(true);
      setForgotError("");
    } catch {
      setForgotError("Connection error. Please try again.");
    }
  };

  const handleSignout = () => {
    if (window.confirm("Sign out? Your progress is saved and you can continue any time.")) {
      // Save hasPaid before clearing user state
      const currentSession = JSON.parse(localStorage.getItem("mystory_session") || "{}");
      if (user?.email) {
        localStorage.setItem("mystory_paid_" + user.email, hasPaid ? "true" : "false");
      }
      setUser(null);
      setScreen("welcome");
      setSavedSession(currentSession.user ? currentSession : null);
      // Keep session in localStorage — don't wipe it
    }
  };

  const announce = (msg) => {
    if (liveRef.current) liveRef.current.textContent = msg;
    setTimeout(() => { if (liveRef.current) liveRef.current.textContent = ""; }, 3000);
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
      const faithLevel = newAnswers.faith || 1;
      const chosenPersona = PERSONAS.grace;
      const firstQ = getQuestion(BASE_CHAPTERS.find(c => enabledChapters.includes(c.id))?.prompts[0] || BASE_CHAPTERS[0].prompts[0]);
      const profile = {
        audience: newAnswers.audience,
        faithScale: faithLevel,
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
  const buildChapterContext = (ch) =>
    `\n\nCURRENT CHAPTER: "${ch.title}"\nStory territory to cover in this chapter — introduce these naturally as the conversation flows, following each thread deeply before moving to the next. Never announce them as a list:\n${ch.prompts.map((p, i) => `${i + 1}. ${getQuestion(p)}`).join("\n")}\n\nStart with topic 1. Only introduce topic 2 when topic 1 feels fully explored. The person decides when the whole chapter is complete.`;

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
      firstQuestion: getQuestion(allChapters[0].prompts[0]),
    };
    const introMsg = persona ? persona.intro(profile) : `Welcome. I'm so glad you're here.\n\nThere's no right or wrong way to begin. Start wherever feels natural.\n\n*${getQuestion(allChapters[0].prompts[0])}*`;
    setMessages([{ role: "assistant", content: introMsg }]);
    setScreen("chat");
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
    setInput("");
    setLoading(true);
    try {
      const fullSystem = systemPrompt + chapterContext + angleNudge;
      const res = await fetch("/api/claude", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: fullSystem, messages: next.map(m => ({ role: m.role, content: m.content })) }) });
      const data = await res.json();
      setMessages([...next, { role: "assistant", content: data.content?.[0]?.text || "I'm here with you. Tell me more." }]);
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

  const continueFromPreview = () => {
    const nextC = previewChapter.chapterIndex + 1;
    // Check paid status from state AND localStorage key as fallback
    const paidKey = user?.email ? localStorage.getItem("mystory_paid_" + user.email.toLowerCase()) === "true" : false;
    const isPaid = hasPaid || paidKey;
    if (previewChapter.chapterIndex === 0 && !isPaid && !promoInfo?.schoolShare) {
      setShowPaywall(true);
      return;
    }
    if (previewChapter.chapterIndex === 0 && (isPaid || promoInfo?.schoolShare)) {
      setShowBetweenSections(true);
      return;
    }
    advanceToChapter(nextC);
  };

  const advanceToChapter = (nextC) => {
    setPreviewChapter(null);
    setShowPaywall(false);
    setShowBetweenSections(false);
    // Update system prompt with any mustInclude/keepPrivate answers
    if (betweenSectionAnswers.mustInclude || betweenSectionAnswers.keepPrivate) {
      const updatedProfile = {
        ...onboardAnswers,
        mustInclude: betweenSectionAnswers.mustInclude || onboardAnswers.mustInclude,
        keepPrivate: betweenSectionAnswers.keepPrivate || onboardAnswers.keepPrivate,
      };
      setSystemPrompt(buildSystemPrompt(persona, updatedProfile));
    }
    if (nextC < chapters.length) {
      setActiveChapter(nextC);
      setActivePrompt(0);
      setAnglesUsed(false);
      setChapterContext(buildChapterContext(chapters[nextC]));
      setMessages([{ role: "assistant", content: `You've completed ${chapters[nextC - 1].title}. What you've shared is precious. 💛\n\nNow let's step into the next section of your life...\n\n*${getQuestion(chapters[nextC].prompts[0])}*` }]);
      announce(`Starting section: ${chapters[nextC].title}`);
    } else {
      setMessages([{ role: "assistant", content: `You've done something extraordinary. Your stories, your wisdom, everything you've shared — preserved forever for the people you love. ${persona?.avatar || "🕊️"}\n\nThank you for trusting me with your legacy.` }]);
      setBookComplete(true);
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
      `}</style>

      {/* ── HEADER ── */}
      <header style={{ background: headerBg, backdropFilter: "blur(8px)", borderBottom: `2px solid ${highContrast ? "#3d2b1a" : "rgba(180,140,80,0.2)"}`, padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, background: persona ? personaAvatarBg : "linear-gradient(135deg,#5c3d1e,#8b5e34)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }} aria-hidden="true">{personaAvatar}</div>
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
        <main id="main-content" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "78vh", textAlign: "center", padding: "40px 24px" }}>
          <div style={{ fontSize: 56, marginBottom: 24, animation: "pulse 3s ease-in-out infinite" }} aria-hidden="true">🕊️</div>
          <h1 style={{ fontSize: fs(46), fontWeight: 300, color: tc("#3d2b1a", "#1a0e00"), fontStyle: "italic", marginBottom: 8 }}>Your Story Matters</h1>
          <p style={{ fontSize: fs(12), color: tc("#8b7355", "#4a3020"), fontFamily: "'Lato',sans-serif", letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 32 }}>A MyStory.Family Legacy Interview</p>
          <p style={{ fontSize: fs(19), color: tc("#5c4a35", "#2a1a0a"), maxWidth: 520, lineHeight: 1.9, marginBottom: 40, fontStyle: "italic" }}>
            You're about to share the moments, memories, and faith that have shaped your life. A personal guide will walk alongside you — gently, warmly — one story at a time. The result will be a beautifully printed book your family will treasure for generations.
          </p>

          {/* Promo code */}
          {!promoInfo ? (
            <div style={{ marginBottom: 32, width: "100%", maxWidth: 360 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <label htmlFor="promo-input" style={{ position: "absolute", left: -9999, width: 1 }}>School or discount code</label>
                <input id="promo-input" value={promoInput} onChange={e => { setPromoInput(e.target.value); setPromoError(""); }}
                  onKeyDown={e => e.key === "Enter" && applyPromoCode()}
                  placeholder="Have a school code? Enter it here"
                  style={{ flex: 1, border: `1.5px solid ${promoError ? "#c0392b" : highContrast ? "#7a5c3a" : "rgba(180,140,80,0.3)"}`, borderRadius: 8, padding: "11px 14px", fontFamily: "'Lato',sans-serif", fontSize: fs(14), color: tc("#3d2b1a","#1a0e00"), background: "#fffdf5", outline: "none", minHeight: 46 }} />
                <button onClick={applyPromoCode} disabled={!promoInput.trim()}
                  style={{ background: promoInput.trim() ? "rgba(93,61,26,0.9)" : "rgba(139,94,52,0.2)", color: promoInput.trim() ? "#fdf6ec" : "#a89070", border: "none", borderRadius: 8, padding: "11px 18px", fontFamily: "'Lato',sans-serif", fontSize: fs(13), fontWeight: 600, cursor: promoInput.trim() ? "pointer" : "not-allowed", whiteSpace: "nowrap", minHeight: 46 }}>
                  Apply
                </button>
              </div>
              {promoError && <p role="alert" style={{ fontSize: fs(12), color: "#c0392b", fontFamily: "'Lato',sans-serif", marginTop: 6 }}>{promoError}</p>}
            </div>
          ) : (
            <div style={{ marginBottom: 32, background: "rgba(184,134,11,0.08)", border: "1.5px solid rgba(184,134,11,0.3)", borderRadius: 10, padding: "12px 20px", maxWidth: 380, display: "flex", alignItems: "center", gap: 10 }}>
              <span aria-hidden="true">{promoInfo.school ? "🏫" : "🏷️"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: fs(13), fontWeight: 600, color: tc("#3d2b1a","#1a0e00"), fontFamily: "'Lato',sans-serif" }}>
                  {promoInfo.school ? `Supporting ${promoInfo.school}` : `${Math.round(promoInfo.discount * 100)}% discount applied`}
                </div>
                {promoInfo.school && <div style={{ fontSize: fs(12), color: tc("#6b5030","#4a3020"), fontFamily: "'Lato',sans-serif", marginTop: 2 }}>
                  ${promoInfo.schoolShare} from your purchase goes to the school
                </div>}
              </div>
              <button onClick={() => { setPromoInfo(null); setPromoCode(""); setPromoInput(""); }} aria-label="Remove promo code"
                style={{ background: "none", border: "none", color: "#a89070", cursor: "pointer", fontSize: 16, minWidth: 28, minHeight: 28, padding: "2px 6px" }}>✕</button>
            </div>
          )}

          <button className="start-btn" onClick={() => setScreen("signup")}
            style={{ background: "linear-gradient(135deg,#5c3d1e,#8b5e34)", color: "#fdf6ec", border: highContrast ? "3px solid #3d2b1a" : "none", padding: "18px 56px", borderRadius: 100, fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(20), letterSpacing: 1, cursor: "pointer", boxShadow: "0 4px 24px rgba(93,61,26,0.25)", minHeight: 60 }}>
            Begin My Legacy ✦
          </button>

          {/* Returning user */}
          {savedSession?.user && (
            <div style={{ marginTop: 24, padding: "16px 24px", background: "rgba(184,134,11,0.07)", border: "1.5px solid rgba(184,134,11,0.2)", borderRadius: 12, maxWidth: 380, width: "100%", textAlign: "center" }}>
              <div style={{ fontSize: fs(13), color: tc("#5c3d1e","#2a1000"), fontFamily: "'Lato',sans-serif", marginBottom: 10 }}>
                Welcome back, <strong>{savedSession.user.firstName}</strong> — your story is waiting for you
              </div>
              <button onClick={() => restoreSession(savedSession)}
                style={{ background: "linear-gradient(135deg,#b8860b,#d4a843)", color: "#fdf6ec", border: "none", padding: "12px 28px", borderRadius: 100, fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(16), cursor: "pointer", minHeight: 46 }}>
                Continue My Story →
              </button>
              <div style={{ marginTop: 8 }}>
                <button onClick={() => setScreen("signin")} style={{ background: "none", border: "none", color: tc("#a89070","#6b5030"), fontFamily: "'Lato',sans-serif", fontSize: fs(12), cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, minHeight: 36 }}>
                  Sign in to a different account
                </button>
              </div>
            </div>
          )}
          {!savedSession?.user && (
            <button onClick={() => setScreen("signin")} style={{ marginTop: 14, background: "none", border: "none", color: tc("#a89070","#6b5030"), fontFamily: "'Lato',sans-serif", fontSize: fs(13), cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, minHeight: 44 }}>
              Already have an account? Sign in
            </button>
          )}
          <p style={{ marginTop: 22, fontSize: fs(14), color: tc("#a89070", "#5c3d1e"), fontFamily: "'Lato',sans-serif", lineHeight: 1.7, textAlign: "center" }}>
            First section free · no card required<br />
            <span style={{ fontSize: fs(13), opacity: 0.8 }}>Unlock your full book + PDF download for $99 when you're ready</span>
          </p>
        </main>
      )}

      {/* ── SIGNUP ── */}
      {screen === "signup" && (
        <main id="main-content" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "78vh", padding: "40px 24px", animation: "fadeUp 0.4s ease forwards" }}>
          <div style={{ maxWidth: 480, width: "100%" }}>
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
                    placeholder={key === "password" ? "At least 6 characters" : ""}
                    style={{ width: "100%", border: `1.5px solid rgba(180,140,80,0.3)`, borderRadius: 8, padding: "12px 14px", fontFamily: "'Lato',sans-serif", fontSize: fs(15), color: tc("#3d2b1a","#1a0e00"), background: "#fffdf5", outline: "none", boxSizing: "border-box", minHeight: 48 }} />
                </div>
              ))}

              {signupError && <p role="alert" style={{ fontSize: fs(13), color: "#c0392b", fontFamily: "'Lato',sans-serif", marginBottom: 14, lineHeight: 1.5 }}>{signupError}</p>}

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
          <div style={{ maxWidth: 440, width: "100%" }}>
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
                      <button onClick={() => { setShowForgotPassword(false); setForgotSuccess(false); }}
                        style={{ background: "linear-gradient(135deg,#5c3d1e,#8b5e34)", color: "#fdf6ec", border: "none", padding: "10px 24px", borderRadius: 100, fontFamily: "'Lato',sans-serif", fontSize: fs(13), cursor: "pointer", minHeight: 40 }}>
                        Sign In →
                      </button>
                    </div>
                  ) : (
                    <>
                      <p style={{ fontSize: fs(13), color: tc("#6b5540","#3a2510"), fontFamily: "'Lato',sans-serif", marginBottom: 14, lineHeight: 1.6 }}>
                        Enter your email and choose a new password.
                      </p>
                      {[["Email Address", forgotEmail, setForgotEmail, "email"], ["New Password", forgotNewPassword, setForgotNewPassword, "password"], ["Confirm Password", forgotConfirm, setForgotConfirm, "password"]].map(([label, val, setter, type]) => (
                        <div key={label} style={{ marginBottom: 10 }}>
                          <label style={{ display: "block", fontSize: fs(11), color: tc("#7a5c3a","#4a3020"), fontFamily: "'Lato',sans-serif", marginBottom: 4, fontWeight: 600, letterSpacing: "0.5px" }}>{label}</label>
                          <input type={type} value={val} onChange={e => setter(e.target.value)}
                            style={{ width: "100%", border: "1.5px solid rgba(180,140,80,0.3)", borderRadius: 8, padding: "10px 12px", fontFamily: "'Lato',sans-serif", fontSize: fs(14), color: tc("#3d2b1a","#1a0e00"), background: "#fffdf5", outline: "none", boxSizing: "border-box", minHeight: 44 }} />
                        </div>
                      ))}
                      {forgotError && <p style={{ fontSize: fs(13), color: "#c0392b", fontFamily: "'Lato',sans-serif", marginBottom: 10 }}>{forgotError}</p>}
                      <div style={{ display: "flex", gap: 10 }}>
                        <button onClick={handleForgotPassword}
                          style={{ flex: 1, background: "linear-gradient(135deg,#5c3d1e,#8b5e34)", color: "#fdf6ec", border: "none", padding: "11px", borderRadius: 100, fontFamily: "'Lato',sans-serif", fontSize: fs(13), cursor: "pointer", minHeight: 44 }}>
                          Update Password
                        </button>
                        <button onClick={() => setShowForgotPassword(false)}
                          style={{ background: "none", border: "1.5px solid rgba(180,140,80,0.3)", color: tc("#6b5540","#3a2510"), fontFamily: "'Lato',sans-serif", fontSize: fs(13), cursor: "pointer", padding: "11px 18px", borderRadius: 100, minHeight: 44 }}>
                          Cancel
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
          <div style={{ maxWidth: 600, width: "100%", animation: "fadeUp 0.4s ease forwards" }}>
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
          <div style={{ maxWidth: 560, width: "100%" }}>
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
        <main id="main-content" style={{ maxWidth: 720, margin: "0 auto", padding: "44px 24px", width: "100%" }}>
          <p style={{ fontSize: fs(12), letterSpacing: "2.5px", textTransform: "uppercase", color: "#b8860b", fontFamily: "'Lato',sans-serif", marginBottom: 8 }}>Step 1 of 2</p>
          <h1 style={{ fontSize: fs(34), fontWeight: 600, color: tc("#3d2b1a", "#1a0e00"), marginBottom: 8 }}>Shape Your Book</h1>
          <p style={{ fontSize: fs(17), color: tc("#6b5540", "#3d2b1a"), fontStyle: "italic", marginBottom: 28, lineHeight: 1.7 }}>Every life is different. Choose which sections belong in yours — and add your own if something important is missing.</p>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <button className="start-btn" onClick={startChat} disabled={enabledChapters.length === 0}
              style={{ background: persona ? personaAvatarBg : "linear-gradient(135deg,#5c3d1e,#8b5e34)", color: "#fdf6ec", border: "none", padding: "16px 48px", borderRadius: 100, fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(18), letterSpacing: 1, cursor: "pointer", boxShadow: "0 4px 20px rgba(93,61,26,0.2)", minHeight: 56 }}>
              Begin My Interview with {persona?.name || "My Guide"} ✦
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 36 }} role="group" aria-label="Section selection">
            {BASE_CHAPTERS.map(ch => {
              const on = enabledChapters.includes(ch.id);
              return (
                <div key={ch.id} className="ch-card" role="checkbox" aria-checked={on} tabIndex={0}
                  onClick={() => toggleChapter(ch.id)} onKeyDown={e => (e.key === "Enter" || e.key === " ") && toggleChapter(ch.id)}
                  aria-label={`${ch.title}: ${ch.description}. ${on ? "Selected" : "Not selected"}.`}
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", background: on ? "#fffdf5" : "#f9f5f0", borderRadius: 10, border: `${highContrast ? 3 : 1.5}px solid ${on ? "#b8860b" : highContrast ? "#9a7a50" : "rgba(180,140,80,0.2)"}`, cursor: "pointer", opacity: on ? 1 : 0.55, minHeight: 64 }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", border: `2px solid ${on ? "#b8860b" : "rgba(180,140,80,0.4)"}`, background: on ? "#b8860b" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} aria-hidden="true">
                    {on && <svg width="11" height="11" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="#fdf6ec" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <div style={{ fontSize: 22, width: 30, textAlign: "center" }} aria-hidden="true">{ch.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: fs(16), fontWeight: 600, color: tc("#3d2b1a", "#1a0e00") }}>{ch.title}</div>
                    <div style={{ fontSize: fs(14), color: tc("#7a6040", "#4a3020"), fontFamily: "'Lato',sans-serif", marginTop: 2 }}>{ch.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ background: "white", borderRadius: 12, border: `${highContrast ? "2px" : "1.5px"} dashed ${highContrast ? "#7a5c3a" : "rgba(180,140,80,0.4)"}`, padding: "22px 24px", marginBottom: 32 }}>
            <h2 style={{ fontSize: fs(16), fontWeight: 600, color: tc("#5c3d1e", "#2a1000"), marginBottom: 6 }}>✦ Add Your Own Chapter</h2>
            <p style={{ fontSize: fs(14), color: tc("#7a6040", "#4a3020"), fontFamily: "'Lato',sans-serif", marginBottom: 16, lineHeight: 1.65 }}>Have a section that's uniquely yours? Name it and {persona?.name || "our AI"} will craft the perfect prompts instantly.</p>
            {!customChapter ? (
              <>
                <div style={{ display: "flex", gap: 10 }}>
                  <label htmlFor="custom-section-input" style={{ position: "absolute", left: -9999, width: 1 }}>Custom section name</label>
                  <input id="custom-section-input" value={customInput} onChange={e => setCustomInput(e.target.value)} onKeyDown={e => e.key === "Enter" && generateCustomPrompts(customInput)}
                    placeholder="e.g. My Military Service, Our Immigration Story..."
                    style={{ flex: 1, border: `${highContrast ? 2 : 1.5}px solid ${highContrast ? "#7a5c3a" : "rgba(180,140,80,0.3)"}`, borderRadius: 8, padding: "12px 14px", fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(17), color: tc("#3d2b1a", "#1a0e00"), background: "#fffdf5", outline: "none", minHeight: 48 }} />
                  <button className="gen-btn" onClick={() => generateCustomPrompts(customInput)} disabled={!customInput.trim() || generatingPrompts}
                    style={{ background: "linear-gradient(135deg,#5c3d1e,#8b5e34)", color: "#fdf6ec", border: "none", padding: "12px 22px", borderRadius: 8, fontFamily: "'Lato',sans-serif", fontSize: fs(14), fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", opacity: (!customInput.trim() || generatingPrompts) ? 0.45 : 1, minHeight: 48 }}>
                    {generatingPrompts ? "Crafting..." : "Generate ✦"}
                  </button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
                  {SUGGESTION_CHAPTERS.map(s => <button key={s.title} className="chip" onClick={() => { setCustomInput(s.title); generateCustomPrompts(s.title); }} style={{ padding: "10px 16px", borderRadius: 100, background: "#f5ede0", border: `1px solid ${highContrast ? "#9a7a50" : "rgba(180,140,80,0.25)"}`, fontSize: fs(14), color: tc("#5c3d1e", "#2a1000"), fontFamily: "'Lato',sans-serif", cursor: "pointer", minHeight: 44 }}>{s.icon} {s.title}</button>)}
                </div>
              </>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "#fffdf5", border: "2px solid #b8860b", borderRadius: 8 }}>
                <span style={{ fontSize: 22 }} aria-hidden="true">{customChapter.icon}</span>
                <div style={{ flex: 1 }}><span style={{ fontSize: fs(16), fontWeight: 600, color: tc("#3d2b1a", "#1a0e00") }}>{customChapter.title}</span><span style={{ fontSize: fs(13), color: "#b8860b", fontFamily: "'Lato',sans-serif", marginLeft: 8 }}>· {customChapter.prompts.length} prompts</span></div>
                <button onClick={() => { setCustomChapter(null); setCustomInput(""); }} aria-label="Remove custom chapter" style={{ background: "none", border: "2px solid rgba(180,140,80,0.3)", color: "#7a5c3a", cursor: "pointer", fontSize: 18, minWidth: 36, minHeight: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
              </div>
            )}
          </div>
          <div style={{ textAlign: "center" }}>
            <button className="start-btn" onClick={startChat}
              style={{ background: persona ? personaAvatarBg : "linear-gradient(135deg,#5c3d1e,#8b5e34)", color: "#fdf6ec", border: "none", padding: "18px 54px", borderRadius: 100, fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(19), letterSpacing: 1, cursor: "pointer", boxShadow: "0 4px 20px rgba(93,61,26,0.2)", minHeight: 58 }}>
              Begin My Interview with {persona?.name || "My Guide"} ✦
            </button>
          </div>
        </main>
      )}

      {/* ── CHAPTER PREVIEW ── */}
      {screen === "chat" && previewChapter && !showPaywall && !showBetweenSections && !bookComplete && (
        <ChapterPreview
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
      {screen === "chat" && showBetweenSections && (
        <main id="main-content" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "78vh", padding: "40px 24px", animation: "fadeUp 0.4s ease forwards" }}>
          <div style={{ maxWidth: 560, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 16 }} aria-hidden="true">{persona?.avatar || "🕊️"}</div>
            <h2 style={{ fontSize: fs(36), fontWeight: 300, fontStyle: "italic", color: tc("#3d2b1a","#1a0e00"), marginBottom: 16, lineHeight: 1.2 }}>You just did something wonderful.</h2>
            <p style={{ fontSize: fs(18), color: tc("#6b5540","#3a2510"), fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", lineHeight: 1.85, marginBottom: 36 }}>
              That first section is always the hardest — and you did it beautifully. {persona?.name || "Grace"} now knows your voice, your pace, and a little piece of your story.
            </p>
            <p style={{ fontSize: fs(16), color: tc("#7a5c3a","#4a3020"), fontFamily: "'Lato',sans-serif", lineHeight: 1.7, marginBottom: 32 }}>
              Before we move on, <strong>you're in the driver's seat.</strong> A couple of optional things you can tell {persona?.name || "Grace"} to make your book even more personal:
            </p>

            <div style={{ background: "white", borderRadius: 16, padding: "28px 32px", boxShadow: "0 8px 40px rgba(93,61,26,0.1)", border: "1px solid rgba(180,140,80,0.15)", textAlign: "left", marginBottom: 24 }}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: fs(13), color: tc("#7a5c3a","#4a3020"), fontFamily: "'Lato',sans-serif", fontWeight: 600, marginBottom: 6, letterSpacing: "0.5px" }}>
                  Is there a story you really want to make sure makes it into your book?
                </label>
                <p style={{ fontSize: fs(12), color: tc("#a89070","#6b5030"), fontFamily: "'Lato',sans-serif", marginBottom: 8, fontStyle: "italic" }}>Optional — {persona?.name || "Grace"} will find it naturally either way</p>
                <textarea value={betweenSectionAnswers.mustInclude}
                  onChange={e => setBetweenSectionAnswers(p => ({ ...p, mustInclude: e.target.value }))}
                  placeholder="A person, a moment, something that must be told..."
                  rows={2}
                  style={{ width: "100%", border: "1.5px solid rgba(180,140,80,0.3)", borderRadius: 8, padding: "10px 14px", fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(15), color: tc("#3d2b1a","#1a0e00"), background: "#fffdf5", outline: "none", resize: "none", lineHeight: 1.7, boxSizing: "border-box" }} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: fs(13), color: tc("#7a5c3a","#4a3020"), fontFamily: "'Lato',sans-serif", fontWeight: 600, marginBottom: 6, letterSpacing: "0.5px" }}>
                  Is there anything you'd prefer we don't include?
                </label>
                <p style={{ fontSize: fs(12), color: tc("#a89070","#6b5030"), fontFamily: "'Lato',sans-serif", marginBottom: 8, fontStyle: "italic" }}>Optional — your story, your boundaries</p>
                <textarea value={betweenSectionAnswers.keepPrivate}
                  onChange={e => setBetweenSectionAnswers(p => ({ ...p, keepPrivate: e.target.value }))}
                  placeholder="Anything you'd rather leave out..."
                  rows={2}
                  style={{ width: "100%", border: "1.5px solid rgba(180,140,80,0.3)", borderRadius: 8, padding: "10px 14px", fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(15), color: tc("#3d2b1a","#1a0e00"), background: "#fffdf5", outline: "none", resize: "none", lineHeight: 1.7, boxSizing: "border-box" }} />
              </div>
            </div>

            <p style={{ fontSize: fs(13), color: tc("#a89070","#6b5030"), fontFamily: "'Lato',sans-serif", marginBottom: 24, fontStyle: "italic" }}>
              Both fields are completely optional. {persona?.name || "Grace"} is wonderful at finding the right stories on her own.
            </p>

            <button onClick={() => advanceToChapter(1)}
              style={{ background: "linear-gradient(135deg,#5c3d1e,#8b5e34)", color: "#fdf6ec", border: "none", padding: "20px 52px", borderRadius: 100, fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(20), letterSpacing: 0.5, cursor: "pointer", boxShadow: "0 6px 28px rgba(93,61,26,0.25)", minHeight: 60, transition: "all 0.2s" }}>
              Continue My Story →
            </button>
          </div>
        </main>
      )}

      {screen === "chat" && showPaywall && previewChapter && (
        <main id="main-content" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "78vh", padding: "40px 24px", animation: "fadeUp 0.5s ease forwards" }}>
          <div style={{ maxWidth: 560, width: "100%", textAlign: "center" }}>

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

            {/* Pricing */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: fs(42), fontWeight: 600, color: tc("#3d2b1a","#1a0e00"), lineHeight: 1 }}>$99</div>
              <div style={{ fontSize: fs(14), color: tc("#8b7355","#5c3d1e"), fontFamily: "'Lato',sans-serif", marginTop: 4 }}>one-time · digital book included · print upgrades optional</div>
            </div>

            {/* CTA */}
            <button onClick={handlePayment}
              style={{ width: "100%", background: "linear-gradient(135deg,#5c3d1e,#8b5e34)", color: "#fdf6ec", border: "none", padding: "20px", borderRadius: 100, fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(20), letterSpacing: 1, cursor: "pointer", boxShadow: "0 6px 28px rgba(93,61,26,0.3)", marginBottom: 14, minHeight: 62, transition: "all 0.2s" }}
              onMouseEnter={e => { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 10px 36px rgba(93,61,26,0.38)"; }}
              onMouseLeave={e => { e.target.style.transform = ""; e.target.style.boxShadow = "0 6px 28px rgba(93,61,26,0.3)"; }}>
              Continue My Story — $99 ✦
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

      {/* ── CHAT ── */}
      {/* ── BOOK COMPLETE ── */}
      {screen === "chat" && bookComplete && (
        <main id="main-content" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "78vh", padding: "40px 24px", animation: "fadeUp 0.5s ease forwards" }}>
          <div style={{ maxWidth: 600, width: "100%", textAlign: "center" }}>

            <div style={{ fontSize: 64, marginBottom: 24, animation: "pulse 2s ease-in-out infinite" }} aria-hidden="true">🕊️</div>
            <p style={{ fontSize: fs(12), letterSpacing: "3px", textTransform: "uppercase", color: "#b8860b", fontFamily: "'Lato',sans-serif", marginBottom: 16 }}>Your legacy is complete</p>
            <h1 style={{ fontSize: fs(44), fontWeight: 300, color: tc("#3d2b1a","#1a0e00"), fontStyle: "italic", lineHeight: 1.2, marginBottom: 20 }}>
              {user?.firstName}, your book is ready.
            </h1>
            <p style={{ fontSize: fs(18), color: tc("#5c4a35","#2a1a0a"), lineHeight: 1.9, fontStyle: "italic", marginBottom: 40, maxWidth: 500, margin: "0 auto 40px" }}>
              Every story you've shared, every memory you've preserved — it's all here. Your family will treasure this for generations.
            </p>

            {/* Download PDF */}
            <div style={{ background: "white", borderRadius: 20, padding: "36px", boxShadow: "0 12px 48px rgba(93,61,26,0.14)", border: "1px solid rgba(180,140,80,0.2)", marginBottom: 24 }}>
              <div style={{ fontSize: 36, marginBottom: 16 }} aria-hidden="true">📖</div>
              <h2 style={{ fontSize: fs(24), fontWeight: 400, color: tc("#3d2b1a","#1a0e00"), marginBottom: 10 }}>Download Your Legacy Book</h2>
              <p style={{ fontSize: fs(15), color: tc("#6b5540","#3a2510"), fontFamily: "'Lato',sans-serif", lineHeight: 1.7, marginBottom: 24 }}>
                Your complete book — beautifully formatted with all your stories and photos — is ready to save as a PDF and share with your family.
              </p>
              <button onClick={generatePDF}
                style={{ width: "100%", background: "linear-gradient(135deg,#b8860b,#d4a843)", color: "#fdf6ec", border: "none", padding: "20px", borderRadius: 100, fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(20), letterSpacing: 0.5, cursor: "pointer", boxShadow: "0 6px 28px rgba(184,134,11,0.35)", marginBottom: 12, minHeight: 62, transition: "all 0.2s" }}>
                ✦ Download My Book as PDF
              </button>
              <p style={{ fontSize: fs(12), color: tc("#a89070","#6b5030"), fontFamily: "'Lato',sans-serif", lineHeight: 1.6 }}>
                A print preview will open — choose "Save as PDF" to keep your book forever
              </p>
            </div>

            {/* Print upgrade */}
            <div style={{ background: "white", borderRadius: 20, padding: "36px", boxShadow: "0 8px 32px rgba(93,61,26,0.08)", border: "1px solid rgba(180,140,80,0.15)", marginBottom: 24 }}>
              <div style={{ fontSize: 32, marginBottom: 14 }} aria-hidden="true">📚</div>
              <h2 style={{ fontSize: fs(22), fontWeight: 400, color: tc("#3d2b1a","#1a0e00"), marginBottom: 10 }}>Want a Printed Copy?</h2>
              <p style={{ fontSize: fs(15), color: tc("#6b5540","#3a2510"), fontFamily: "'Lato',sans-serif", lineHeight: 1.7, marginBottom: 20 }}>
                Hold your story in your hands. A professionally bound hardcover book, delivered to your door — starting at $79.
              </p>
              <PrintUpgradeCard isLast={true} promoCode={promoCode} promoInfo={promoInfo} fs={fs} tc={tc} highContrast={highContrast} userEmail={user?.email} userName={`${user?.firstName || ""} ${user?.lastName || ""}`.trim()} />
            </div>

            {/* Share */}
            <p style={{ fontSize: fs(15), color: tc("#8b7355","#5c3d1e"), fontFamily: "'Lato',sans-serif", lineHeight: 1.7, fontStyle: "italic" }}>
              Thank you for trusting us with your legacy, {user?.firstName}. 🕊️
            </p>
          </div>
        </main>
      )}

      {screen === "chat" && !previewChapter && !showPaywall && chapter && (
        <div style={{ display: "flex", flex: 1, maxWidth: 1080, margin: "0 auto", width: "100%", padding: "32px 24px", gap: 32 }}>
          {/* Sidebar */}
          <nav aria-label="Section navigation" style={{ width: 210, flexShrink: 0 }}>
            <div style={{ fontSize: fs(11), letterSpacing: "2px", textTransform: "uppercase", color: tc("#8b7355", "#4a3020"), fontFamily: "'Lato',sans-serif", marginBottom: 14 }}>Your Sections</div>
            {chapters.map((ch, idx) => {
              const chPhotos = (photos[ch.id || ch.title] || []).length;
              const isDone = idx < activeChapter;
              const isCurrent = idx === activeChapter;
              return (
                <div key={ch.id || ch.title} aria-current={isCurrent ? "step" : undefined}
                  style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 12px", borderRadius: 8, marginBottom: 4, border: `1px solid ${isCurrent ? "rgba(139,94,52,0.2)" : "transparent"}`, background: isCurrent ? "rgba(139,94,52,0.1)" : "transparent", opacity: idx > activeChapter ? 0.35 : isDone ? 0.65 : 1, minHeight: 40 }}>
                  <span style={{ fontSize: 15, width: 22, textAlign: "center" }} aria-hidden="true">{isDone ? "✓" : ch.icon}</span>
                  <span style={{ fontSize: fs(13), color: tc(isDone ? "#8b7355" : "#3d2b1a", isDone ? "#5c3d1e" : "#1a0e00"), fontFamily: "'Lato',sans-serif", fontWeight: isCurrent ? 600 : 400, flex: 1, textDecoration: isDone ? "line-through" : "none", textDecorationColor: "rgba(139,94,52,0.4)" }}>{ch.title}</span>
                  {chPhotos > 0 && <span style={{ fontSize: fs(10), color: "#b8860b" }}>📷{chPhotos}</span>}
                  {ch.isCustom && <span style={{ fontSize: fs(9), color: "#b8860b", background: "rgba(184,134,11,0.1)", padding: "2px 5px", borderRadius: 3 }}>Custom</span>}
                </div>
              );
            })}
            {/* Guide card */}
            {persona && (
              <div style={{ marginTop: 20, padding: "12px 14px", background: "white", borderRadius: 10, border: "1px solid rgba(180,140,80,0.2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: personaAvatarBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }} aria-hidden="true">{personaAvatar}</div>
                  <div style={{ fontSize: fs(13), fontWeight: 600, color: tc("#3d2b1a", "#1a0e00") }}>{persona.name}</div>
                </div>
                <div style={{ fontSize: fs(11), color: tc("#8b7355", "#5c3d1e"), fontFamily: "'Lato',sans-serif", fontStyle: "italic", lineHeight: 1.5 }}>{persona.tagline}</div>
              </div>
            )}
            </nav>

          {/* Chat area */}
          <main id="main-content" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ marginBottom: 18 }}>
              <p style={{ fontSize: fs(12), letterSpacing: "2px", textTransform: "uppercase", color: "#b8860b", fontFamily: "'Lato',sans-serif" }}>Section {activeChapter + 1} of {chapters.length}</p>
              <h2 style={{ fontSize: fs(28), fontWeight: 600, color: tc("#3d2b1a", "#1a0e00"), marginTop: 4 }}>{chapter.icon} {chapter.title}</h2>
              {userMessageCount > 0 && (
                <p style={{ fontSize: fs(12), color: tc("#a89070", "#6b5030"), fontFamily: "'Lato',sans-serif", marginTop: 6 }}>
                  {userMessageCount} {userMessageCount === 1 ? "story shared" : "stories shared"} · {chapter.prompts.length} topics to explore
                </p>
              )}
            </div>

            {/* Section intro video — shown at start of each section, dismissible */}
            {(() => {
              const chapterVideos = {
                "early-life": "4184003e4d2943b0b7c7489136f42e31",
                "becoming-you": "e6499e21f45f4dd09adedb0b58e4b595",
                "faith": "9d7bf4bb7654418593406ddb3bc42093",
                "family-love": "44e503c5182b4cb39f7330b3e9be70a5",
                "wisdom": "48986e0d7d68415faa4c19e9ac8220dd",
              };
              const videoId = chapterVideos[chapter?.id];
              if (!videoId || dismissedVideos[chapter?.id || activeChapter]) return null;
              return (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(180,140,80,0.2)", boxShadow: "0 4px 20px rgba(93,61,26,0.1)", background: "#000", position: "relative", paddingBottom: "56.25%", height: 0 }}>
                    <iframe
                      src={`https://app.heygen.com/embeds/${videoId}`}
                      title={`${chapter.title} introduction`}
                      frameBorder="0"
                      allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                      allowFullScreen
                      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                    />
                  </div>
                  <button onClick={() => setDismissedVideos(p => ({ ...p, [chapter?.id || activeChapter]: true }))}
                    style={{ display: "block", margin: "8px auto 0", background: "none", border: "1px solid rgba(180,140,80,0.3)", color: "#7a5c3a", fontFamily: "'Lato',sans-serif", fontSize: fs(12), cursor: "pointer", padding: "6px 20px", borderRadius: 100, minHeight: 32 }}>
                    ✓ Got it, let's begin
                  </button>
                </div>
              );
            })()}

            {/* Book complete celebration video */}
            {messages.some(m => m.content?.includes("extraordinary")) && (
              <div style={{ marginBottom: 16, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(180,140,80,0.2)", boxShadow: "0 4px 20px rgba(93,61,26,0.1)", background: "#000", position: "relative", paddingBottom: "56.25%", height: 0 }}>
                <iframe
                  src="https://app.heygen.com/embeds/24c71acaec054add8b55ae4053297433"
                  title="Your legacy is complete"
                  frameBorder="0"
                  allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                  allowFullScreen
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                />
              </div>
            )}

            <div role="log" aria-label="Conversation" aria-live="polite" style={{ flex: 1, overflowY: "auto", paddingBottom: 16, display: "flex", flexDirection: "column", gap: 18, minHeight: 260, maxHeight: 360 }}>

              {messages.map((msg, i) => (
                <div key={i}>
                  <div style={{ display: "flex", gap: 12, flexDirection: msg.role === "user" ? "row-reverse" : "row", animation: "fadeUp 0.35s ease forwards" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: msg.role === "user" ? 12 : 14, background: msg.role === "user" ? "linear-gradient(135deg,#b8860b,#d4a843)" : personaAvatarBg, color: "#fdf6ec", fontFamily: "'Lato',sans-serif", fontWeight: 700, marginTop: 2 }} aria-hidden="true">
                      {msg.role === "user" ? "You" : personaAvatar}
                    </div>
                    <div className={msg.role === "assistant" ? "msg-ai" : ""}
                      style={{ maxWidth: "75%", padding: "14px 18px", borderRadius: msg.role === "user" ? "14px 4px 14px 14px" : "4px 14px 14px 14px", lineHeight: 1.85, fontSize: fs(16), background: msg.role === "user" ? "linear-gradient(135deg,#5c3d1e,#7a5030)" : "white", color: msg.role === "user" ? "#fdf6ec" : tc("#3d2b1a", "#1a0e00"), boxShadow: msg.role === "user" ? "none" : "0 2px 10px rgba(93,61,26,0.07)", border: highContrast && msg.role === "assistant" ? "2px solid rgba(93,61,26,0.2)" : "none" }}
                      role={msg.role === "assistant" ? "article" : undefined}
                      aria-label={msg.role === "assistant" ? `${persona?.name || "Guide"} says` : "Your response"}>
                      {renderText(msg.content)}
                    </div>
                  </div>
                  {/* Revision UI for ghostwritten messages */}
                  {msg.role === "user" && msg.isGhostwritten && (
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6, paddingRight: 48 }}>
                      {revisingIdx === i ? (
                        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", maxWidth: "75%", width: "100%", animation: "slideDown 0.2s ease forwards" }}>
                          <div style={{ flex: 1 }}>
                            <label htmlFor={`revision-${i}`} style={{ position: "absolute", left: -9999, width: 1 }}>What needs to change?</label>
                            <input id={`revision-${i}`} value={revisionInput} onChange={e => setRevisionInput(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") reviseGhostwritten(i, msg.content, revisionInput); if (e.key === "Escape") { setRevisingIdx(null); setRevisionInput(""); } }}
                              placeholder="What's not quite right? (e.g. we didn't move right away)"
                              autoFocus
                              style={{ width: "100%", border: "1.5px solid rgba(184,134,11,0.5)", borderRadius: 8, padding: "9px 13px", fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(15), color: tc("#3d2b1a", "#1a0e00"), background: "#fffdf5", outline: "none" }} />
                          </div>
                          <button onClick={() => reviseGhostwritten(i, msg.content, revisionInput)} disabled={!revisionInput.trim() || revisingLoading}
                            style={{ background: "linear-gradient(135deg,#5c3d1e,#8b5e34)", color: "#fdf6ec", border: "none", borderRadius: 8, padding: "9px 16px", fontFamily: "'Lato',sans-serif", fontSize: fs(12), fontWeight: 600, cursor: revisionInput.trim() ? "pointer" : "not-allowed", opacity: revisionInput.trim() ? 1 : 0.4, whiteSpace: "nowrap", minHeight: 40 }}>
                            {revisingLoading ? "Fixing..." : "Fix it"}
                          </button>
                          <button onClick={() => { setRevisingIdx(null); setRevisionInput(""); }} aria-label="Cancel revision"
                            style={{ background: "none", border: "1.5px solid rgba(180,140,80,0.3)", color: "#7a5c3a", borderRadius: 8, padding: "9px 12px", cursor: "pointer", fontFamily: "'Lato',sans-serif", fontSize: fs(13), minHeight: 40 }}>✕</button>
                        </div>
                      ) : (
                        <button onClick={() => { setRevisingIdx(i); setRevisionInput(""); }}
                          style={{ background: "none", border: "none", padding: "4px 6px", color: "rgba(253,246,236,0.55)", fontFamily: "'Lato',sans-serif", fontSize: fs(11), cursor: "pointer", letterSpacing: "0.3px", minHeight: 28, display: "flex", alignItems: "center", gap: 5, transition: "color 0.15s" }}
                          onMouseEnter={e => e.target.style.color = "rgba(253,246,236,0.9)"}
                          onMouseLeave={e => e.target.style.color = "rgba(253,246,236,0.55)"}
                          aria-label="Something's not right — correct this paragraph">
                          ✦ Something's off? Correct it
                        </button>
                      )}
                    </div>
                  )}
                  {msg.role === "assistant" && i === 0 && showAngles && (
                    <div style={{ marginLeft: 48, marginTop: 14 }}>
                      <p style={{ fontSize: fs(12), color: tc("#a89070", "#5c3d1e"), fontFamily: "'Lato',sans-serif", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 10 }}>Not sure where to start? Try one of these —</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }} role="group" aria-label="Story starting points">
                        {currentAngles.map((angle, ai) => (
                          <button key={ai} className="angle-chip" onClick={() => { setAnglesUsed(true); sendMessage(angle); }}
                            style={{ background: "rgba(93,61,26,0.05)", border: `${highContrast ? 2 : 1}px solid rgba(139,94,52,0.25)`, borderRadius: 10, padding: "12px 18px", textAlign: "left", fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(16), color: tc("#5c3d1e", "#2a1000"), lineHeight: 1.5, animation: `angleIn 0.4s ${ai * 0.08}s ease both`, display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 13, color: "#b8860b", fontFamily: "'Lato',sans-serif", flexShrink: 0 }} aria-hidden="true">→</span>{angle}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div style={{ display: "flex", gap: 12 }} role="status" aria-label={`${persona?.name || "Guide"} is responding`}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: personaAvatarBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }} aria-hidden="true">{personaAvatar}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "14px 18px", background: "white", borderRadius: "4px 14px 14px 14px", boxShadow: "0 2px 10px rgba(93,61,26,0.07)" }}>
                    {[0, 0.2, 0.4].map((d, i) => <div key={i} style={{ width: 7, height: 7, background: "#c9a87a", borderRadius: "50%", animation: `bounce 1.2s ${d}s infinite` }} />)}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end", padding: "14px 16px 10px", background: "white", borderRadius: "14px 14px 0 0", border: `${highContrast ? 2 : 1}px solid ${highContrast ? "#9a7a50" : "rgba(180,140,80,0.18)"}`, borderBottom: "none" }}>
                <label htmlFor="story-input" style={{ position: "absolute", left: -9999, width: 1 }}>Your story response</label>
                <textarea id="story-input" ref={textareaRef} value={input}
                  onChange={e => { setInput(e.target.value); if (e.target.value) setAnglesUsed(true); }}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Start anywhere — there's no wrong way to begin..."
                  aria-label="Type your story here. Press Enter to send, Shift+Enter for a new line."
                  rows={1}
                  style={{ flex: 1, border: "none", outline: "none", resize: "none", fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(17), color: tc("#3d2b1a", "#1a0e00"), background: "transparent", lineHeight: 1.7, minHeight: 36, maxHeight: 140, overflowY: "auto" }} />
                <button onClick={toggleMic} aria-label={isListening ? "Stop listening" : "Start voice input"} title={isListening ? "Tap to stop" : "Tap to speak"}
                  style={{ width: 46, height: 46, borderRadius: "50%", background: isListening ? "linear-gradient(135deg,#c0392b,#e74c3c)" : "rgba(184,134,11,0.12)", border: `1.5px solid ${isListening ? "#c0392b" : "rgba(184,134,11,0.3)"}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s", minWidth: 46, animation: isListening ? "pulse 1.5s ease-in-out infinite" : "none" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect x="9" y="2" width="6" height="11" rx="3" fill={isListening ? "white" : "#b8860b"} />
                    <path d="M5 10a7 7 0 0014 0" stroke={isListening ? "white" : "#b8860b"} strokeWidth="2" strokeLinecap="round" fill="none"/>
                    <line x1="12" y1="19" x2="12" y2="22" stroke={isListening ? "white" : "#b8860b"} strokeWidth="2" strokeLinecap="round"/>
                    <line x1="9" y1="22" x2="15" y2="22" stroke={isListening ? "white" : "#b8860b"} strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
                <button className="send-btn" onClick={() => sendMessage()} disabled={!input.trim() || loading} aria-label="Send your response"
                  style={{ width: 46, height: 46, borderRadius: "50%", background: personaAvatarBg, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s", opacity: (!input.trim() || loading) ? 0.35 : 1, minWidth: 46 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M22 2L11 13" stroke="#fdf6ec" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#fdf6ec" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px 12px", background: "white", borderRadius: "0 0 14px 14px", border: `${highContrast ? 2 : 1}px solid ${highContrast ? "#9a7a50" : "rgba(180,140,80,0.18)"}`, borderTop: "1px solid rgba(180,140,80,0.1)" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: fs(13), color: tc("#b8a070", "#6b5030"), fontFamily: "'Lato',sans-serif", fontStyle: "italic" }}>
                    Or just start typing and {persona?.name || "I"}'ll help you shape it into your story
                  </span>
                  <span style={{ fontSize: fs(12), color: tc("#c4a882", "#8b7355"), fontFamily: "'Lato',sans-serif" }}>
                    🎤 Tap the microphone to speak — or use your keyboard mic on mobile
                  </span>
                </div>
                <button className="help-btn" onClick={helpMeWrite} disabled={!input.trim() || writingHelp} aria-label="Help me write this"
                  style={{ background: input.trim() ? "rgba(184,134,11,0.1)" : "transparent", border: `${highContrast ? 2 : 1}px solid ${input.trim() ? "rgba(184,134,11,0.35)" : "rgba(180,140,80,0.2)"}`, color: input.trim() ? tc("#7a5030", "#3d2b1a") : tc("#c4a882", "#8b7355"), fontFamily: "'Lato',sans-serif", fontSize: fs(12), fontWeight: 600, padding: "8px 16px", borderRadius: 100, cursor: input.trim() ? "pointer" : "default", whiteSpace: "nowrap", minHeight: 40 }}>
                  {writingHelp ? "Shaping your story..." : `✦ Help me write this`}
                </button>
              </div>
            </div>

            {/* Photos */}
            <div style={{ marginTop: 10 }}>
              <button className="photo-btn" onClick={() => setShowPhotoPanel(v => !v)} aria-expanded={showPhotoPanel} aria-controls="photo-panel"
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: showPhotoPanel ? "rgba(184,134,11,0.08)" : "rgba(253,246,236,0.9)", border: `${highContrast ? 2 : 1.5}px solid rgba(180,140,80,0.3)`, borderRadius: 10, cursor: "pointer", width: "fit-content", minHeight: 44 }}>
                <span aria-hidden="true">📷</span>
                <span style={{ fontSize: fs(13), color: tc("#5c3d1e", "#2a1000"), fontFamily: "'Lato',sans-serif" }}>
                  {(photos[chapter.id || chapter.title] || []).length > 0 ? `${(photos[chapter.id || chapter.title] || []).length} photo${(photos[chapter.id || chapter.title] || []).length !== 1 ? "s" : ""} added` : "Add photos to this chapter"}
                </span>
                <span style={{ fontSize: 11, color: "#b8860b", fontFamily: "'Lato',sans-serif" }} aria-hidden="true">{showPhotoPanel ? "▲" : "▼"}</span>
              </button>
              {showPhotoPanel && (
                <div id="photo-panel" style={{ background: "white", borderRadius: 12, border: "1px solid rgba(180,140,80,0.2)", padding: "14px 16px", marginTop: 8, animation: "slideDown 0.25s ease forwards" }}>
                  {chapter.photoPrompt && <p style={{ fontSize: fs(14), color: tc("#6b5540", "#3d2b1a"), fontStyle: "italic", marginBottom: 10, lineHeight: 1.65 }}>💡 {chapter.photoPrompt}</p>}
                  <PhotoUpload chapterId={chapter.id || chapter.title} photos={photos} onAdd={addPhoto} onRemove={removePhoto} fs={fs} />
                </div>
              )}
            </div>

            {showChapterControls && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginTop: 14 }}>
                <button className="complete-btn" onClick={chapterComplete}
                  style={{ background: "linear-gradient(135deg,#5c3d1e,#8b5e34)", color: "#fdf6ec", border: "none", padding: "14px 36px", borderRadius: 100, fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: fs(17), letterSpacing: 0.5, cursor: "pointer", boxShadow: "0 4px 16px rgba(93,61,26,0.2)", minHeight: 52, transition: "all 0.2s" }}>
                  ✦ This section feels complete
                </button>
                <button className="next-btn" onClick={exploreNewAngle} disabled={loading}
                  style={{ background: "transparent", border: `${highContrast ? 2 : 1.5}px solid rgba(180,140,80,0.4)`, color: tc("#7a5030", "#3d2b1a"), fontFamily: "'Lato',sans-serif", fontSize: fs(12), letterSpacing: "1px", textTransform: "uppercase", padding: "10px 22px", borderRadius: 100, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.4 : 1, minHeight: 44, transition: "all 0.2s" }}>
                  Take me somewhere new in this section →
                </button>
              </div>
            )}
          </main>
        </div>
      )}

      {toast && (
        <div key={toast.key} role="status" style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: highContrast ? "#1a0e00" : "#3d2b1a", color: "#fdf6ec", padding: "12px 28px", borderRadius: 100, fontFamily: "'Lato',sans-serif", fontSize: fs(13), animation: "toast 2.2s ease forwards", pointerEvents: "none", border: highContrast ? "2px solid #b8860b" : "none" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
