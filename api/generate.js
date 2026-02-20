// api/generate.js - Vercel Edge Function for Ologundudu

export const config = {
  runtime: 'edge',
};

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const PLATFORM_CONFIGS = {
  blog: { maxTokens: 2000, description: 'Full blog post, 800-1200 words with headers' },
  newsletter: { maxTokens: 1200, description: 'Email newsletter with subject line' },
  whatsapp: { maxTokens: 800, description: 'Mobile messaging, short paragraphs' },
  instagram: { maxTokens: 600, description: 'Caption with 5-7 hashtags' },
  facebook: { maxTokens: 800, description: 'Community post, 2-3 paragraphs' },
  linkedin: { maxTokens: 1000, description: 'Professional, policy-focused' },
  tiktok: { maxTokens: 600, description: '60s video script with [VISUAL] cues' },
  snapchat: { maxTokens: 300, description: 'Brief update under 100 words' },
  x: { maxTokens: 800, description: 'Thread format numbered 1/, 2/, etc.' },
  rednote: { maxTokens: 1000, description: 'Narrative storytelling style' }
};

const VOICE_PROMPTS = {
  civic: `You are the Voice of Ologundudu - Agege Civic Chronicle.
TONE: Institutional, authoritative, dignified.
STYLE: Long compound sentences, formal vocabulary, praise framing.
PHRASES: Use "We commend," "Furthermore," "Consequently," "It is imperative."
AVOID: Contractions, slang, aggressive criticism.
CLOSING: Forward-looking civic call-to-action.
REFERENCE: Agege landmarks - Pen Cinema, Ogba, Orile Agege, Abule Egba, Iju, Ojuwoye.`,

  reflective: `You are the Voice of Ologundudu - Agege Civic Chronicle.
TONE: Warm, encouraging, elder wisdom.
OPENING: Start with Nigerian/Yoruba proverb about community/unity.
PHRASES: Use "My brothers and sisters in Agege," "Let us reflect," "Together we can."
STYLE: Philosophical reflection, mindset focus, hopeful.
CLOSING: Blessing or collective responsibility call.
PROVERBS: "Ile la tin ko eso re," "Ajo o dabi ile," "Bi a ba n gunyan ni a o maa gun owo.`
};

export default async function handler(request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const { text, platforms, voice, contextNews } = await request.json();

    if (!text || !platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing text or platforms' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    if (platforms.length > 3) {
      return new Response(JSON.stringify({ error: 'Maximum 3 platforms per request' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Build context from recent news
    let contextPrompt = '';
    if (contextNews && contextNews.length > 0) {
      contextPrompt = `\n\nRELEVANT LOCAL CONTEXT (reference these developments):\n${contextNews.slice(0, 3).map(n => `• ${n.title} (${n.source})`).join('\n')}`;
    }

    const systemPrompt = VOICE_PROMPTS[voice] || VOICE_PROMPTS.civic;

    // Generate for each platform in parallel
    const results = await Promise.all(
      platforms.map(async (platform) => {
        const config = PLATFORM_CONFIGS[platform];
        if (!config) {
          return { platform, content: `[Error: Unknown platform ${platform}]`, success: false };
        }

        const userPrompt = `Rewrite this content for ${platform.toUpperCase()}:

"${text}"${contextPrompt}

FORMAT: ${config.description}
Requirements:
- Adapt tone and length for ${platform}
- Maintain factual accuracy
- Include relevant local context if provided
- Return ONLY the ${platform} content, no explanations`;

        try {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
              ],
              max_tokens: config.maxTokens,
              temperature: 0.7,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI ${response.status}: ${errorText}`);
          }

          const data = await response.json();
          const content = data.choices[0]?.message?.content?.trim();

          if (!content) {
            throw new Error('Empty response from OpenAI');
          }

          return { platform, content, success: true };

        } catch (error) {
          console.error(`Error generating ${platform}:`, error);
          return { 
            platform, 
            content: `[Error generating ${platform}: ${error.message}]`, 
            success: false 
          };
        }
      })
    );

    const output = {};
    results.forEach(r => output[r.platform] = r.content);

    return new Response(JSON.stringify({
      success: true,
      platforms: output,
      generated: platforms,
      voice: voice || 'civic',
      timestamp: new Date().toISOString(),
    }), { headers: corsHeaders });

  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}
