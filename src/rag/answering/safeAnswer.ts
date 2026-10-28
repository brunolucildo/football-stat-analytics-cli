import { embed } from "../../ai/embeddings/embed.ts";
import { VectorRepository } from "../retrieval/vectorRepository.ts";
import { ragAnswer } from "./answer.ts";

export async function safeRagAnswer(question: string, repo: VectorRepository, blockedSignals: string[]) {

    //1. embeds a pergunta
    const questionEmbeddings = await embed(question)
    const results = repo.search(
        question,
        questionEmbeddings
    )

    // guarda 1: validar que a pergunta não tenta extrair informações fora de escopo
    if (blockedSignals.some(b => question.toLowerCase().includes(b.toLowerCase()))){
        return "Não posso responder esse tipo de pergunta com base nos documentos disponiveis"
    }

    // guarda 2: verificar se há contexto minimamente relevante antes de chamar o LLM
    if (results.length === 0){
        return "Não encontrei informações suficientes para essa pergunta."
    }
    
    

    //4. retorna a resposta final
    return ragAnswer(question, repo);
    
}