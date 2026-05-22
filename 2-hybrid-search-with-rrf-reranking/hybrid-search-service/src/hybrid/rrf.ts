/**
 * Reciprocal Rank Fusion (Cormack et al. 2009).
 *
 *   rrf_score(d) = Σ_i 1 / (k + rank_i(d))
 *
 * where rank_i(d) is the 1-based rank of document d in result list i
 * (omit list i from the sum if d does not appear in it).
 * k = 60 is the canonical default from the paper.
 */

export interface RankedHit {
    id: string
    content: string
}

export interface FusedHit {
    id: string
    content: string
    rrfScore: number
    sources: {
        bm25Rank: number | null
        vectorRank: number | null
    }
}

export function reciprocalRankFusion(
    bm25: RankedHit[],
    vector: RankedHit[],
    k: number,
    limit: number,
): FusedHit[] {
    const map = new Map<string, FusedHit>()

    bm25.forEach((hit, i) => {
        const rank = i + 1
        const entry = map.get(hit.id) ?? { id: hit.id, content: hit.content, rrfScore: 0, sources: { bm25Rank: null, vectorRank: null } }
        entry.rrfScore += 1 / (k + rank)
        entry.sources.bm25Rank = rank
        map.set(hit.id, entry)
    })

    vector.forEach((hit, i) => {
        const rank = i + 1
        const entry = map.get(hit.id) ?? { id: hit.id, content: hit.content, rrfScore: 0, sources: { bm25Rank: null, vectorRank: null } }
        entry.rrfScore += 1 / (k + rank)
        entry.sources.vectorRank = rank
        if (!entry.content) entry.content = hit.content
        map.set(hit.id, entry)
    })

    return [...map.values()]
        .sort((a, b) => b.rrfScore - a.rrfScore)
        .slice(0, limit)
}
