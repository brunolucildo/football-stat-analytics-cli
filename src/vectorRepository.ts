import { DatabaseSync } from "node:sqlite"
import { cosineSimilarity } from "./utils/cosineSimilarity.ts";

export class VectorRepository {
    private db: DatabaseSync;

    constructor(db = "vector_db.db") {
        this.db = new DatabaseSync(db);
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source TEXT NOT NULL,
                chunk TEXT NOT NULL,
                embeddings TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    };

    insert(source: string, chunk: string, embeddings: number[]): void {
        this.db.prepare(`
            INSERT INTO documents (source, chunk, embeddings)
            VALUES (?, ?, ?)
        `).run(source, chunk, JSON.stringify(embeddings));
    };

    search(inputEmbeddings: number[], topK = 5){
        const documents = this.db.prepare(`
            SELECT source, chunk, embeddings
            FROM documents
        `).all() as { chunk: string, embeddings: string }[];

        return documents
            .map(document => ({
                chunk: document.chunk,
                score: cosineSimilarity(inputEmbeddings, JSON.parse(document.embeddings))
            }))
            .sort((d1, d2) => d2.score - d1.score)
            .slice(0, topK);
    }
}