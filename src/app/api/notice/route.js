import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { administrationList, depList } from '@/lib/const'
import { off } from 'node:cluster'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const now = new Date().getTime()

    const page = Math.max(1, parseInt(searchParams.get('page')) || 1)
    const limit = Math.min(50, parseInt(searchParams.get('limit')) || 10)
    const offset = (page - 1) * limit

    let results = []
    let total = 0

    switch (type) {
      case 'all':{

        const countRes = await query(
          `SELECT COUNT(*) as count FROM notices`
        )
        total = countRes[0].count

        results = await query(
          `SELECT * FROM notices 
           ORDER BY timestamp DESC
           LIMIT ${limit} OFFSET ${offset}`
        )
        
        return NextResponse.json({
          page,
          limit,
          total,
          totalPages : Math.ceil(total/limit),
          data : results
        })
      }
      case "tender":{
        const countRes = await query(
          `SELECT COUNT(*) as count FROM notices WHERE notice_type="tender"`
        )
        total = countRes[0].count

        results=await query(
          `SELECT * FROM notices 
          where notice_type="tender"
           ORDER BY timestamp DESC
           LIMIT ${limit} OFFSET ${offset}`
        )
        return NextResponse.json({
          page,
          limit,
          offset,
          total,
          totalPages: Math.ceil(total / limit),
          data: results
        })
      }
      case 'whole':{
        const countRes = await query(
          `SELECT COUNT(*) as count FROM notices`
        )
        total = countRes[0].count

        results = await query(
          `SELECT * FROM notices 
           ORDER BY openDate DESC
           LIMIT ${limit} OFFSET ${offset}`
        )
        return NextResponse.json({
          limit,
          offset,
          total,
          totalPages: Math.ceil(total / limit),
          data: results
        })
      }
      case 'active':{
        const now = Date.now()

        const countRes = await query(
          `SELECT COUNT(*) as count FROM notices
           WHERE notice_type='general'
           AND openDate < ? AND closeDate > ?`,
          [now, now]
        )
        total = countRes[0].count

        results = await query(
          `SELECT * FROM notices 
           WHERE notice_type = 'general' 
           AND openDate < ? AND closeDate > ? 
           ORDER BY openDate DESC
           LIMIT ${limit} OFFSET ${offset}`,
           [now, now]
        )
        return NextResponse.json({
          page,
          limit,
          offset,
          total,
          totalPages: Math.ceil(total / limit),
          data: results
        })
      }
      case 'academics':{
        const countRes = await query(
          `SELECT COUNT(*) as count FROM notices WHERE notice_type='academics'`
        )
        total = countRes[0].count

        results = await query(
          `SELECT * FROM notices 
           WHERE notice_type = 'academics'
           ORDER BY timestamp DESC
           LIMIT ${limit} OFFSET ${offset}`
        )
        return NextResponse.json({
          page,
          limit,
          offset,
          total,
          totalPages: Math.ceil(total / limit),
          data: results
        })
      }
      default:
        // Check if it's an administration notice type
        if (administrationList.has(type)) {

          const countRes = await query(
            `SELECT COUNT(*) as count FROM notices WHERE notice_type = ?`,
            [type]
          )
          total = countRes[0].count

          results = await query(
            `SELECT * FROM notices 
             WHERE notice_type = ? 
             ORDER BY timestamp DESC
             LIMIT ${limit} OFFSET ${offset}`,
            [type]
          )
          return NextResponse.json({
            page,
            limit,
            offset,
            total,
            totalPages: Math.ceil(total / limit),
            data: results
          })
        }
        // Check if it's a department notice
        else if (depList.has(type)) {
          const countRes = await query(
            `SELECT COUNT(*) as count FROM notices
             WHERE notice_type='department' AND department = ?`,
            [depList.get(type)]
          )
          total = countRes[0].count

          results = await query(
            `SELECT * FROM notices 
             WHERE notice_type = 'department' 
             AND department = ? 
             ORDER BY timestamp DESC
             LIMIT ${limit} OFFSET ${offset}`,
            [depList.get(type)]
          )
          return NextResponse.json({
            page,
            limit,
            offset,
            total,
            totalPages: Math.ceil(total / limit),
            data: results
          })
        }
        else {
          return NextResponse.json(
            { message: 'Invalid type parameter' },
            { status: 400 }
          )
        }
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
    let { 
      type,
      start_date,
      end_date,
      department,
      notice_type,
      from,
      to,
      keyword = '',
    } = body

    let results = []
    let total = 0

    const pageSize = Math.max(1, Math.min(100, (to || 15) - (from || 0)))
    const offset = Math.max(0, from || 0)
    const page = Math.floor(offset / pageSize) + 1
    

  
    // For ACADEMIC_ADMIN, always filter for academic notices
    if (notice_type === 'academics') {
      const countRes = await query(
        `SELECT COUNT(*) as count FROM notices WHERE notice_type='academics'`
      )
      total = countRes[0].count
      
      results = await query(
        `SELECT * FROM notices 
         WHERE notice_type = ?
         ORDER BY openDate DESC 
         LIMIT ${limit} OFFSET ${offset}`,
        ['academics']
      )
    } 
    // For DEPT_ADMIN, filter for department notices of their department
    else if (notice_type === 'department' && department) {

      const countRes = await query(
        `SELECT COUNT(*) as count FROM notices 
         WHERE notice_type='department' AND department=?`,
        [department]
      )
      total = countRes[0].count
      
      results = await query(
        `SELECT * FROM notices 
         WHERE notice_type = ? AND department = ?
         ORDER BY openDate DESC 
         LIMIT ${limit} OFFSET ${offset}`,
        ['department', department]
      )
    } else {
      switch (type) {
        case 'range':
          const countRes = await query(
            `SELECT COUNT(*) as count FROM notices 
             WHERE title LIKE ?`,
            [`%${keyword}%`]
          )
          total = countRes[0].count
          
          if (!notice_type) {
            results = await query(
              `SELECT * FROM notices 
               WHERE title LIKE ? 
               ORDER BY openDate DESC 
               LIMIT ${rangeLimit} OFFSET ${rangeOffset}`,
              [`%${keyword}%`]
            )
          } else if (notice_type !== 'department') {
            results = await query(
              `SELECT * FROM notices 
               WHERE notice_type = ? 
               AND closeDate <= ? 
               AND openDate >= ? 
               AND title LIKE ? 
               ORDER BY openDate DESC 
               LIMIT ${rangeLimit} OFFSET ${rangeOffset}`,
              [notice_type, end_date, start_date, `%${keyword}%`]
            )
          } else {
            results = await query(
              `SELECT * FROM notices 
               WHERE closeDate <= ? 
               AND openDate >= ? 
               AND department = ? 
               AND title LIKE ? 
               ORDER BY openDate DESC 
               LIMIT ${rangeLimit} OFFSET ${rangeOffset}`,
              [end_date, start_date, department, `%${keyword}%`]
            )
          }
          break

        case 'between':
          
          console.log('DEBUG: Pagination params:', { offset, limit })
          
          // Try without prepared statements for LIMIT clause
          results = await query(
            `SELECT * FROM notices 
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
    }

    // Parse attachments JSON for each result
    const notices = JSON.parse(JSON.stringify(results))
    notices.forEach(notice => {
      if (notice.attachments) {
        try {
          notice.attachments = JSON.parse(notice.attachments)
        } catch (e) {
          notice.attachments = []
        }
      } else {
        notice.attachments = []
      }
    })

    return NextResponse.json(notices)

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    )
  }
} 