// api/generate.js - Vercel Serverless Function
// Lightweight, timeout-safe API for selective platform generation

export const config = {
  runtime: 'edge', // Edge runtime for speed
  maxDuration: 10, // Keep under Vercel limits
};

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const PLATFORM_PROMPTS = {
  blog: {
    system: 'You are a civic journalist writing for Agege Local Government. Use institutional tone, long compound sentences, praise framing, formal civic language. 800-1200 words.',
    format: 'Full blog post with headers',
    max_tokens: 2000
  },
  newsletter: {
    system: 'Write a professional email newsletter. Include subject line and body. Formal but readable tone.',
    format: 'Subject line + Email body',
    max_tokens: 1000
  },
  whatsapp: {
    system: 'Write for WhatsApp messaging. Block paragraphs, minimal formatting, conversational but respectful. Mobile-optimized.',
    format: 'WhatsApp message',
    max_tokens: 800
  },
  instagram: {
    system: 'Write Instagram caption. Shorter format, line breaks, engaging tone, include 5-7 civic hashtags at end.',
    format: 'Instagram caption with hashtags',
    max_tokens: 600
  },
  facebook: {
    system: 'Write Facebook community post. 2-3 paragraphs, community-focused, discussion-inviting.',
    format: 'Facebook post',
    max_tokens: 800
  },
  linkedin: {
    system: 'Write LinkedIn professional post. Policy-oriented, formal tone, no emojis, professional insights.',
    format: 'LinkedIn article',
    max_tokens: 1000
  },
  tiktok: {
    system: 'Write TikTok video script. Include [VISUAL] and [AUDIO] cues. 60-second script, punchy sentences.',
    format: 'TikTok script with cues',
    max_tokens: 600
  },
  snapchat: {
    system: 'Write Snapchat update. Very brief, under 100 words, punchy hook, immediate.',
    format: 'Snapchat text',
    max_tokens: 300
  },
  x: {
    system: 'Write Twitter/X thread. Numbered format (1/, 2/, etc). Max 280 chars per tweet. 3-5 tweets.',
    format: 'Twitter thread',
    max_tokens: 800
  },
  rednote: {
    system: 'Write RedNote narrative. Storytelling style, observational, reflective tone, personal narrative.',
    format: 'RedNote story',
    max_tokens: 1000
  }
};

const VOICE_DNA = {
  civic: `VOICE: Civic Amplification
- Institutional, authoritative tone
- Long, flowing compound sentences
- Praise framing: acknowledge efforts before noting improvements
- Community impact emphasis
- Formal closings with civic call-to-action
- Use "We commend," "Furthermore," "Consequently"
- NO contractions, NO slang, NO aggressive tones
- Reference Agege landmarks: Pen Cinema, Ogba, Orile Agege, Abule Egba, Iju`,

  reflective: `VOICE: Reflective Motivational
- Open with Nigerian/Yoruba proverb
- Encouraging, warm tone like elder wisdom
- Philosophical reflection on community
- Mindset call-to-action: "Let us," "Together we can"
- Close with hope and collective responsibility
- Use "My brothers and sisters in Agege..."
- Proverbs: "Ile la tin ko eso re," "Ajo o dabi ile"
- Focus on unity, resilience, shared values`
};

export default async function handler(request) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers, status: 200 });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers,
    });
  }

  try {
    const { text, platforms, voice, contextNews = [] } = await request.json();

    // Validation
    if (!text || !platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: text and platforms array' 
      }), { status: 400, headers });
    }

    if (platforms.length > 3) {
      return new Response(JSON.stringify({ 
        error: 'Maximum 3 platforms per request to avoid timeouts' 
      }), { status: 400, headers });
    }

    // Build context
    let contextPrompt = '';
    if (contextNews.length > 0) {
      contextPrompt = `\n\nRELEVANT LOCAL CONTEXT:\n${contextNews.map((n, i) => 
        `[${i + 1}] ${n.title} (${n.source})`
      ).join('\n')}\n\nReference these local developments where relevant.`;
    }

    // Generate for each selected platform (parallel)
    const results = await Promise.all(
      platforms.map(async (platform) => {
        const config = PLATFORM_PROMPTS[platform];
        if (!config) return { platform, error: 'Unknown platform' };

        const voicePrompt = VOICE_DNA[voice] || VOICE_DNA.civic;
        
        const prompt = `${voicePrompt}

${config.system}

CONTENT TO REWRITE:
"""
${text}
"""${contextPrompt}

FORMAT: ${config.format}
Write ONLY the ${platform} content. No explanations, no markdown code blocks.`;

        try {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini', // Fast, cheap, effective
              messages: [
                { role: 'system', content: voicePrompt },
                { role: 'user', content: prompt }
              ],
              max_tokens: config.max_tokens,
              temperature: 0.7,
            }),
          });

          if (!response.ok) {
            throw new Error(`OpenAI error: ${response.status}`);
          }

          const data = await response.json();
          const content = data.choices[0]?.message?.content?.trim() || '';
          
          return { platform, content, success: true };
        } catch (error) {
          return { 
            platform, 
            error: error.message, 
            success: false,
            content: `[Error generating ${platform}: ${error.message}]`
          };
        }
      })
    );

    // Build response object
    const output = {};
    results.forEach(r => {
      output[r.platform] = r.content;
    });

    return new Response(JSON.stringify({
      success: true,
      platforms: output,
      generated: platforms,
      voice: voice || 'civic',
      timestamp: new Date().toISOString()
    }), { headers, status: 200 });

  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), { status: 500, headers });
  }
}

