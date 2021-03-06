const sequelize = require('sequelize')
const models = require('../models')
const Article = require('../eintities/article')
const TagRepository = require('./tag_repository')
const CommentRepository = require('./comment_repository')

module.exports = class ArticleRepository {
  async getArticles (limit, firstCursor) {
    require('../logger').error(firstCursor)
    let sql = 'SELECT * FROM articles WHERE '
    let replacements = { limit: limit }
    if (firstCursor) {
      sql += 'id <= :firstId AND '
      replacements.firstId = firstCursor
    }
    sql += `deleted_at is NULL 
    ORDER BY id desc
    LIMIT :limit
    `
    const articles = await models.sequelize.query(sql, {
      replacements: replacements,
      type: sequelize.QueryTypes.SELECT
    })

    return articles.map(article => new Article(article))
  }

  async createArticle (title, url, imagePath) {
    const sql = `
    INSERT INTO  articles (title, url, image_path)
    VALUES (:title, :url, :image_path)
    `
    const result = await models.sequelize.query(sql, {
      replacements: { title: title, url: url, image_path: imagePath },
      type: sequelize.QueryTypes.INSERT
    })

    return result[0]
  }

  async getArticle (id, withTags = true, withComment = true) {
    const sql = `
    SELECT * FROM articles 
    WHERE articles.id = :id AND articles.deleted_at is NULL
    `
    const articles = await models.sequelize.query(sql, {
      replacements: { id: id },
      type: sequelize.QueryTypes.SELECT
    })

    if (articles.length === 0) {
      return null
    }

    const article = articles[0]
    const tags = withTags
      ? await new TagRepository().getTagsByArticleId(article.id)
      : null
    const comment = withComment
      ? await new CommentRepository().getCommentByArticleId(article.id)
      : null

    return new Article(article, tags, comment)
  }

  async updateArticle (id, url, tags, comment) {
    const sql = `
    UPDATE articles 
    LEFT JOIN comments ON articles.id = comments.article_id
    SET 
    url = :url, 
    body = :comment, 
    articles.updated_at = CURRENT_TIMESTAMP,
    comments.updated_at = CURRENT_TIMESTAMP
    WHERE id = :id
    `
    await models.sequelize.query(sql, {
      replacements: { id: id, url: url, comment: comment },
      type: sequelize.QueryTypes.UPDATE
    })
  }

  async updateComment (id, comment) {
    const sql = `
    INSERT INTO comments (article_id, body) VALUES (:id, :comment)
    ON DUPLICATE KEY UPDATE 
    article_id=VALUES(article_id), body=VALUES(body), updated_at=CURRENT_TIMESTAMP
    `

    const result = await models.sequelize.query(sql, {
      replacements: { id: id, comment: comment },
      type: sequelize.QueryTypes.UPDATE
    })

    return result
  }

  async updateRead (id, read) {
    const sql = `
    UPDATE articles SET \`read\` = :read, updated_at = CURRENT_TIMESTAMP WHERE id = :id
    `

    const r = read ? 1 : 0
    const result = await models.sequelize.query(sql, {
      replacements: { id: id, read: r },
      type: sequelize.QueryTypes.UPDATE
    })

    return result
  }

  async deleteArticle (id) {
    const sql = `
    UPDATE articles SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = :id
    `

    await models.sequelize.query(sql, {
      replacements: { id: id },
      type: sequelize.QueryTypes.UPDATE
    })
  }
}
