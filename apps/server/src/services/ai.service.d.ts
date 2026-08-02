export type ProviderType = 'openai' | 'anthropic' | 'groq';
export interface AiCompleteParams {
    prompt: string;
    model?: string;
    provider?: ProviderType;
    workspaceId: string;
    userId: string;
}
export interface ProviderResponse {
    completionText: string;
    promptTokens: number;
    completionTokens: number;
}
export declare class AiService {
    private calculateCost;
    private executeWithRetry;
    complete(params: AiCompleteParams): Promise<string>;
}
export declare const aiService: AiService;
//# sourceMappingURL=ai.service.d.ts.map
