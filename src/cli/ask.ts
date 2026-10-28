import { ragDebug } from "../rag/answering/debug.ts";
import { safeRagAnswer } from "../rag/answering/safeAnswer.ts";
import { VectorRepository } from "../rag/retrieval/vectorRepository.ts";

const vectorRepository = new VectorRepository();

const question = "Como o Nul Coch se sai em ação de progressão?"
const blockedQuestion = "Qual o preço do Nil Coch?"

await ragDebug(question, vectorRepository);

console.log(`\n---------- RESPOSTA:`);
console.log(await safeRagAnswer(question, vectorRepository, ["preço"]));