import { ragAnswer } from "./utils/ragAnswer.ts";
import { VectorRepository } from "./vectorRepository.ts";

const vectorRepository = new VectorRepository();

console.log(await ragAnswer("Como o Nul Coch se sai em ação de progressão?", vectorRepository));