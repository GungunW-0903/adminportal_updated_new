import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { depList } from '@/lib/const'
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const page = Math.max(1, parseInt(searchParams.get('page')) || 1)
    const limit = Math.min(50, parseInt(searchParams.get('limit')) || 10)
    const offset = (page - 1) * limit

    let results = []
    let total = 0
    switch (type) {
      case 'all':
        const count1 = await query(`SELECT COUNT(*) as count FROM sponsored_projects`)
        const count2 = await query(`SELECT COUNT(*) as count FROM consultancy_projects`)

        total = Number(count1[0].count) + Number(count2[0].count)
        const sponsored = await query(
          `SELECT * FROM sponsored_projects ORDER BY end_date DESC LIMIT ${limit} OFFSET ${offset}`
        )

        const consultancy = await query(
          `SELECT * FROM consultancy_projects ORDER BY start_date DESC LIMIT ${limit} OFFSET ${offset}`
        )       
        results = [...sponsored, ...consultancy]
        
        return NextResponse.json({
          page,
          limit,
          offset,
          total,
          totalPages : Math.ceil( total / limit),
          data : results
        });

        case 'count':{
          const sponsoredCount = await query(
          `SELECT COUNT(*) as count FROM sponsored_projects`
        )

        const consultancyCount = await query(
          `SELECT COUNT(*) as count FROM consultancy_projects`
        )
          
        return NextResponse.json({
          projectCount:
            parseInt(sponsoredCount[0].count) +
            parseInt(consultancyCount[0].count)
        })
      }
      default:
        if (depList.has(type)) {

          const dept = depList.get(type)

          const count1 = await query(
            `SELECT COUNT(*) as count 
             FROM user u 
             JOIN sponsored_projects sp ON u.email = sp.email 
             WHERE u.department = ?`,
            [dept]
          )

          const count2 = await query(
            `SELECT COUNT(*) as count 
             FROM user u 
             JOIN consultancy_projects cp ON u.email = cp.email 
             WHERE u.department = ?`,
            [dept]
          )

          total =Number( count1[0].count) + Number(count2[0].count)

          const sponsored = await query(
            `SELECT * 
             FROM user u 
             JOIN sponsored_projects sp ON u.email = sp.email 
             WHERE u.department = ?
             ORDER BY sp.end_date DESC
             LIMIT ${limit} OFFSET ${offset}`,
            [dept]
          )

          const consultancy = await query(
            `SELECT * 
             FROM user u 
             JOIN consultancy_projects cp ON u.email = cp.email 
             WHERE u.department = ?
             ORDER BY cp.start_date DESC
             LIMIT ${limit} OFFSET ${offset}`,
            [dept]
          )

          results = [...sponsored, ...consultancy]

          return NextResponse.json({
            page,
            limit,
            offset,
            total,
            totalPages: Math.ceil(total / limit),
            data: results
          })
        }
          return NextResponse.json(
            { message: 'Invalid type parameter' },
            { status: 400 }
          )
        
    }

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
    const { type, department, from=0, to=10 } = body

    const limit = Math.max(1, Math.min(50, to - from))
    const offset = Math.max(0, from)

    let results = []
    let total = 0
    switch (type) {

      case 'department': {
        const dept = department

        const count1 = await query(
          `SELECT COUNT(*) as count 
           FROM sponsored_projects sp 
           JOIN user u ON u.email = sp.email 
           WHERE u.department = ?`,
          [dept]
        )

        const count2 = await query(
          `SELECT COUNT(*) as count 
           FROM consultancy_projects cp 
           JOIN user u ON u.email = cp.email 
           WHERE u.department = ?`,
          [dept]
        )

        total = count1[0].count + count2[0].count

        const sponsored = await query(
          `SELECT * 
           FROM sponsored_projects sp 
           JOIN user u ON u.email = sp.email 
           WHERE u.department = ?
           ORDER BY sp.end_date DESC
           LIMIT ${limit} OFFSET ${offset}`,
          [dept]
        )

        const consultancy = await query(
          `SELECT * 
           FROM consultancy_projects cp 
           JOIN user u ON u.email = cp.email 
           WHERE u.department = ?
           ORDER BY cp.start_date DESC
           LIMIT ${limit} OFFSET ${offset}`,
          [dept]
        )

        results = [...sponsored, ...consultancy]

        break
      }
      case 'faculty':{
        const { email } = body

        const sponsored = await query(
          `SELECT * FROM sponsored_projects 
           WHERE email = ?
           ORDER BY end_date DESC`,
          [email]
        )

        const consultancy = await query(
          `SELECT * FROM consultancy_projects 
           WHERE email = ?
           ORDER BY start_date DESC`,
          [email]
        )

        results = [...sponsored, ...consultancy]
        total = results.length

        break
      }

      case 'range':{
        // Get projects within date range
       const { start_date, end_date } = body

        const sponsored = await query(
          `SELECT * FROM sponsored_projects 
           WHERE start_date >= ? AND end_date <= ?
           ORDER BY end_date DESC
           LIMIT ${limit} OFFSET ${offset}`,
          [start_date, end_date]
        )

        const consultancy = await query(
          `SELECT * FROM consultancy_projects 
           WHERE start_date >= ? AND end_date <= ?
           ORDER BY end_date DESC
           LIMIT ${limit} OFFSET ${offset}`,
          [start_date, end_date]
        )

        results = [...sponsored, ...consultancy]
        total = results.length

        break
      }
      case 'search':{
        // Search projects by keyword
        const { keyword = '' } = body

        const sponsored = await query(
          `SELECT * FROM sponsored_projects 
           WHERE project LIKE ? OR sponsor LIKE ?
           ORDER BY end_date DESC
           LIMIT ${limit} OFFSET ${offset}`,
          [`%${keyword}%`, `%${keyword}%`]
        )

        const consultancy = await query(
          `SELECT * FROM consultancy_projects 
           WHERE project LIKE ? OR sponsor LIKE ?
           ORDER BY end_date DESC
           LIMIT ${limit} OFFSET ${offset}`,
          [`%${keyword}%`, `%${keyword}%`]
        )

        results = [...sponsored, ...consultancy]
        total = results.length

        break
      }

      default:
        return NextResponse.json(
          { message: 'Invalid type parameter' },
          { status: 400 }
        )
    }

    return NextResponse.json(results)

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    )
  }
} 