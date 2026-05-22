/**
 * Inverted index + BM25 ranking engine (in-memory, JSON-serializable).
 *
 * Snapshot format persisted to Redis:
 *   { docs: { [id]: { content, length } }, postings: { [term]: { [id]: tf } } }
 *
 * BM25(D,Q) = Σ IDF(qi) * (f(qi,D)*(k1+1)) / (f(qi,D) + k1*(1 - b + b*|D|/avgdl))
 * IDF(qi)  = ln((N - n(qi) + 0.5) / (n(qi) + 0.5) + 1)
 */

const K1 = 1.2
const B = 0.75

export interface Doc {
    content: string
    length: number
}

export interface SearchHit {
    id: string
    score: number
    content: string
}

export interface BM25Snapshot {
    docs: Record<string, Doc>
    postings: Record<string, Record<string, number>>
}

export function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]+/g, " ")
        .split(/\s+/)
        .filter(t => t.length > 0)
}

export class BM25Index {
    private docs: Map<string, Doc> = new Map()
    private postings: Map<string, Map<string, number>> = new Map()

    addDocument(id: string, content: string): void {
        if (this.docs.has(id)) this.removeDocument(id)
        const tokens = tokenize(content)
        this.docs.set(id, { content, length: tokens.length })
        const tf = new Map<string, number>()
        for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1)
        for (const [term, freq] of tf) {
            let posting = this.postings.get(term)
            if (!posting) {
                posting = new Map()
                this.postings.set(term, posting)
            }
            posting.set(id, freq)
        }
    }

    removeDocument(id: string): boolean {
        if (!this.docs.has(id)) return false
        this.docs.delete(id)
        for (const [term, posting] of this.postings) {
            posting.delete(id)
            if (posting.size === 0) this.postings.delete(term)
        }
        return true
    }

    private avgdl(): number {
        if (this.docs.size === 0) return 0
        let total = 0
        for (const d of this.docs.values()) total += d.length
        return total / this.docs.size
    }

    private idf(term: string): number {
        const n = this.postings.get(term)?.size ?? 0
        const N = this.docs.size
        return Math.log((N - n + 0.5) / (n + 0.5) + 1)
    }

    search(query: string, limit: number): SearchHit[] {
        const qTokens = tokenize(query)
        if (qTokens.length === 0 || this.docs.size === 0) return []
        const avgdl = this.avgdl()
        const scores = new Map<string, number>()
        for (const term of qTokens) {
            const posting = this.postings.get(term)
            if (!posting) continue
            const idf = this.idf(term)
            for (const [docId, freq] of posting) {
                const doc = this.docs.get(docId)
                if (!doc) continue
                const denom = freq + K1 * (1 - B + B * (doc.length / (avgdl || 1)))
                const tfScore = (freq * (K1 + 1)) / (denom || 1)
                scores.set(docId, (scores.get(docId) ?? 0) + idf * tfScore)
            }
        }
        const hits: SearchHit[] = []
        for (const [id, score] of scores) {
            const doc = this.docs.get(id)
            if (!doc) continue
            hits.push({ id, score, content: doc.content })
        }
        hits.sort((a, b) => b.score - a.score)
        return hits.slice(0, limit)
    }

    stats(): { numDocs: number; vocabSize: number; avgdl: number } {
        return { numDocs: this.docs.size, vocabSize: this.postings.size, avgdl: this.avgdl() }
    }

    clear(): void {
        this.docs.clear()
        this.postings.clear()
    }

    serialize(): string {
        const snap: BM25Snapshot = { docs: {}, postings: {} }
        for (const [id, doc] of this.docs) snap.docs[id] = doc
        for (const [term, posting] of this.postings) {
            const obj: Record<string, number> = {}
            for (const [id, freq] of posting) obj[id] = freq
            snap.postings[term] = obj
        }
        return JSON.stringify(snap)
    }

    deserialize(json: string): void {
        const snap = JSON.parse(json) as BM25Snapshot
        this.docs = new Map()
        this.postings = new Map()
        for (const id in snap.docs) this.docs.set(id, snap.docs[id])
        for (const term in snap.postings) {
            const m = new Map<string, number>()
            for (const id in snap.postings[term]) m.set(id, snap.postings[term][id])
            this.postings.set(term, m)
        }
    }
}
