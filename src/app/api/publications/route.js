// import { NextResponse } from 'next/server'
// import { query } from '@/lib/db'
// import { depList } from '@/lib/const'
// export async function GET(request) {
//   try {
//     const { searchParams } = new URL(request.url)
//     const type = searchParams.get('type')
//     const page = parseInt(searchParams.get('page')) || 1;
//     const limit = parseInt(searchParams.get('limit')) || 10;
//     const offset = (page - 1) * limit;

//     let results
//     switch (type) {
//       case 'all':
//         const conference_papers = await query(
//           `SELECT * FROM conference_papers LIMIT ${limit} OFFSET ${offset}`
        
//         );
//         const textbooks_data = await query(
//           `SELECT * FROM textbooks LIMIT ${limit} OFFSET ${offset}`
//         );
//         const journal_papers = await query(
//           `SELECT * FROM journal_papers LIMIT ${limit} OFFSET ${offset}`
//         );
//         const book_chapters = await query(
//           `SELECT * FROM book_chapters LIMIT ${limit} OFFSET ${offset}`
//         );
//         const data = [...conference_papers,...textbooks_data,...journal_papers,...book_chapters];
//         return NextResponse.json(data);

//       default:
//         if (depList.has(type)) {
//           const textbooks_data = await query(
//             `SELECT * FROM user u 
//             JOIN textbooks t 
//             ON u.email = t.email 
//             WHERE u.department = ?
//             LIMIT ${limit} OFFSET ${offset}`,
//             [depList.get(type)]
//           );
//           const journal_papers = await query(
//             `SELECT * FROM user u 
//             JOIN journal_papers jp 
//             ON u.email = jp.email 
//             WHERE u.department = ?
//             LIMIT ${limit} OFFSET ${offset}`,
//             [depList.get(type)]
//           );
//           const book_chapters = await query(
//             `SELECT * FROM user u 
//             JOIN book_chapters bc 
//             ON u.email = bc.email 
//             WHERE u.department = ?
//             LIMIT ${limit} OFFSET ${offset}`,
//             [depList.get(type)]
//           );
//           const data = [...textbooks_data, ...journal_papers, ...book_chapters];
//           return NextResponse.json(data);
//         } else {
//           return NextResponse.json(
//             { message: 'Invalid type parameter' },
//             { status: 400 }
//           )
//         }
//     }
//   } catch (error) {
//     console.error('API Error:', error)
//     return NextResponse.json(
//       { message: error.message },
//       { status: 500 }
//     )
//   }
// }

import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { depList } from '@/lib/const'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)

    const type = searchParams.get('type')
    const page = Math.max(1, parseInt(searchParams.get('page')) || 1)
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit')) || 10))
    const offset = (page - 1) * limit

    let allData = []

    // 🔥 CASE 1: ALL PUBLICATIONS
    if (type === 'all') {
      const [conference, textbooks, journals, chapters] = await Promise.all([
        query(`SELECT id, email, title, conference_year AS year FROM conference_papers`),
        query(`SELECT id, email, title, year FROM textbooks`),
        query(`SELECT id, email, title, publication_date AS year FROM journal_papers`),
        query(`SELECT id, email, chapter_title AS title, year FROM book_chapters`)
      ])

      allData = [
        ...conference.map(i => ({ ...i, type: 'conference' })),
        ...textbooks.map(i => ({ ...i, type: 'textbook' })),
        ...journals.map(i => ({ ...i, type: 'journal' })),
        ...chapters.map(i => ({ ...i, type: 'book_chapter' }))
      ]

      // optional sorting (latest first)
      allData.sort((a, b) => (b.year || 0) - (a.year || 0))

      const paginated = allData.slice(offset, offset + limit)

      return NextResponse.json({
        page,
        limit,
        total: allData.length,
        data: paginated
      })
    }

    // 🔥 CASE 2: DEPARTMENT FILTER
    if (depList.has(type)) {
      const dept = depList.get(type)

      const [conference, textbooks, journals, chapters] = await Promise.all([
        query(`
          SELECT cp.id, cp.email, cp.title, cp.conference_year AS year
          FROM conference_papers cp
          JOIN user u ON u.email = cp.email
          WHERE u.department = ?
        `, [dept]),

        query(`
          SELECT t.id, t.email, t.title, t.year
          FROM textbooks t
          JOIN user u ON u.email = t.email
          WHERE u.department = ?
        `, [dept]),

        query(`
          SELECT jp.id, jp.email, jp.title, jp.publication_date AS year
          FROM journal_papers jp
          JOIN user u ON u.email = jp.email
          WHERE u.department = ?
        `, [dept]),

        query(`
          SELECT bc.id, bc.email, bc.chapter_title AS title, bc.year
          FROM book_chapters bc
          JOIN user u ON u.email = bc.email
          WHERE u.department = ?
        `, [dept])
      ])

      allData = [
        ...conference.map(i => ({ ...i, type: 'conference' })),
        ...textbooks.map(i => ({ ...i, type: 'textbook' })),
        ...journals.map(i => ({ ...i, type: 'journal' })),
        ...chapters.map(i => ({ ...i, type: 'book_chapter' }))
      ]

      allData.sort((a, b) => (b.year || 0) - (a.year || 0))

      const paginated = allData.slice(offset, offset + limit)

      return NextResponse.json({
        page,
        limit,
        total: allData.length,
        data: paginated
      })
    }

    return NextResponse.json(
      { message: 'Invalid type parameter' },
      { status: 400 }
    )

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    )
  }
}
