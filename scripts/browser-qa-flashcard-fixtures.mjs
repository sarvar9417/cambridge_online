// Isolated review fixtures for the dedicated audit account. This does not
// validate automatic card generation or alter any existing learner review.
export async function seedReviewCards(pool) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const context = await client.query(`select u.id user_id,st.id subtopic_id
      from users u join enrollments e on e.student_id=u.id and e.left_at is null
      join classes c on c.id=e.class_id join topics t on t.syllabus_id=c.syllabus_id
      join subtopics st on st.topic_id=t.id
      where u.username='audit2_student3' and u.role='student'
        and c.id='88888888-8888-4888-8888-888888888888' and st.code='1.1'
      limit 1`);
    if (context.rowCount !== 1) throw Error('Dedicated QA learner/class not found');
    const { user_id, subtopic_id } = context.rows[0];
    const title = `QA browser flashcards ${new Date().toISOString()}`;
    const deck = await client.query(`insert into flashcard_decks(subtopic_id,title)
      values($1,$2) returning id`, [subtopic_id, title]);
    const ids = [];
    for (const index of [1, 2, 3]) {
      const card = await client.query(`insert into flashcards(deck_id,front_md,back_md,hint_md,sort_order)
        values($1,$2,$3,$4,$5) returning id`, [deck.rows[0].id, `QA review card ${index}`, `QA answer ${index}`, `QA hint ${index}`, index]);
      ids.push(card.rows[0].id);
      await client.query(`insert into flashcard_reviews(user_id,flashcard_id,due_at)
        values($1,$2,now()-($3::int*interval '1 minute'))`, [user_id, card.rows[0].id, 4-index]);
    }
    await client.query('commit');
    return { type: 'isolated-flashcard-review', deckId: deck.rows[0].id, userId: user_id, cardIds: ids };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally { client.release(); }
}
