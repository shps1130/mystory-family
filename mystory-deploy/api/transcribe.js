// api/transcribe.js
// Takes an uploaded audio file URL (Supabase storage) and returns a transcript
// with speaker labels, using Deepgram's pre-recorded API.
//
// Requires env var: DEEPGRAM_API_KEY

export const config = {
  maxDuration: 300, // allow up to 5 minutes for long recordings
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
  if (!DEEPGRAM_API_KEY) {
    return res.status(500).json({ error: 'Transcription is not configured' });
  }

  try {
    const { audioUrl } = req.body;
    if (!audioUrl) {
      return res.status(400).json({ error: 'No audio URL provided' });
    }

    // Deepgram fetches the file directly from the URL.
    // diarize=true gives us speaker labels; punctuate + paragraphs make it readable.
    const params = new URLSearchParams({
      model: 'nova-2',
      diarize: 'true',
      punctuate: 'true',
      paragraphs: 'true',
      smart_format: 'true',
      language: 'en',
    });

    const dgResponse = await fetch(
      `https://api.deepgram.com/v1/listen?${params.toString()}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${DEEPGRAM_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: audioUrl }),
      }
    );

    if (!dgResponse.ok) {
      const detail = await dgResponse.text();
      console.error('Deepgram error:', dgResponse.status, detail);
      return res.status(502).json({
        error: 'Transcription service error',
        details: `Deepgram returned ${dgResponse.status}`,
      });
    }

    const data = await dgResponse.json();
    const alt = data?.results?.channels?.[0]?.alternatives?.[0];

    if (!alt) {
      return res.status(502).json({ error: 'No transcript returned' });
    }

    // Build a readable transcript with speaker labels.
    let transcript = '';
    const paragraphs = alt.paragraphs?.paragraphs;

    if (paragraphs && paragraphs.length > 0) {
      let lastSpeaker = null;
      for (const para of paragraphs) {
        const speaker = para.speaker;
        const sentences = (para.sentences || []).map(s => s.text).join(' ');
        if (!sentences.trim()) continue;
        if (speaker !== lastSpeaker) {
          transcript += `\n\nSPEAKER ${speaker + 1}: ${sentences}`;
          lastSpeaker = speaker;
        } else {
          transcript += ` ${sentences}`;
        }
      }
      transcript = transcript.trim();
    } else {
      transcript = alt.transcript || '';
    }

    if (!transcript.trim()) {
      return res.status(502).json({ error: 'Transcript came back empty' });
    }

    const durationSeconds = data?.metadata?.duration || null;

    return res.status(200).json({ transcript, durationSeconds });
  } catch (error) {
    console.error('Error in transcribe:', error);
    return res.status(500).json({ error: 'Something went wrong', details: error.message });
  }
}
