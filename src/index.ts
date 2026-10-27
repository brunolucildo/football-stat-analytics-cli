import { ragDebug } from "./utils/ragDebug.ts";
import { safeRagAnswer } from "./utils/safeRagAnswer.ts";
import { VectorRepository } from "./vectorRepository.ts";

const vectorRepository = new VectorRepository();

const question = "Como o Nul Coch se sai em ação de progressão?"
const blockedQuestion = "Qual o preço do Nil Coch?"

await ragDebug(question, vectorRepository);

console.log(`\n---------- RESPOSTA:`);
console.log(await safeRagAnswer(question, vectorRepository, ["preço"]));