const ArticleRepository = require("../repositories/article_repository")
const CommentRepository = require("../repositories/comment_repository")

module.exports = class ArticleService {
  constructor() {}

  async getArticles(limit, firstCursor) {
    const articleRepository = new ArticleRepository()
    const commentRepository = new CommentRepository()
    let articles = await articleRepository.getArticles(limit, firstCursor)
    articles = await Promise.all(
      articles.map(async article => {
        const comments = await commentRepository.getCommentsByArticleId(
          article.id
        )
        article.comments = comments
        return article
      })
    )
    return articles
  }
}