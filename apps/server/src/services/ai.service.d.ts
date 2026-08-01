type Provider = 'openai' | 'anthropic' | 'groq';
interface AiCompleteParams {
    prompt: string;
    model?: string;
    provider?: Provider;
    workspaceId: string;
    userId: string;
}
export declare class AiService {
    private calculateCost;
    complete(params: AiCompleteParams): Promise<string>;
}
export declare const aiService: AiService;
export {};
//# sourceMappingURL=ai.service.d.ts.map