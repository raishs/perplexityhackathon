import { NextRequest, NextResponse } from 'next/server'
import fetch from 'node-fetch'

export async function POST(req: NextRequest) {
  const { query } = await req.json()
  const apiKey = process.env.PERPLEXITY_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing Perplexity API key' }, { status: 500 })
  }

  console.log('Making request to Perplexity API...')
  try {
    const requestBody = {
      model: 'sonar-pro',
      messages: [
        { role: 'system', content: 'Be precise and concise.' },
        { role: 'user', content: query },
      ],
    }
    console.log('Request body:', JSON.stringify(requestBody, null, 2))

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'accept': 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
      timeout: 30000, // 30 second timeout
    })
    
    clearTimeout(timeout);
    
    console.log('Perplexity API status:', res.status)
    console.log('Perplexity API headers:', res.headers.raw())
    
    const text = await res.text();
    console.log('Perplexity API raw response:', text);
    
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (err) {
      console.error('Failed to parse JSON:', err, text);
      return NextResponse.json({ 
        error: 'Invalid JSON response', 
        details: text,
        parseError: err instanceof Error ? err.message : String(err)
      }, { status: 500 });
    }
    
    if (!res.ok) {
      return NextResponse.json({ 
        error: 'Perplexity API error', 
        details: data, 
        status: res.status 
      }, { status: res.status });
    }
    
    return NextResponse.json(data);
  } catch (e) {
    const err = e as Error;
    console.error('Request failed:', {
      message: err.message,
      name: err.name,
      stack: err.stack,
      cause: err.cause
    });
    
    // Handle specific error types
    if (err.name === 'AbortError') {
      return NextResponse.json({ 
        error: 'Request timeout', 
        details: 'The request to Perplexity API timed out after 30 seconds'
      }, { status: 504 });
    }
    
    if (err.message.includes('certificate')) {
      return NextResponse.json({ 
        error: 'SSL/TLS Error', 
        details: 'Failed to establish secure connection to Perplexity API'
      }, { status: 502 });
    }
    
    if (err.message.includes('ENOTFOUND')) {
      return NextResponse.json({ 
        error: 'DNS Error', 
        details: 'Could not resolve Perplexity API hostname'
      }, { status: 502 });
    }
    
    return NextResponse.json({ 
      error: 'Request failed', 
      details: err.message,
      name: err.name,
      stack: err.stack,
      cause: err.cause
    }, { status: 500 });
  }
} 