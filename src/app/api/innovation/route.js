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
          `SELECT * FROM innovation ORDER BY openDate DESC LIMIT ${limit} OFFSET ${offset}`
        )
        break

      case 'active':
        results = await query(
          `SELECT * FROM innovation 
           WHERE openDate < ? AND closeDate > ? 
           ORDER BY openDate DESC
           LIMIT ${limit} OFFSET ${offset}`,
          [now, now]
        )
        break

      case 'count':
        const countResult = await query(
          `SELECT COUNT(*) as count FROM innovation`
        )
        return NextResponse.json({ 
          count: countResult[0].count 
        })

      default:
        // If type is an ID, fetch specific innovation
        if (type) {
          results = await query(
            `SELECT * FROM innovation WHERE id = ?`,
            [type]
          )
        } else {
          return NextResponse.json(
            { message: 'Invalid type parameter' },
            { status: 400 }
          )
        }
    }

    // Parse image JSON for each result
    const innovations = JSON.parse(JSON.stringify(results))
    innovations.forEach(innovation => {
      if (innovation.image) {
        innovation.image = JSON.parse(innovation.image)
      }
    })

    return NextResponse.json(innovations)

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
    const { type } = body
    
    let { from, to} = body
    from = parseInt(from) || 0
    to = parseInt(to) || 10

    if (from < 0) from = 0
    if (to <= from) to = from + 10

    const limit = Math.max(1, Math.min(50, to - from))
    const offset = Math.max(0, from)

    let results
    switch (type) {
      case 'range':
        const { start_date, end_date } = body
        results = await query(
          `SELECT * FROM innovation 
           WHERE closeDate <= ? AND openDate >= ? 
           ORDER BY openDate DESC LIMIT ${limit} OFFSET ${offset}`,
          [end_date, start_date]
        )
        break

      case 'between':
        results = await query(
          `SELECT * FROM innovation 
           ORDER BY openDate DESC 
           LIMIT ${limit} OFFSET ${offset}`
        )
        break

      default:
        return NextResponse.json(
          { message: 'Invalid type parameter' },
          { status: 400 }
        )
    }

    // Parse image JSON for each result
    const innovations = JSON.parse(JSON.stringify(results))
    innovations.forEach(innovation => {
      if (innovation.image) {
        try {
          innovation.image = JSON.parse(innovation.image)
        } catch {
          innovation.image = []
        }
      } else {
        innovation.image = []
      }
    })

    return NextResponse.json(innovations)

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    )
  }
} 