import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const now = new Date().getTime()

    const page = Math.max(1, parseInt(searchParams.get('page')) || 1)
    const limit = Math.min(50, parseInt(searchParams.get('limit')) || 10)
    const offset = (page - 1) * limit

    let results
    switch (type) {
      case 'all':
        results = await query(
          `SELECT * FROM events ORDER BY openDate DESC LIMIT ${limit} OFFSET ${offset}`
        )
        break

      case 'active':
        results = await query(
          `SELECT * FROM events WHERE openDate < ? AND closeDate > ? ORDER BY openDate DESC LIMIT ${limit} OFFSET ${offset}`,
          [now, now]
        )
        break

      default:
        return NextResponse.json(
          { message: 'Invalid type parameter' },
          { status: 400 }
        )
    }

    // Parse attachments for each event
    const events = JSON.parse(JSON.stringify(results))
    events.forEach(event => {
      if (event.attachments) {
        try {
          event.attachments = JSON.parse(event.attachments)
        } catch (e) {
          event.attachments = []
        }
      } else {
        event.attachments = []
      }
    })

    return NextResponse.json(events)

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    let { type } = body
    let { from, to } = body

    from = parseInt(from) || 0
    to = parseInt(to) || 10

    if (from < 0) from = 0
    if (to <= from) to = from + 10

    const limit = Math.max(1, Math.min(50, to - from))
    const offset = Math.max(0, from)

    let results
    switch (type) {
      case 'all':
        results = await query(
          `SELECT * FROM events 
           ORDER BY timestamp DESC
           LIMIT ${limit} OFFSET ${offset}`
        )
        break

      case 'range':
        const { start_date, end_date } = body
        results = await query(
          `SELECT * FROM events 
           WHERE closeDate <= ? AND openDate >= ? 
           ORDER BY openDate DESC
           LIMIT ${limit} OFFSET ${offset}`,
          [end_date, start_date]
        )
        break

      default:
        return NextResponse.json(
          { message: 'Invalid type parameter' },
          { status: 400 }
        )
    }

    // Parse attachments for each event
    const events = JSON.parse(JSON.stringify(results))
    events.forEach(event => {
      if (event.attachments) {
        try {
          event.attachments = JSON.parse(event.attachments)
        } catch (e) {
          event.attachments = []
        }
      } else {
        event.attachments = []
      }
    })

    return NextResponse.json(events)

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    )
  }
} 