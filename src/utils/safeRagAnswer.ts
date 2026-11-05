import { embed } from "../ai/embed.ts";
import { VectorRepository } from "../vectorRepository.ts";
import { ragAnswer } from "./ragAnswer.ts";
import type { SemanticJudge } from "../ai/semanticVerifier.ts";

export async function safeRagAnswer(
    question: string,
    repo: VectorRepository,
    blockedSignals: string[],
    dependencies: {
        embedQuestion?: typeof embed;
        answerWithRag?: typeof ragAnswer;
        semanticJudge?: SemanticJudge;
    } = {}
) {
    if (blockedSignals.some(b => question.toLowerCase().includes(b.toLowerCase()))) {
        return "Não posso responder esse tipo de pergunta com base nos documentos disponiveis"
    }

    const embedQuestion = dependencies.embedQuestion ?? embed;
    const answerWithRag = dependencies.answerWithRag ?? ragAnswer;
    const questionEmbeddings = await embedQuestion(question)
    const results = repo.search(question, questionEmbeddings)

    if (results.length === 0){
        return "Não encontrei informações suficientes para essa pergunta."
    }

    return answerWithRag(question, repo, results, undefined, dependencies.semanticJudge);
}