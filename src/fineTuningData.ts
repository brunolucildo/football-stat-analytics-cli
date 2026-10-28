import duckdb from "duckdb"

type Sentiment = "positivo" | "negativo" | "neutro"

const reviews: { review: string; sentiment: Sentiment }[] = [
  // POSITIVOS
  { review: "Jogou demais, foi decisivo do início ao fim.", sentiment: "positivo" },
  { review: "Excelente atuação, dominou o meio-campo inteiro.", sentiment: "positivo" },
  { review: "Fez duas assistências e criou várias oportunidades.", sentiment: "positivo" },
  { review: "Defendeu um pênalti e garantiu a vitória do time.", sentiment: "positivo" },
  { review: "Mostrou muita personalidade e não se escondeu do jogo.", sentiment: "positivo" },
  { review: "Foi muito bem nos duelos individuais e ganhou quase todos.", sentiment: "positivo" },
  { review: "Demonstrou uma visão de jogo impressionante.", sentiment: "positivo" },
  { review: "Marcou um golaço e participou de praticamente todas as jogadas perigosas.", sentiment: "positivo" },
  { review: "Teve um posicionamento impecável durante toda a partida.", sentiment: "positivo" },
  { review: "Mesmo pressionado, acertou praticamente todos os passes.", sentiment: "positivo" },
  { review: "Foi fundamental na recuperação da posse de bola.", sentiment: "positivo" },
  { review: "Demonstrou muita velocidade nas transições ofensivas.", sentiment: "positivo" },
  { review: "Fez ótimas coberturas e ajudou a proteger a defesa.", sentiment: "positivo" },
  { review: "Criou chances claras e deixou os companheiros na cara do gol.", sentiment: "positivo" },
  { review: "Teve uma leitura tática excelente e antecipou as jogadas adversárias.", sentiment: "positivo" },
  { review: "Foi consistente durante os noventa minutos.", sentiment: "positivo" },
  { review: "Ganhou praticamente todas as disputas aéreas.", sentiment: "positivo" },
  { review: "Sua movimentação abriu espaços importantes para o ataque.", sentiment: "positivo" },
  { review: "Pressionou a saída de bola e recuperou a posse várias vezes.", sentiment: "positivo" },
  { review: "Foi o melhor jogador em campo, mereceu todos os elogios.", sentiment: "positivo" },
  { review: "Teve uma evolução impressionante em relação aos últimos jogos.", sentiment: "positivo" },
  { review: "Mesmo sem marcar, contribuiu muito para o funcionamento da equipe.", sentiment: "positivo" },
  { review: "Tomou decisões rápidas e quase sempre escolheu a melhor opção.", sentiment: "positivo" },
  { review: "Foi preciso nos cruzamentos e encontrou os atacantes com frequência.", sentiment: "positivo" },
  { review: "Mostrou qualidade técnica e muita inteligência na distribuição da bola.", sentiment: "positivo" },

  // NEUTROS
  { review: "Fez uma partida regular, sem grandes destaques.", sentiment: "neutro" },
  { review: "Participou do jogo, mas não teve influência decisiva no resultado.", sentiment: "neutro" },
  { review: "Acertou a maioria dos passes e manteve o posicionamento.", sentiment: "neutro" },
  { review: "Jogou durante sessenta minutos e foi substituído no segundo tempo.", sentiment: "neutro" },
  { review: "Teve duas finalizações, mas nenhuma acertou o gol.", sentiment: "neutro" },
  { review: "Cumpriu a função tática que o treinador pediu.", sentiment: "neutro" },
  { review: "Alternou momentos de participação com períodos longe da bola.", sentiment: "neutro" },
  { review: "Não cometeu erros graves, mas também não criou grandes oportunidades.", sentiment: "neutro" },
  { review: "Atuou aberto pela direita durante boa parte da partida.", sentiment: "neutro" },
  { review: "Terminou o jogo com um gol e uma finalização no alvo.", sentiment: "neutro" },
  { review: "Teve participação equilibrada nas fases ofensiva e defensiva.", sentiment: "neutro" },
  { review: "Recebeu um cartão amarelo ainda no primeiro tempo.", sentiment: "neutro" },
  { review: "Foi titular e permaneceu em campo até os minutos finais.", sentiment: "neutro" },
  { review: "Realizou oito desarmes e cometeu três faltas.", sentiment: "neutro" },
  { review: "A equipe terminou empatada e o jogador teve atuação discreta.", sentiment: "neutro" },
  { review: "Participou da construção das jogadas, sem assumir o protagonismo.", sentiment: "neutro" },
  { review: "Manteve a posição e evitou sair da estrutura defensiva.", sentiment: "neutro" },
  { review: "Acertou alguns cruzamentos e errou outros ao longo da partida.", sentiment: "neutro" },
  { review: "Foi substituído por opção tática quando o placar estava empatado.", sentiment: "neutro" },
  { review: "Teve números semelhantes aos apresentados nas últimas partidas.", sentiment: "neutro" },
  { review: "Recebeu a bola com frequência, mas participou pouco das finalizações.", sentiment: "neutro" },
  { review: "Atuou como volante e ajudou na circulação da posse.", sentiment: "neutro" },
  { review: "A partida terminou sem gols e o jogador teve atuação discreta.", sentiment: "neutro" },
  { review: "Fez o básico, sem comprometer o sistema defensivo.", sentiment: "neutro" },
  { review: "Entrou no segundo tempo e participou das últimas jogadas da equipe.", sentiment: "neutro" },

  // NEGATIVOS
  { review: "Perdeu a bola várias vezes e comprometeu a saída de jogo.", sentiment: "negativo" },
  { review: "Teve uma atuação muito abaixo do esperado.", sentiment: "negativo" },
  { review: "Errou passes simples e dificultou a construção das jogadas.", sentiment: "negativo" },
  { review: "Perdeu uma chance clara de gol que poderia ter decidido a partida.", sentiment: "negativo" },
  { review: "Falhou na marcação e deixou o atacante adversário livre.", sentiment: "negativo" },
  { review: "Cometeu um pênalti desnecessário nos minutos finais.", sentiment: "negativo" },
  { review: "Foi expulso depois de receber dois cartões amarelos evitáveis.", sentiment: "negativo" },
  { review: "Demonstrou pouca intensidade e perdeu quase todas as disputas.", sentiment: "negativo" },
  { review: "Não conseguiu acompanhar a velocidade dos atacantes adversários.", sentiment: "negativo" },
  { review: "Errou o posicionamento e deixou espaços perigosos na defesa.", sentiment: "negativo" },
  { review: "Finalizou diversas vezes, mas não acertou nenhuma bola no gol.", sentiment: "negativo" },
  { review: "Foi facilmente desarmado e perdeu a posse em momentos importantes.", sentiment: "negativo" },
  { review: "Demorou para tomar decisões e desperdiçou boas oportunidades.", sentiment: "negativo" },
  { review: "Não acompanhou a movimentação do adversário e falhou na cobertura.", sentiment: "negativo" },
  { review: "Fez faltas desnecessárias e prejudicou o ritmo da equipe.", sentiment: "negativo" },
  { review: "Foi pouco participativo e praticamente não apareceu no jogo.", sentiment: "negativo" },
  { review: "Perdeu a bola na intermediária e originou o contra-ataque do gol adversário.", sentiment: "negativo" },
  { review: "Errou a saída do gol e facilitou a finalização do atacante.", sentiment: "negativo" },
  { review: "Não conseguiu vencer nenhum duelo individual importante.", sentiment: "negativo" },
  { review: "Seus cruzamentos foram imprecisos e não encontraram os companheiros.", sentiment: "negativo" },
  { review: "Abandonou sua posição com frequência e prejudicou o equilíbrio tático.", sentiment: "negativo" },
  { review: "Perdeu a maioria das disputas aéreas e sofreu com a pressão adversária.", sentiment: "negativo" },
  { review: "Tomou decisões ruins perto da área e desperdiçou ataques promissores.", sentiment: "negativo" },
  { review: "Foi lento na recomposição e deixou a defesa exposta.", sentiment: "negativo" },
  { review: "Entrou para mudar o jogo, mas errou quase todas as tentativas de passe.", sentiment: "negativo" },
];

const db = new duckdb.Database(":memory:");
const con = db.connect();

const values = reviews.map(
    ({review , sentiment}) => `('${review.replace("'","''")}','${sentiment}')`
)

console.log("values", values);

con.run(`
    COPY ( SELECT * FROM (VALUES ${values}) as T(review, sentiment))
    TO 'reviews.parquet' (FORMAT PARQUET)
`)