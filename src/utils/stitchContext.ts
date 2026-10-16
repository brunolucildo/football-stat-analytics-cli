import type { Message } from "./types.ts";

export function stitchContext(
    params: { 
        summary?: string, 
        userProfile?: string,
        recentMessages: Message[], 
    }
){
    const stitched: Message[] = [];

    if (params.summary) {
        stitched.push({ role: "user", content: `Resumo do histórico anterior: ${params.summary}` });
        stitched.push({ role: "assistant", content: "Continuando a conversa com base no resumo acima." });
    }

    if (params.userProfile) {
        stitched.push({ role: "user", content: `Perfil do usuário: ${params.userProfile}` });
        stitched.push({ role: "assistant", content: "Continuando a conversa com base no perfil do usuário acima." });
    }
    
    return [
        ...stitched, 
        ...params.recentMessages
    ];
}