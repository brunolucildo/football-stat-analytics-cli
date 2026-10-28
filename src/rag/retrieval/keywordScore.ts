export function keywordScore(query:string, chunk:string, minTermLength = 3){
    const terms = query.toLowerCase()
                        .split(/\s+/)
                        .filter((t) => t.length > minTermLength)
    
    if (terms.length === 0){
        return 0
    }

    const hits = terms.filter(t => chunk.toLowerCase().includes(t))
    return hits.length / terms.length;     
}